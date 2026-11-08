import { DESTINOS_INTERIORES, ESCALERAS_PB, GRAFO } from '../data/campusGrafo';
import type { Paso } from './interior';

type P = { x: number; y: number };
export type RutaGeneral = { points: P[]; pasos: Paso[]; puerta?: string } | { error: string };

/** Un extremo de la ruta: un punto suelto (GPS o tocado en el mapa), una entrada, un edificio o un aula */
export type Extremo = {
  punto?: P; // GPS o un lugar tocado en el mapa
  clave?: string; // 'entrada-mitre', 'edificio-historico', ...
  label: string;
  edificio?: string;
  destino?: { floor: string; id: string }; // aula (con su piso)
  gps?: boolean;
};

const PREFIJO: Record<string, string> = {
  'edificio-historico': 'h:',
  'edificio-daract1': 'd1:',
  'edificio-daract2': 'd2:',
  'edificio-dorrego1': 'do:',
};
const DIST_GPS = 90; // unidades del mapa (≈ 45 m): más lejos no estás sobre ningún camino
const DIST_TOQUE = 160; // para un lugar tocado en el mapa

let ADJ: Map<string, { n: string; w: number }[]> | null = null;
function adj() {
  if (ADJ) return ADJ;
  ADJ = new Map();
  for (const [a, b] of GRAFO.edges) {
    const p = GRAFO.nodes[a], q = GRAFO.nodes[b];
    if (!p || !q) continue;
    const w = Math.hypot(p.x - q.x, p.y - q.y);
    if (!ADJ.has(a)) ADJ.set(a, []);
    if (!ADJ.has(b)) ADJ.set(b, []);
    ADJ.get(a)!.push({ n: b, w });
    ADJ.get(b)!.push({ n: a, w });
  }
  return ADJ;
}

function puertasEdificio(key: string): string[] {
  const x = key.replace('edificio-', '');
  return Object.keys(GRAFO.nodes).filter((n) => n.startsWith('entrada-' + x + '-') || n === 'edificio-' + x + '-centro');
}

/** El punto del camino más cercano (y los dos nodos de ese tramo) */
function engancharAlCamino(pos: P) {
  let mejor: { d: number; punto: P; a: string; b: string } | null = null;
  for (const [a, b] of GRAFO.edges) {
    const p = GRAFO.nodes[a], q = GRAFO.nodes[b];
    if (!p || !q) continue;
    const dx = q.x - p.x, dy = q.y - p.y;
    const l2 = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((pos.x - p.x) * dx + (pos.y - p.y) * dy) / l2));
    const punto = { x: p.x + t * dx, y: p.y + t * dy };
    const d = Math.hypot(pos.x - punto.x, pos.y - punto.y);
    if (!mejor || d < mejor.d) mejor = { d, punto, a, b };
  }
  return mejor;
}

const claveEdificio = (e: Extremo) => (e.clave && e.clave.startsWith('edificio-') ? e.clave : undefined);

/** Los nodos del grafo por donde se arranca / se llega, con lo que cuesta llegar a cada uno */
function resolver(e: Extremo): { nodos: Map<string, number>; vis: P[]; en?: boolean } | { error: string } {
  if (e.punto) {
    const eng = engancharAlCamino(e.punto);
    if (!eng || eng.d > (e.gps ? DIST_GPS : DIST_TOQUE)) {
      return { error: e.gps ? 'Parece que estás lejos de los caminos del campus. Elegí desde dónde salís.' : 'Ese punto queda lejos de los caminos. Tocá más cerca de un camino o de un edificio.' };
    }
    const A = GRAFO.nodes[eng.a], B = GRAFO.nodes[eng.b];
    return {
      nodos: new Map([[eng.a, Math.hypot(eng.punto.x - A.x, eng.punto.y - A.y)], [eng.b, Math.hypot(eng.punto.x - B.x, eng.punto.y - B.y)]]),
      vis: [e.punto, eng.punto],
    };
  }
  const key = claveEdificio(e);
  if (key && e.destino) {
    const enPB = DESTINOS_INTERIORES[key]?.[e.destino.id];
    const ns = (enPB ?? ESCALERAS_PB[key] ?? []).filter((n) => GRAFO.nodes[n]);
    if (!ns.length) return { error: `Todavía no cargamos el camino hasta ${e.label}.` };
    return { nodos: new Map(ns.map((n) => [n, 0])), vis: [], en: !!enPB };
  }
  if (key) {
    const ns = puertasEdificio(key);
    if (!ns.length) return { error: 'Todavía no cargamos una puerta de acceso para este edificio.' };
    return { nodos: new Map(ns.map((n) => [n, 0])), vis: [] };
  }
  if (e.clave && GRAFO.nodes[e.clave]) return { nodos: new Map([[e.clave, 0]]), vis: [] };
  return { error: 'No pudimos ubicar ese lugar en el mapa.' };
}

/**
 * Ruta caminando entre dos extremos cualquiera: tu ubicación (GPS), un punto tocado en el mapa,
 * una entrada, un edificio o un aula. Siempre por los caminos del grafo unificado del campus.
 */
export function rutaGeneral(desde: Extremo, hasta: Extremo): RutaGeneral {
  const o = resolver(desde);
  if ('error' in o) return o;
  const d = resolver(hasta);
  if ('error' in d) return d;

  // Dijkstra con varios puntos de partida y varias metas
  const dist = new Map<string, number>();
  const prev = new Map<string, string | null>();
  const cola: [number, string][] = [];
  const poner = (n: string, c: number, de: string | null) => {
    if (c < (dist.get(n) ?? Infinity)) { dist.set(n, c); prev.set(n, de); cola.push([c, n]); }
  };
  o.nodos.forEach((c, n) => poner(n, c, null));
  const A2 = adj();
  let llegada: string | null = null;
  let mejorTotal = Infinity;
  while (cola.length) {
    cola.sort((x, y) => x[0] - y[0]);
    const [c, u] = cola.shift()!;
    if (c > (dist.get(u) ?? Infinity)) continue;
    if (c >= mejorTotal) break;
    const extra = d.nodos.get(u);
    if (extra !== undefined && c + extra < mejorTotal) { mejorTotal = c + extra; llegada = u; }
    for (const { n, w } of A2.get(u) ?? []) poner(n, c + w, u);
  }
  if (!llegada) return { error: 'No encontramos un camino entre esos dos lugares.' };

  const path: string[] = [llegada];
  while (prev.get(path[0])) path.unshift(prev.get(path[0])!);

  const points: P[] = [...o.vis, ...path.map((n) => GRAFO.nodes[n]), ...[...d.vis].reverse()];
  const limpios = points.filter((p, i) => i === 0 || Math.hypot(p.x - points[i - 1].x, p.y - points[i - 1].y) > 0.01);
  if (limpios.length < 2) limpios.push(limpios[0]);

  // por dónde se entra al edificio de destino (para abrir su plano parado en esa puerta)
  const keyD = claveEdificio(hasta) ?? '';
  const pre = PREFIJO[keyD] ?? '';
  let i = path.length;
  while (pre && i > 0 && path[i - 1].startsWith(pre)) i--;
  const puerta = i > 0 && path[i - 1].startsWith('entrada-') ? path[i - 1] : path[path.length - 1].startsWith('entrada-') ? path[path.length - 1] : undefined;

  // pasos
  const nombre = (e: Extremo) => (e.gps ? 'tu ubicación' : e.punto ? 'el punto que elegiste' : e.label);
  const keyO = claveEdificio(desde) ?? '';
  const mismoEdificio = !!keyO && keyO === keyD;
  const porHistorico = keyD !== 'edificio-historico' && keyO !== 'edificio-historico' && path.some((n) => n.startsWith('h:'));
  const pasos: Paso[] = [[{ t: 'Salís desde ' }, { t: nombre(desde), b: true }]];
  if (mismoEdificio) {
    pasos.push([{ t: 'Seguís por los pasillos del edificio' }]);
  } else {
    pasos.push([{ t: 'Seguís el camino principal' + (porHistorico ? ' y cruzás por el pasillo del Edificio Histórico' : '') }]);
  }
  if (hasta.destino) {
    if (!mismoEdificio) pasos.push([{ t: 'Entrás a ' }, { t: hasta.edificio ?? hasta.label, b: true }]);
    pasos.push(
      d.en
        ? [{ t: 'Seguís por el pasillo hasta ' }, { t: hasta.label, b: true }]
        : [{ t: 'Subí por la escalera a ' }, { t: hasta.destino.floor, b: true }, { t: ' y seguí hasta ' }, { t: hasta.label, b: true }],
    );
  } else if (hasta.punto) {
    pasos.push([{ t: 'Llegás al ' }, { t: 'punto que elegiste', b: true }]);
  } else {
    pasos.push([{ t: 'Llegás a ' }, { t: hasta.label, b: true }]);
  }
  return { points: limpios, pasos, puerta };
}
