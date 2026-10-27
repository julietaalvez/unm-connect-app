// src/data/iconos.ts
// Íconos del mapa interior: qué ícono lleva cada espacio, de qué tamaño y dónde va.
// Los 5 PNG viven en: assets/icons/

export type TipoIcono = 'bano_m' | 'bano_f' | 'bano_accesible' | 'ascensor' | 'escalera';

export const ICONOS: Record<TipoIcono, any> = {
  bano_m: require('../../assets/icons/bano_m.png'),
  bano_f: require('../../assets/icons/bano_f.png'),
  bano_accesible: require('../../assets/icons/bano_accesible.png'),
  ascensor: require('../../assets/icons/ascensor.png'),
  escalera: require('../../assets/icons/escalera.png'),
};

// Tamaño máximo de cada ícono, en unidades del plano (escala con el zoom, como el resto del mapa).
// Si algún ícono te parece chico o grande, cambiá el número de acá.
export const TAM_ICONO: Record<TipoIcono, number> = {
  bano_m: 60,
  bano_f: 60,
  bano_accesible: 36,
  ascensor: 44,
  escalera: 56,
};

/** Qué ícono le toca a un espacio según su id (o null si no lleva ícono) */
export function tipoIcono(id: string): TipoIcono | null {
  if (id.includes('discapacitad')) return 'bano_accesible';
  const b = id.match(/^bano-.*-([mf])\d/);
  if (b) return b[1] === 'm' ? 'bano_m' : 'bano_f';
  if (id.startsWith('ascensor')) return 'ascensor';
  if (id.startsWith('escalera')) return 'escalera';
  return null;
}

type FormaMin = { id?: string; d: string; cx: number; cy: number; w: number; h: number };

// Altura (fracción del alto del baño) a la que va el ícono de TODOS los baños M y F,
// así quedan alineados entre sí y por encima del baño accesible. Subilo/bajalo si hace falta.
const ALTURA_BANO = 0.28;

// Dorrego I: baños altos y con el baño accesible pegado; se ubican a mano (x, y en unidades del plano):
// los dos (M y F) a la misma altura, centrados en la parte libre de cada baño.
const AJUSTE_DORREGO: Record<string, [number, number]> = {
  'bano-pb-m1': [46.75, 63],
  'bano-pb-f1': [114.3, 63],
  'bano-pa-m1': [42.95, 58],
  'bano-pa-f1': [110.25, 58],
};

/**
 * Punto más "adentro" de un espacio (el centro del círculo más grande que entra en la forma).
 * Sirve para que el ícono quede bien puesto aunque el espacio tenga forma de L o con hueco.
 * Devuelve también el radio de ese círculo, para no pasarse del tamaño del espacio.
 */
export function centroVisual(sh: FormaMin, edificioId?: string): { x: number; y: number; r: number } {
  const n = (sh.d.match(/-?\d+(?:\.\d+)?/g) || []).map(Number);
  const pts: [number, number][] = [];
  for (let i = 0; i + 1 < n.length; i += 2) pts.push([n[i], n[i + 1]]);
  const fallback = { x: sh.cx, y: sh.cy, r: Math.min(sh.w, sh.h) / 2 };
  if (pts.length < 3) return fallback;

  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs);
  const y0 = Math.min(...ys), y1 = Math.max(...ys);

  // Baños M y F
  const t = sh.id ? tipoIcono(sh.id) : null;
  if (t === 'bano_m' || t === 'bano_f') {
    // Dorrego I: posición fija
    const fijo = edificioId === 'edificio-dorrego1' && sh.id ? AJUSTE_DORREGO[sh.id] : undefined;
    if (fijo) return { x: fijo[0], y: fijo[1], r: 30 };

    // tramo (intervalo horizontal) más ancho del baño a una altura dada
    const tramo = (yc: number): [number, number] | null => {
      const cortes: number[] = [];
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const [xi, yi] = pts[i];
        const [xj, yj] = pts[j];
        if (yi > yc !== yj > yc) cortes.push(xi + ((yc - yi) * (xj - xi)) / (yj - yi));
      }
      cortes.sort((a, b) => a - b);
      let mejor: [number, number] | null = null;
      for (let i = 0; i + 1 < cortes.length; i += 2) {
        if (!mejor || cortes[i + 1] - cortes[i] > mejor[1] - mejor[0]) mejor = [cortes[i], cortes[i + 1]];
      }
      return mejor;
    };

    // ancho del baño en 30 alturas, para saber si tiene un hueco arriba
    const filas: { y: number; t: [number, number] }[] = [];
    for (let i = 0; i < 30; i++) {
      const y = y0 + ((i + 0.5) / 30) * (y1 - y0);
      const tr = tramo(y);
      if (tr) filas.push({ y, t: tr });
    }
    const anchoMax = Math.max(...filas.map((f) => f.t[1] - f.t[0]));
    const anchos = filas.map((f) => f.t[1] - f.t[0]);
    const huecoArriba = filas.length > 0 && anchos[0] < anchoMax * 0.9 && anchos[anchos.length - 1] >= anchoMax * 0.9;

    if (huecoArriba) {
      // centrado en el cuerpo (las alturas donde el baño tiene el ancho completo)
      const cuerpo = filas.filter((f) => f.t[1] - f.t[0] >= anchoMax * 0.9);
      const yc = (cuerpo[0].y + cuerpo[cuerpo.length - 1].y) / 2;
      const tr = tramo(yc);
      if (tr) return { x: (tr[0] + tr[1]) / 2, y: yc, r: (tr[1] - tr[0]) / 2 };
    } else {
      // en L o con hueco abajo: misma altura en todos, centrado en la parte libre
      const yc = y0 + (y1 - y0) * ALTURA_BANO;
      const tr = tramo(yc);
      if (tr) return { x: (tr[0] + tr[1]) / 2, y: yc, r: (tr[1] - tr[0]) / 2 };
    }
  }

  const dentro = (px: number, py: number) => {
    let c = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i];
      const [xj, yj] = pts[j];
      if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) c = !c;
    }
    return c;
  };
  const distBorde = (px: number, py: number) => {
    let m = Infinity;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const a = pts[j], b = pts[i];
      const dx = b[0] - a[0], dy = b[1] - a[1];
      const l2 = dx * dx + dy * dy;
      let t = l2 ? ((px - a[0]) * dx + (py - a[1]) * dy) / l2 : 0;
      t = Math.max(0, Math.min(1, t));
      m = Math.min(m, Math.hypot(px - (a[0] + t * dx), py - (a[1] + t * dy)));
    }
    return m;
  };

  const N = 40;
  const muestras: { x: number; y: number; r: number }[] = [];
  let maxR = -1;
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      const px = x0 + ((i + 0.5) / N) * (x1 - x0);
      const py = y0 + ((j + 0.5) / N) * (y1 - y0);
      if (!dentro(px, py)) continue;
      const r = distBorde(px, py);
      muestras.push({ x: px, y: py, r });
      if (r > maxR) maxR = r;
    }
  }
  // entre los puntos casi tan "adentro" como el mejor, el que quede más cerca del centro del espacio
  let best = { x: 0, y: 0, r: -1 };
  let bestD = Infinity;
  for (const m of muestras) {
    if (m.r < maxR * 0.9) continue;
    const d = Math.hypot(m.x - sh.cx, m.y - sh.cy);
    if (d < bestD) {
      bestD = d;
      best = m;
    }
  }
  return best.r > 0 ? best : fallback;
}