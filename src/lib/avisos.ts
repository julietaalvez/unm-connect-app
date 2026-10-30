import { API_URL } from './api';

export type ComisionDocente = {
  materia: string;
  comision: string;
  alumnos: number;
};

export type AlumnoInscripto = {
  id: number;
  nombre: string;
  desde: string | null;
};

export type ComisionConAlumnos = {
  materia: string;
  comision: string;
  alumnos: AlumnoInscripto[];
};

export const claveDe = (c: ComisionDocente) => `${c.materia}|${c.comision}`;

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

export async function obtenerComisiones(usuarioId: number): Promise<ComisionDocente[]> {
  const { ok, datos } = await pedir(`/docentes/${usuarioId}/comisiones`);
  if (!ok) throw new Error(datos?.error || 'No pudimos cargar tus comisiones.');
  return datos;
}

export async function obtenerAlumnosPorComision(usuarioId: number): Promise<ComisionConAlumnos[]> {
  const { ok, datos } = await pedir(`/docentes/${usuarioId}/comisiones/alumnos`);
  if (!ok) throw new Error(datos?.error || 'No pudimos cargar tus alumnos.');
  return Array.isArray(datos) ? datos : [];
}

export async function enviarAviso(
  usuarioId: number,
  claves: string[],
  titulo: string,
  texto: string
): Promise<number> {
  const { ok, datos } = await pedir(`/docentes/${usuarioId}/avisos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ claves, titulo, texto }),
  });
  if (!ok) throw new Error(datos?.error || 'No se pudo enviar el aviso.');
  return datos.enviados;
}