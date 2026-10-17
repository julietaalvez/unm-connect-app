/* Lógica de disponibilidad de profesores (port directo del HTML) */

export type Modo = 'presencial' | 'virtual';

export type Franja = {
  dias: number[];            // 0 = domingo … 6 = sábado
  desde: string;             // "09:00"
  hasta: string;
  edificio: string;
  edificioId?: string | null;
  aula?: string | null;
  lugar: string;
  extra: string[];
  materia: string;
  comision: string;
  anio: number;
  modo: Modo;
  alterna: boolean;          // presencial semana por medio
};

export type Profe = { id: string; nombre: string; materias4: string[]; franjas: Franja[] };
export type Momento = { day: number; min: number };
export type Cls = 'clase' | 'viene' | 'virtual' | 'off';

export type Estado = {
  k: 'clase' | 'virtual' | 'viene' | 'termino' | 'virtualHoy' | 'off';
  cls: Cls;
  hoy: Franja[];
  presHoy: number;
  actual?: Franja;
  proxima?: Franja;
  corto: string;
  titulo: string;
  detalle: string;
  nota: string;
};

export const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
export const DIAS_CORTO = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
export const ORDEN_SEMANA = [1, 2, 3, 4, 5, 6, 0];

export const toMin = (s: string) => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
export const fmtMin = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
export const hm = (s: string) => s.replace(/^0/, '');                       // 09:00 -> 9:00
export const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
export const iniciales = (n: string) => { const p = n.split(' '); return (p[0][0] + (p[p.length - 1][0] || '')).toUpperCase(); };
export const lugarTxt = (s: Franja) => s.lugar + (s.extra && s.extra.length ? ` (o ${s.extra.join(', ')})` : '');

export const NOTA_ALT = 'Esta clase es presencial semana por medio y la grilla no indica qué semanas. Confirmalo antes de ir.';

export function ahoraReal(): Momento {
  const d = new Date();
  return { day: d.getDay(), min: d.getHours() * 60 + d.getMinutes() };
}

const enCurso = (s: Franja, t: Momento) => t.min >= toMin(s.desde) && t.min < toMin(s.hasta);

export function estado(p: Profe, t: Momento): Estado {
  const hoy = p.franjas.filter((s) => s.dias.includes(t.day)).sort((a, b) => toMin(a.desde) - toMin(b.desde));
  const pres = hoy.filter((s) => s.modo === 'presencial');
  const virt = hoy.filter((s) => s.modo === 'virtual');
  const base = { hoy, presHoy: pres.length };

  const aP = pres.find((s) => enCurso(s, t));
  if (aP) {
    const alt = aP.alterna;
    return {
      ...base, k: 'clase', cls: 'clase', actual: aP,
      corto: alt ? `Clase hasta las ${hm(aP.hasta)} · semana por medio` : `Dando clase hasta las ${hm(aP.hasta)}`,
      titulo: alt ? 'Tiene clase en la uni ahora, si esta semana le toca' : 'Está dando clase ahora',
      detalle: `${aP.materia} · ${aP.lugar}, hasta las ${hm(aP.hasta)}.`, nota: alt ? NOTA_ALT : '',
    };
  }
  const aV = virt.find((s) => enCurso(s, t));
  if (aV) {
    return {
      ...base, k: 'virtual', cls: 'virtual', actual: aV,
      corto: `Clase virtual hasta las ${hm(aV.hasta)}`, titulo: 'Está dando clase virtual',
      detalle: `${aV.materia}: es online, no está en la uni.`, nota: '',
    };
  }
  if (pres.length) {
    const prox = pres.find((s) => toMin(s.desde) > t.min);
    const antes = pres.some((s) => toMin(s.hasta) <= t.min);
    if (prox) {
      const alt = prox.alterna;
      return {
        ...base, k: 'viene', cls: 'viene', proxima: prox,
        corto: `${antes ? 'Hoy vuelve' : 'Hoy llega'} a las ${hm(prox.desde)}` + (alt ? ' · semana por medio' : ''),
        titulo: alt ? 'Hoy puede venir (semana por medio)' : 'Hoy viene a la uni',
        detalle: `${prox.materia} · ${prox.lugar}, a las ${hm(prox.desde)}.`, nota: alt ? NOTA_ALT : '',
      };
    }
    return {
      ...base, k: 'termino', cls: 'off', corto: 'Ya terminó por hoy', titulo: 'Ya terminó sus clases en la uni',
      detalle: `Su última clase presencial terminó a las ${hm(pres[pres.length - 1].hasta)}.`, nota: '',
    };
  }
  if (virt.length) {
    const prox = virt.find((s) => toMin(s.desde) > t.min);
    if (prox) {
      return {
        ...base, k: 'virtualHoy', cls: 'virtual', proxima: prox,
        corto: `Hoy solo virtual · ${hm(prox.desde)}`, titulo: 'Hoy no viene: da clase virtual',
        detalle: `${prox.materia}, online a las ${hm(prox.desde)}.`, nota: '',
      };
    }
    return {
      ...base, k: 'termino', cls: 'off', corto: 'Ya terminó por hoy', titulo: 'Ya terminó por hoy',
      detalle: 'Sus clases virtuales de hoy ya terminaron.', nota: '',
    };
  }
  return {
    ...base, k: 'off', cls: 'off', corto: 'Hoy no viene', titulo: 'Hoy no tiene clases',
    detalle: 'No figura con clases en la grilla para hoy.', nota: '',
  };
}

export const GRUPOS: { id: string; label: string; test: (e: Estado) => boolean }[] = [
  { id: 'todos', label: 'Todos', test: () => true },
  { id: 'ahora', label: 'Dando clase ahora', test: (e) => e.k === 'clase' || e.k === 'virtual' },
  { id: 'viene', label: 'Vienen hoy', test: (e) => e.presHoy > 0 },
  { id: 'no', label: 'No vienen hoy', test: (e) => e.presHoy === 0 },
];