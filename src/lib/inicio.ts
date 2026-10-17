import { EDIFICIOS } from '../data/edificios';
import type { ClaseHoy } from './api';
import { classify } from './interior';

/** "16:30" -> minutos desde medianoche */
export function aMinutos(hora: string): number {
  const [h, m] = hora.split(':').map(Number);
  return h * 60 + m;
}

export function minutosDe(fecha: Date): number {
  return fecha.getHours() * 60 + fecha.getMinutes();
}

/** La clase en curso o la próxima que todavía no terminó */
export function proximaClase(clases: ClaseHoy[], min: number) {
  const c = clases
    .filter((x) => aMinutos(x.hasta) > min)
    .sort((a, b) => aMinutos(a.desde) - aMinutos(b.desde))[0];
  return c ? { ...c, enCurso: aMinutos(c.desde) <= min } : null;
}

/** Aulas de los planos que no tienen clase en este momento */
export function contarAulasLibres(clases: ClaseHoy[], min: number) {
  const todas = new Set<string>();
  for (const ed of Object.values(EDIFICIOS)) {
    for (const piso of Object.values(ed.floors)) {
      for (const sh of piso.shapes) if (sh.id.startsWith('aula') && classify(sh.id) === 'aula') todas.add(sh.id);
    }
  }
  const ocupadas = new Set(clases.filter((c) => aMinutos(c.desde) <= min && min < aMinutos(c.hasta) && todas.has(c.aulaId)).map((c) => c.aulaId));
  return { total: todas.size, libres: todas.size - ocupadas.size };
}

export function saludo(h: number) {
  if (h < 6) return '¡Buenas noches!';
  if (h < 13) return '¡Buen día!';
  if (h < 20) return '¡Buenas tardes!';
  return '¡Buenas noches!';
}