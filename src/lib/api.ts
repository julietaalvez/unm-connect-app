import { AMENITIES, EDIFICIOS, SCHEDULE, type Comodidades } from '../data/edificios';
import { PROFES } from '../data/profes';
import type { Franja, Profe } from './profes';

/* ============================================================
   Conexión con el backend (Railway + MySQL).
   Si el servidor no responde, falla o devuelve la lista vacía,
   la app usa datos de ejemplo y nunca queda en blanco.
   ============================================================ */

// Dirección del backend. Se puede cambiar con la variable EXPO_PUBLIC_API_URL (archivo .env).
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://unm-backend-production.up.railway.app';

// Mientras la base esté vacía, una lista vacía del servidor se reemplaza por datos de ejemplo.
// Cuando la base ya tenga datos reales, poner en false.
export const EJEMPLO_SI_VACIO = true;

const TIMEOUT_MS = 6000;

/* ---------- tipos (lo que el backend tiene que devolver) ---------- */
// GET /clases/hoy   -> [{ aula_id, materia, desde, hasta, profesor }]   (desde/hasta como "16:00")
// GET /novedades    -> [{ id, titulo, texto }]
// "aula_id" tiene que coincidir con el id del plano, por ejemplo "aula-5" o "aula-13-yaula11".
export type ClaseHoy = { aulaId: string; materia: string; desde: string; hasta: string; profesor: string };
export type Novedad = { id: string; titulo: string; texto: string };
export type Fuente = 'servidor' | 'ejemplo';
export type Resultado<T> = { datos: T; fuente: Fuente };

/* ---------- datos de ejemplo ---------- */
export const NOVEDADES_EJEMPLO: Novedad[] = [
  { id: 'e1', titulo: 'Mesas de examen', texto: 'Ya están publicadas las fechas de las mesas de diciembre.' },
  { id: 'e2', titulo: 'Biblioteca', texto: 'Horario extendido hasta las 21:00 durante la semana de parciales.' },
];

export function clasesEjemplo(): ClaseHoy[] {
  return Object.entries(SCHEDULE).flatMap(([id, c]) => {
    const m = c.time.match(/(\d{1,2}:\d{2})\s*[–-]\s*(\d{1,2}:\d{2})/);
    return m ? [{ aulaId: id, materia: c.subject, desde: m[1], hasta: m[2], profesor: c.prof }] : [];
  });
}

/* ---------- pedido con límite de tiempo ---------- */
async function pedir(ruta: string): Promise<unknown> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${API_URL}${ruta}`, { signal: ctl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

const txt = (v: unknown) => (typeof v === 'string' ? v : v == null ? '' : String(v));

function normalizarClases(raw: unknown): ClaseHoy[] | null {
  if (!Array.isArray(raw)) return null;
  return raw
    .map((r: any) => ({
      aulaId: txt(r.aula_id ?? r.aulaId),
      materia: txt(r.materia),
      desde: txt(r.desde).slice(0, 5),
      hasta: txt(r.hasta).slice(0, 5),
      profesor: txt(r.profesor),
    }))
    .filter((c) => c.aulaId && c.materia && /^\d{1,2}:\d{2}$/.test(c.desde) && /^\d{1,2}:\d{2}$/.test(c.hasta));
}

function normalizarNovedades(raw: unknown): Novedad[] | null {
  if (!Array.isArray(raw)) return null;
  return raw
    .map((r: any, i) => ({ id: txt(r.id ?? i), titulo: txt(r.titulo), texto: txt(r.texto) }))
    .filter((n) => n.titulo);
}

/** Pide al servidor; si falla o viene vacío, devuelve el ejemplo y lo avisa en `fuente` */
async function conRespaldo<T>(ruta: string, normalizar: (r: unknown) => T[] | null, ejemplo: () => T[]): Promise<Resultado<T[]>> {
  try {
    const datos = normalizar(await pedir(ruta));
    if (datos && (datos.length > 0 || !EJEMPLO_SI_VACIO)) return { datos, fuente: 'servidor' };
  } catch (e) {
    if (__DEV__) console.log(`[api] ${ruta} no disponible, uso datos de ejemplo:`, String(e));
  }
  return { datos: ejemplo(), fuente: 'ejemplo' };
}

export const cargarClasesHoy = () => conRespaldo('/clases/hoy', normalizarClases, clasesEjemplo);
export const cargarNovedades = () => conRespaldo('/novedades', normalizarNovedades, () => NOVEDADES_EJEMPLO);
/* ---------- Profesores: GET /profesores ---------- */
const idEdificioPorNombre = (nombre: string): string | null =>
  Object.entries(EDIFICIOS).find(([, e]) => e.name.toLowerCase() === nombre.toLowerCase())?.[0] ?? null;

function normalizarProfes(raw: unknown): Profe[] | null {
  if (!Array.isArray(raw)) return null;
  return raw
    .map((r: any): Profe => ({
      id: txt(r.id),
      nombre: txt(r.nombre),
      materias4: Array.isArray(r.materias4) ? r.materias4.map(txt) : [],
      franjas: (Array.isArray(r.franjas) ? r.franjas : []).map((f: any): Franja => ({
        dias: Array.isArray(f.dias) ? f.dias.map(Number) : [],
        desde: txt(f.desde).slice(0, 5),
        hasta: txt(f.hasta).slice(0, 5),
        edificio: txt(f.edificio),
        edificioId: idEdificioPorNombre(txt(f.edificio)),   // el id del plano, no el de la base
        aula: f.aula ? txt(f.aula) : null,
        lugar: txt(f.lugar),
        extra: Array.isArray(f.extra) ? f.extra.map(txt) : [],
        materia: txt(f.materia),
        comision: txt(f.comision),
        anio: Number(f.anio) || 0,
        modo: f.modo === 'virtual' ? 'virtual' : 'presencial',
        alterna: !!f.alterna,
        cuatrimestre: Number(f.cuatrimestre) || 0,
      })),
    }))
    .filter((p) => p.nombre && p.franjas.length > 0);
}

export const cargarProfesores = () => conRespaldo('/profesores', normalizarProfes, () => PROFES);

/* ---------- Aulas (comodidades): GET /aulas ---------- */
// Devuelve las comodidades locales, pisadas por lo que tenga el servidor.
export async function cargarAulas(): Promise<Record<string, Comodidades>> {
  const base: Record<string, Comodidades> = { ...AMENITIES };
  try {
    const raw = await pedir('/aulas');
    if (!Array.isArray(raw)) return base;
    for (const r of raw as any[]) {
      const id = txt(r.aula_id);
      if (!id) continue;
      const loc = base[id];
      base[id] = {
        enchufes: r.enchufes ?? loc?.enchufes ?? 0,
        wifi: r.wifi ?? loc?.wifi ?? false,
        proyector: r.proyector ?? loc?.proyector ?? false,
        accesible: r.accesible ?? loc?.accesible ?? false,
        capacidad: r.capacidad ?? loc?.capacidad ?? 0,
      };
    }
  } catch (e) {
    if (__DEV__) console.log('[api] /aulas no disponible, uso datos locales:', String(e));
  }
  return base;
}