import { BUILDINGS, GATES } from '../data/campus';
import type { PuertaCampus } from './campusRuta';

type Referencia = { donde: string; lat: number; lng: number };

/**
 * PUNTOS DE REFERENCIA: lugares del campus de los que conocés las coordenadas reales (Google Maps).
 *   'gate:mitre'  ·  'gate:corvalan'  ·  'edificio:Daract II' (el nombre exacto como aparece en el mapa)
 * Cuantos más puntos (4 o 5, bien separados), mejor. Descomentá y completá con tus coordenadas.
 */
export const REFERENCIAS: Referencia[] = [
{ donde: 'gate:mitre', lat: -34.652591, lng: -58.776966 },
{ donde: 'gate:corvalan', lat: -34.650738, lng: -58.778503 },
{ donde: 'edificio:Daract II', lat: -34.651063, lng: -58.774442 },
{ donde: 'edificio:Dorrego I', lat: -34.649463, lng: -58.776906 },
{ donde: 'edificio:Laboratorios', lat: -34.651489, lng:-58.774062 },
{ donde: 'edificio:Edificio Histórico', lat: -34.651276, lng: -58.776421 },
{ donde: 'edificio:Comedor', lat: -34.650733, lng: -58.776816 },
];

type XY = { x: number; y: number };

function centro(points: string): XY {
  const pts = points.split(' ').map((p) => p.split(',').map(Number));
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  return { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 };
}

/** Posición de un punto de referencia dentro del dibujo del mapa */
function posSvg(donde: string): XY | null {
  const [tipo, nombre] = donde.split(':');
  if (tipo === 'gate') {
    const g = GATES.find((x) => String(x.id) === nombre);
    return g ? { x: g.x, y: g.y } : null;
  }
  if (tipo === 'edificio') {
    const b = BUILDINGS.find((x) => x.label === nombre);
    return b ? centro(b.points) : null;
  }
  return null;
}

type Ajuste = { lat0: number; lng0: number; mLng: number; ar: number; ai: number; br: number; bi: number; escala: number };
let cache: Ajuste | null | undefined;

/** Calcula cómo pasar de coordenadas GPS al dibujo (giro + escala + desplazamiento, por mínimos cuadrados) */
function ajustar(): Ajuste | null {
  if (cache !== undefined) return cache;

  const pares: { m: XY; s: XY }[] = [];
  const validas = REFERENCIAS.map((r) => ({ r, s: posSvg(r.donde) }));
  for (const v of validas) if (!v.s) console.warn('[calibracion] no encuentro en el mapa:', v.r.donde);
  const ok = validas.filter((v): v is { r: Referencia; s: XY } => !!v.s);
  if (ok.length < 2) {
    console.warn('[calibracion] faltan puntos de referencia (hacen falta al menos 2)');
    return (cache = null);
  }

  const lat0 = ok.reduce((a, v) => a + v.r.lat, 0) / ok.length;
  const lng0 = ok.reduce((a, v) => a + v.r.lng, 0) / ok.length;
  const mLng = 111320 * Math.cos((lat0 * Math.PI) / 180);
  // metros hacia el este (x) y hacia el sur (y, igual que el eje del dibujo)
  for (const v of ok) pares.push({ m: { x: (v.r.lng - lng0) * mLng, y: -(v.r.lat - lat0) * 110540 }, s: v.s });

  const n = pares.length;
  const mx = pares.reduce((a, p) => a + p.m.x, 0) / n;
  const my = pares.reduce((a, p) => a + p.m.y, 0) / n;
  const sx = pares.reduce((a, p) => a + p.s.x, 0) / n;
  const sy = pares.reduce((a, p) => a + p.s.y, 0) / n;

  let nr = 0, ni = 0, den = 0;
  for (const p of pares) {
    const mr = p.m.x - mx, mi = p.m.y - my, sr = p.s.x - sx, si = p.s.y - sy;
    nr += sr * mr + si * mi;
    ni += si * mr - sr * mi;
    den += mr * mr + mi * mi;
  }
  const ar = nr / den;
  const ai = ni / den;
  const br = sx - (ar * mx - ai * my);
  const bi = sy - (ar * my + ai * mx);
  const escala = Math.hypot(ar, ai); // píxeles del dibujo por metro

  // error medio, en metros: sirve para saber si la calibración es buena
  const err = pares.reduce((a, p) => {
    const x = ar * p.m.x - ai * p.m.y + br;
    const y = ar * p.m.y + ai * p.m.x + bi;
    return a + Math.hypot(x - p.s.x, y - p.s.y) / escala;
  }, 0) / n;
  console.log(`[calibracion] ${n} puntos · error medio ≈ ${err.toFixed(1)} m · ${escala.toFixed(2)} px/m`);

  return (cache = { lat0, lng0, mLng, ar, ai, br, bi, escala });
}

/** Coordenadas GPS → posición en el dibujo del campus (o null si el mapa no está calibrado) */
export function aSvg(p: { lat: number; lng: number }): XY | null {
  const a = ajustar();
  if (!a) return null;
  const mx = (p.lng - a.lng0) * a.mLng;
  const my = -(p.lat - a.lat0) * 110540;
  return { x: a.ar * mx - a.ai * my + a.br, y: a.ar * my + a.ai * mx + a.bi };
}

/** La entrada del campus más cercana a una posición del dibujo, con la distancia en metros */
export function puertaMasCercana(pos: XY): { id: PuertaCampus; metros: number } | null {
  const a = ajustar();
  if (!a || GATES.length === 0) return null;
  let mejor = GATES[0];
  let dMejor = Infinity;
  for (const g of GATES) {
    const d = Math.hypot(g.x - pos.x, g.y - pos.y);
    if (d < dMejor) {
      dMejor = d;
      mejor = g;
    }
  }
  return { id: String(mejor.id) as PuertaCampus, metros: dMejor / a.escala };
}