import { API_URL } from './api';

export type Estado = 'borrador' | 'programada' | 'publicada';

export type Evaluacion = {
  id: number;
  nombre: string;
  estado: Estado;
  publicar_en: string | null;
  carrera_id: number;
  cargadas: number;
};
export type Carrera = { id: number; nombre: string };
export type AlumnoNota = { id: number; nombre: string; nota: string | null };
export type MiNota = { evaluacion_id: number; evaluacion: string; carrera: string; nota: string };

export const ESTADOS: { valor: Estado; label: string; ayuda: string }[] = [
  { valor: 'borrador', label: 'Borrador', ayuda: 'Los alumnos todavía no ven las notas.' },
  { valor: 'programada', label: 'Programada', ayuda: 'Los alumnos las ven a partir de la fecha que indiques.' },
  { valor: 'publicada', label: 'Publicada', ayuda: 'Los alumnos ya pueden ver sus notas.' },
];

/* ---------- fechas (hora argentina, UTC-3, sin horario de verano) ---------- */
const p2 = (n: number) => String(n).padStart(2, '0');
const aAR = (iso: string) => {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : new Date(d.getTime() - 3 * 3600 * 1000);
};

/** "31/10/2026 15:30" */
export function fechaAR(iso: string | null): string {
  const a = iso ? aAR(iso) : null;
  if (!a) return '';
  return `${p2(a.getUTCDate())}/${p2(a.getUTCMonth() + 1)}/${a.getUTCFullYear()} ${p2(a.getUTCHours())}:${p2(a.getUTCMinutes())}`;
}

/** "2026-10-31 15:30" (formato del campo de texto) */
export function fechaARInput(iso: string | null): string {
  const a = iso ? aAR(iso) : null;
  if (!a) return '';
  return `${a.getUTCFullYear()}-${p2(a.getUTCMonth() + 1)}-${p2(a.getUTCDate())} ${p2(a.getUTCHours())}:${p2(a.getUTCMinutes())}`;
}

/** Convierte "2026-10-31 15:30" (hora argentina) a ISO en UTC. null si es inválida. */
export function aIsoUtc(texto: string): string | null {
  const m = texto.trim().match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})$/);
  if (!m) return null;
  const d = new Date(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:00-03:00`);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

/* ---------- pedidos ---------- */
const TIMEOUT_MS = 10000;

async function pedir(ruta: string, opciones: RequestInit = {}) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(`${API_URL}${ruta}`, { ...opciones, signal: ctl.signal });
    const d = await r.json().catch(() => null);
    return { ok: r.ok, datos: d };
  } catch {
    throw new Error('No pudimos conectar con el servidor. Revisá tu conexión.');
  } finally {
    clearTimeout(t);
  }
}

const JSON_H = { 'Content-Type': 'application/json' };

export async function obtenerEvaluaciones(docenteId: number): Promise<Evaluacion[]> {
  const { ok, datos } = await pedir(`/evaluaciones?docente_id=${docenteId}`);
  if (!ok) throw new Error(datos?.error || 'No pudimos cargar tus evaluaciones.');
  return datos.evaluaciones;
}

/** Las carreras en las que dicta este docente (con nombre) */
export async function obtenerCarrerasDocente(docenteId: number): Promise<Carrera[]> {
  const [mias, todas] = await Promise.all([pedir(`/usuarios/${docenteId}/carreras`), pedir('/carreras')]);
  if (!mias.ok || !todas.ok) throw new Error('No pudimos cargar tus carreras.');
  const ids = new Set<number>(mias.datos.ids);
  return (todas.datos as Carrera[]).filter((c) => ids.has(c.id));
}

export async function crearEvaluacion(
  docenteId: number,
  carreraId: number,
  nombre: string,
  estado: Estado,
  publicarEn: string | null
): Promise<number> {
  const { ok, datos } = await pedir('/evaluaciones', {
    method: 'POST',
    headers: JSON_H,
    body: JSON.stringify({ docente_id: docenteId, carrera_id: carreraId, nombre, estado, publicar_en: publicarEn }),
  });
  if (!ok) throw new Error(datos?.error || 'No se pudo crear la evaluación.');
  return datos.id;
}

export async function actualizarEvaluacion(
  docenteId: number,
  id: number,
  cambios: { nombre?: string; estado?: Estado; publicar_en?: string | null }
): Promise<void> {
  const { ok, datos } = await pedir(`/evaluaciones/${id}`, {
    method: 'PUT',
    headers: JSON_H,
    body: JSON.stringify({ docente_id: docenteId, ...cambios }),
  });
  if (!ok) throw new Error(datos?.error || 'No se pudo guardar.');
}

export async function borrarEvaluacion(docenteId: number, id: number): Promise<void> {
  const { ok, datos } = await pedir(`/evaluaciones/${id}?docente_id=${docenteId}`, { method: 'DELETE' });
  if (!ok) throw new Error(datos?.error || 'No se pudo eliminar.');
}

export async function obtenerAlumnos(docenteId: number, evalId: number, q: string): Promise<AlumnoNota[]> {
  const { ok, datos } = await pedir(
    `/evaluaciones/${evalId}/alumnos?docente_id=${docenteId}&q=${encodeURIComponent(q)}`
  );
  if (!ok) throw new Error(datos?.error || 'No pudimos cargar los alumnos.');
  return datos.alumnos;
}

/** Valor vacío = borra la nota */
export async function guardarNota(docenteId: number, evalId: number, alumnoId: number, valor: string): Promise<void> {
  const { ok, datos } = await pedir(`/evaluaciones/${evalId}/notas/${alumnoId}`, {
    method: 'PUT',
    headers: JSON_H,
    body: JSON.stringify({ docente_id: docenteId, valor }),
  });
  if (!ok) throw new Error(datos?.error || 'No se pudo guardar la nota.');
}

export async function obtenerMisNotas(alumnoId: number): Promise<MiNota[]> {
  const { ok, datos } = await pedir(`/alumnos/${alumnoId}/notas`);
  if (!ok) throw new Error(datos?.error || 'No pudimos cargar tus notas.');
  return datos.notas;
}