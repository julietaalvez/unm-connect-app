import type { Grafo } from '../data/edificios';

type XY = [number, number];
export type Corredores = {
  vertices: Record<string, XY>;
  lineas: string[][]; // cada línea es una lista de nombres de vértices, en orden
  forzar?: Record<string, number>; // puerta -> índice de la línea a la que DEBE engancharse
};

/** Arma un grafo como el de Dorrego: cada puerta se une con un tramo recto al punto más cercano del pasillo. */
export function grafoDesdeCorredores(base: Grafo, c: Corredores): Grafo {
  const nodes: Record<string, XY> = {};
  const edges: [string, string][] = [];

  // las puertas son los nodos originales que no son "j-"
  const puertas = Object.entries(base.nodes).filter(([id]) => !id.startsWith('j-'));
  puertas.forEach(([id, p]) => {
    nodes[id] = p;
  });
  Object.entries(c.vertices).forEach(([id, p]) => {
    nodes[id] = p;
  });

  const enTramo: Record<string, { id: string; t: number }[]> = {};

  for (const [id, [px, py]] of puertas) {
    const solo = c.forzar ? c.forzar[id] : undefined;
    let mejor = { d: Infinity, key: '', t: 0, x: 0, y: 0 };
    c.lineas.forEach((linea, l) => {
      if (solo !== undefined && solo !== l) return;
      for (let k = 0; k < linea.length - 1; k++) {
        const [ax, ay] = c.vertices[linea[k]];
        const [bx, by] = c.vertices[linea[k + 1]];
        const dx = bx - ax;
        const dy = by - ay;
        const len2 = dx * dx + dy * dy || 1;
        const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
        const x = ax + t * dx;
        const y = ay + t * dy;
        const d = Math.hypot(px - x, py - y);
        if (d < mejor.d - 1e-9) mejor = { d, key: `${l}:${k}`, t, x, y };
      }
    });
    if (!mejor.key) continue;
    const jid = 'j-' + id;
    nodes[jid] = [Math.round(mejor.x * 10) / 10, Math.round(mejor.y * 10) / 10];
    edges.push([jid, id]);
    (enTramo[mejor.key] = enTramo[mejor.key] || []).push({ id: jid, t: mejor.t });
  }

  // encadeno vértices y puntos de enganche en orden a lo largo de cada tramo
  c.lineas.forEach((linea, l) => {
    for (let k = 0; k < linea.length - 1; k++) {
      const medio = (enTramo[`${l}:${k}`] || []).sort((a, b) => a.t - b.t).map((o) => o.id);
      const seq = [linea[k], ...medio, linea[k + 1]];
      for (let i = 0; i < seq.length - 1; i++) edges.push([seq[i], seq[i + 1]]);
    }
  });

  return { nodes, edges };
}