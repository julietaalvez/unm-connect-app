import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { Alert } from 'react-native';

import { PROFES } from '../data/profes';
import { API_URL, cargarProfesores } from './api';
import { usuarioActual } from './sesion';

type Profe = (typeof PROFES)[number];
export type Franja = Profe['franjas'][number];

/* ---------- períodos (cuatrimestres) ---------- */
// Para sumar un cuatrimestre nuevo: agregá una línea acá (los meses van de 0 a 11).
export type Periodo = { id: string; nombre: string; cuatri: 1 | 2; inicio: Date; fin: Date };

export const PERIODOS: Periodo[] = [
  { id: '2026-2', nombre: '2.º cuatrimestre 2026', cuatri: 2, inicio: new Date(2026, 7, 3), fin: new Date(2026, 11, 4) },
  // Año que viene (ajustá las fechas reales cuando las publiquen):
  // { id: '2027-1', nombre: '1.er cuatrimestre 2027', cuatri: 1, inicio: new Date(2027, 2, 15), fin: new Date(2027, 6, 10) },
];

/** El período en curso. Si estás entre dos cuatrimestres, devuelve el próximo. */
export function periodoActual(fecha: Date = new Date()): Periodo | null {
  const dia = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
  const ordenados = [...PERIODOS].sort((a, b) => a.inicio.getTime() - b.inicio.getTime());
  return ordenados.find((p) => dia <= p.fin) ?? ordenados[ordenados.length - 1] ?? null;
}

// Una franja sin cuatrimestre (0 o vacío) se muestra siempre; si lo trae, solo en ese cuatri.
const esDelPeriodo = (f: Franja, p: Periodo) => !f.cuatrimestre || f.cuatrimestre > 2 || f.cuatrimestre === p.cuatri;

/** Una materia + comisión, con todos sus horarios y docentes */
export type Cursada = {
  clave: string; // "Materia|comisión": identifica la cursada
  materia: string;
  comision: string;
  anio: number;
  profes: string[];
  franjas: Franja[];
};

/* ---------- catálogo (de la base, con respaldo local) ---------- */
let promesaCatalogo: Promise<Profe[]> | null = null;
const cargarCatalogo = () =>
  (promesaCatalogo ??= cargarProfesores().then((r) => r.datos as Profe[]).catch(() => PROFES));

export function useCatalogo(): Profe[] {
  const [catalogo, setCatalogo] = useState<Profe[]>(PROFES);
  useEffect(() => {
    cargarCatalogo().then(setCatalogo);
  }, []);
  return catalogo;
}

/** Junta las franjas de todos los docentes en cursadas (materia + comisión), solo del período indicado */
export function armarCursadas(profes: Profe[], periodo: Periodo | null = periodoActual()): Cursada[] {
  const mapa = new Map<string, Cursada & { vistas: Set<string> }>();
  for (const p of profes) {
    for (const f of p.franjas) {
      if (!f.materia) continue;
      if (periodo && !esDelPeriodo(f, periodo)) continue;
      const clave = `${f.materia}|${f.comision}`;
      let c = mapa.get(clave);
      if (!c) {
        c = { clave, materia: f.materia, comision: f.comision, anio: f.anio, profes: [], franjas: [], vistas: new Set() };
        mapa.set(clave, c);
      }
      if (!c.profes.includes(p.nombre)) c.profes.push(p.nombre);
      const k = [f.dias.join(), f.desde, f.hasta, f.lugar, f.modo, f.alterna].join('|');
      if (!c.vistas.has(k)) {
        c.vistas.add(k);
        c.franjas.push(f);
      }
    }
  }
  return [...mapa.values()]
    .map(({ vistas, ...c }) => c)
    .sort((a, b) => a.materia.localeCompare(b.materia, 'es') || a.comision.localeCompare(b.comision));
}

/* ---------- inscripciones del usuario (en la base, con copia en el teléfono) ---------- */
let lista: string[] = [];
let cargadoPara: string | null = null;
const oyentes = new Set<() => void>();
const suscribir = (f: () => void) => {
  oyentes.add(f);
  return () => {
    oyentes.delete(f);
  };
};
const emitir = () => oyentes.forEach((f) => f());

const claveCopia = (id: number | string) => `unm-inscripciones-${id}`;
const urlInsc = (id: number | string) => `${API_URL}/usuarios/${id}/inscripciones`;

const fijar = (nueva: string[], id: number | string) => {
  lista = nueva;
  AsyncStorage.setItem(claveCopia(id), JSON.stringify(nueva)).catch(() => {});
  emitir();
};

const avisoError = () => Alert.alert('No se pudo guardar', 'Revisá tu conexión e intentá de nuevo.');

const inscribir = async (clave: string) => {
  const id = usuarioActual()?.id;
  if (id == null || lista.includes(clave)) return;
  fijar([...lista, clave], id);
  try {
    const r = await fetch(urlInsc(id), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clave }),
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
  } catch {
    fijar(lista.filter((c) => c !== clave), id);
    avisoError();
  }
};

const quitar = async (clave: string) => {
  const id = usuarioActual()?.id;
  if (id == null) return;
  fijar(lista.filter((c) => c !== clave), id);
  try {
    const r = await fetch(`${urlInsc(id)}?clave=${encodeURIComponent(clave)}`, { method: 'DELETE' });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
  } catch {
    fijar([...lista, clave], id);
    avisoError();
  }
};

export function useInscripciones() {
  const id = usuarioActual()?.id;
  const llave = String(id ?? 'anon');
  const actual = useSyncExternalStore(suscribir, () => lista);

  useEffect(() => {
    if (cargadoPara === llave) return;
    cargadoPara = llave;
    lista = [];
    emitir();
    if (id == null) return;

    let delServidor = false;
    // 1) copia del teléfono: se ve enseguida, aunque no haya internet
    AsyncStorage.getItem(claveCopia(id))
      .then((raw) => {
        if (delServidor || cargadoPara !== llave) return;
        const p = raw ? JSON.parse(raw) : [];
        if (Array.isArray(p)) {
          lista = p;
          emitir();
        }
      })
      .catch(() => {});
    // 2) lo que dice el servidor es lo que vale
    fetch(urlInsc(id))
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((d) => {
        if (cargadoPara !== llave || !Array.isArray(d?.claves)) return;
        delServidor = true;
        fijar(d.claves, id);
      })
      .catch((e) => console.log('[inscripciones] no se pudo leer del servidor:', String(e)));
  }, [llave, id]);

  const claves = useMemo(() => new Set(actual), [actual]);
  return { claves, inscribir, quitar };
}

/* ---------- calendario ---------- */
// Cargá acá los feriados de cada año (formato AAAA-MM-DD).
export const FERIADOS: Record<string, string> = {
  '2026-10-12': 'Feriado: Día del Respeto a la Diversidad Cultural',
  '2026-11-23': 'Feriado: Día de la Soberanía Nacional (trasladado)',
  '2026-12-07': 'Día no laborable con fines turísticos',
  '2026-12-08': 'Feriado: Inmaculada Concepción de María',
  '2026-12-25': 'Feriado: Navidad',
};
const pad2 = (n: number) => String(n).padStart(2, '0');

/** ¿Esta franja se cursa ese día? (cuenta feriados, fechas del cuatrimestre y "semana por medio") */
function ocurreEn(f: Franja, dia: Date): boolean {
  const p = PERIODOS.find((x) => dia >= x.inicio && dia <= x.fin);
  if (!p || !esDelPeriodo(f, p)) return false;
  const key = `${dia.getFullYear()}-${pad2(dia.getMonth() + 1)}-${pad2(dia.getDate())}`;
  if (FERIADOS[key] || !f.dias.includes(dia.getDay())) return false;
  if (f.alterna && Math.floor((dia.getTime() - p.inicio.getTime()) / 604800000) % 2 !== 0) return false;
  return true;
}

export type ClaseDia = {
  materia: string;
  desde: string;
  hasta: string;
  aula: string | null;
  lugar: string;
  profesor: string;
  virtual: boolean;
};

/** Las clases de ese día, de las cursadas que le pasás, ordenadas por hora */
export function clasesDelDia(cursadas: Cursada[], fecha: Date): ClaseDia[] {
  const dia = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
  const out: ClaseDia[] = [];
  for (const c of cursadas) {
    for (const f of c.franjas) {
      if (!ocurreEn(f, dia)) continue;
      const virtual = f.modo === 'virtual';
      out.push({
        materia: c.materia,
        desde: f.desde,
        hasta: f.hasta,
        aula: virtual ? null : f.aula ?? null,
        lugar: f.lugar,
        profesor: c.profes.join(', '),
        virtual,
      });
    }
  }
  return out.sort((a, b) => a.desde.localeCompare(b.desde));
}