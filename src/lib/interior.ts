import type { Edificio, Forma, Punto } from '../data/edificios';
import { ETIQUETAS } from '../data/historico';

/* ---------- tipos ---------- */
export type TipoEspacio = 'aula' | 'bano' | 'serv' | 'muted';
export type Ubicacion = { floor: string; pointId: string };
export type Coord = { x: number; y: number };
/** Un paso de la ruta: trozos de texto, algunos en negrita */
export type Paso = { t: string; b?: boolean }[];
/** points = tramo final (en el piso del destino). legs = el recorrido completo, piso por piso */
export type Ruta = { points: Coord[]; pasos: Paso[]; legs?: { floor: string; points: Coord[] }[] };

/* ---------- clasificación y nombres ---------- */
export function classify(id: string): TipoEspacio {
  if (id.startsWith('espaciolibre') || id.startsWith('nopasar') || id.startsWith('nulo')) return 'muted';
  if (id.includes('discapacitad')) return 'bano';
  if (id.startsWith('bano')) return 'bano';
  if (id.startsWith('escalera') || id.startsWith('ascensor') || id.startsWith('oficina') || id.startsWith('saladocentes')) return 'serv';
  if (id.startsWith('aula') || id.startsWith('biblioteca') || id.startsWith('bedelia')) return 'aula';
  return 'muted';
}

export function labelFor(id: string): string | null {
  if (ETIQUETAS[id]) return ETIQUETAS[id];
  if (id === 'aula-sum') return 'SUM';
  if (id.startsWith('biblioteca')) return 'Biblioteca';
  if (id.startsWith('bedelia')) return 'Bedelía';
  if (id.includes('discapacitad')) return 'Baño accesible';
  const comb = id.match(/^aula-?(\d+)-?yaula-?(\d+)/i);
  if (comb) {
    const nums = [parseInt(comb[1], 10), parseInt(comb[2], 10)].sort((a, b) => a - b);
    return 'Aula ' + nums.join('-');
  }
  const au = id.match(/^aula-?(\d+)/);
  if (au) return 'Aula ' + au[1];
  const bano = id.match(/^bano-.*-([mf])(\d)/);
  if (bano) return 'Baño ' + bano[1].toUpperCase() + bano[2];
  if (id.startsWith('oficina')) return 'Oficina';
  if (id.startsWith('saladocentes')) return 'Sala de docentes';
  if (id.startsWith('escalera')) return 'Escalera';
  if (id.startsWith('ascensor')) return 'Ascensor';
  return null;
}

export function typeLabel(t: TipoEspacio): string {
  return { aula: 'Aula', bano: 'Baño', serv: 'Servicio', muted: '—' }[t];
}

/** En el mapa no se muestran carteles de baños ni escaleras (solo su ícono) */
export function mostrarCartel(id: string): boolean {
  const l = labelFor(id);
  return !!l && !l.startsWith('Baño') && !l.startsWith('Escalera');
}

/* ---------- puntos ---------- */
export function pointById(ed: Edificio, floor: string, id: string): Punto {
  return ed.floors[floor].points.find((p) => p.id === id)!;
}

export function puntoInicial(ed: Edificio): Ubicacion {
  const floor = Object.keys(ed.floors)[0];
  const p = ed.floors[floor].points.find((x) => x.selectable !== false) ?? ed.floors[floor].points[0];
  return { floor, pointId: p.id };
}

/* ---------- Dijkstra sobre el grafo de pasillos ---------- */
function dijkstraFloor(ed: Edificio, floor: string, fromId: string, toId: string) {
  const g = ed.graph[floor];
  if (!g || !g.nodes[fromId] || !g.nodes[toId]) return null;
  const adj: Record<string, [string, number][]> = {};
  Object.keys(g.nodes).forEach((id) => (adj[id] = []));
  g.edges.forEach(([a, b]) => {
    const [ax, ay] = g.nodes[a];
    const [bx, by] = g.nodes[b];
    const w = Math.hypot(ax - bx, ay - by);
    adj[a].push([b, w]);
    adj[b].push([a, w]);
  });
  const dist: Record<string, number> = {};
  const prev: Record<string, string> = {};
  const visited = new Set<string>();
  Object.keys(g.nodes).forEach((id) => (dist[id] = Infinity));
  dist[fromId] = 0;
  while (true) {
    let u: string | null = null;
    let best = Infinity;
    for (const id of Object.keys(g.nodes)) {
      if (!visited.has(id) && dist[id] < best) {
        best = dist[id];
        u = id;
      }
    }
    if (u === null || u === toId) break;
    visited.add(u);
    for (const [v, w] of adj[u]) {
      if (dist[u] + w < dist[v]) {
        dist[v] = dist[u] + w;
        prev[v] = u;
      }
    }
  }
  if (dist[toId] === Infinity) return null;
  const path = [toId];
  let cur = toId;
  while (cur !== fromId) {
    cur = prev[cur];
    path.unshift(cur);
  }
  return { dist: dist[toId], path: path.map((id) => ({ x: g.nodes[id][0], y: g.nodes[id][1] })) };
}

/** Mejor ruta hasta cualquiera de las puertas de un espacio */
function routeToRoom(ed: Edificio, floor: string, fromId: string, roomId: string) {
  const doors = ed.entrances[roomId];
  if (!doors) return null;
  let best: ReturnType<typeof dijkstraFloor> = null;
  for (const doorId of doors) {
    const r = dijkstraFloor(ed, floor, fromId, doorId);
    if (r && (!best || r.dist < best.dist)) best = r;
  }
  return best;
}

/** nombre corto de una escalera a partir del cartel del punto ("Cerca de Escalera A (sube…)" -> "escalera a") */
function nombreEscalera(label: string) {
  return label.replace('Cerca de ', '').replace(/\s*\(.*\)\s*$/, '').toLowerCase();
}

/** Camino más corto entre cualquier punto de cualquier piso, pasando por las escaleras si hace falta */
function caminoEntrePisos(ed: Edificio, mi: Ubicacion, targetFloor: string, roomId: string) {
  const orden = Object.keys(ed.floors);
  const key = (f: string, id: string) => f + '|' + id;
  const adj = new Map<string, [string, number][]>();
  const add = (a: string, b: string, w: number) => {
    if (!adj.has(a)) adj.set(a, []);
    if (!adj.has(b)) adj.set(b, []);
    adj.get(a)!.push([b, w]);
    adj.get(b)!.push([a, w]);
  };
  for (const f of orden) {
    const g = ed.graph[f];
    if (!g) continue;
    for (const [a, b] of g.edges) {
      const [ax, ay] = g.nodes[a];
      const [bx, by] = g.nodes[b];
      add(key(f, a), key(f, b), Math.hypot(ax - bx, ay - by));
    }
  }
  // escaleras: unen el punto de un piso con el del piso de al lado (cuesta como ~40 m de camino)
  for (const link of ed.stairs) {
    const pisos = orden.filter((f) => link[f]);
    for (let i = 0; i < pisos.length - 1; i++) add(key(pisos[i], link[pisos[i]]), key(pisos[i + 1], link[pisos[i + 1]]), 40);
  }
  const origen = key(mi.floor, mi.pointId);
  if (!adj.has(origen)) return null;
  const dist = new Map<string, number>([[origen, 0]]);
  const prev = new Map<string, string>();
  const hecho = new Set<string>();
  const cola: string[] = [origen];
  while (cola.length) {
    let bi = 0;
    for (let i = 1; i < cola.length; i++) if (dist.get(cola[i])! < dist.get(cola[bi])!) bi = i;
    const u = cola.splice(bi, 1)[0];
    if (hecho.has(u)) continue;
    hecho.add(u);
    for (const [v, w] of adj.get(u) ?? []) {
      const nd = dist.get(u)! + w;
      if (nd < (dist.get(v) ?? Infinity)) {
        dist.set(v, nd);
        prev.set(v, u);
        cola.push(v);
      }
    }
  }
  let mejor: string | null = null;
  for (const d of ed.entrances[roomId] ?? []) {
    const k = key(targetFloor, d);
    if (dist.has(k) && (mejor === null || dist.get(k)! < dist.get(mejor)!)) mejor = k;
  }
  if (!mejor) return null;
  const ruta = [mejor];
  while (ruta[0] !== origen) ruta.unshift(prev.get(ruta[0])!);
  // se corta en tramos, uno por piso
  const legs: { floor: string; ids: string[] }[] = [];
  for (const k of ruta) {
    const [f, id] = [k.slice(0, k.indexOf('|')), k.slice(k.indexOf('|') + 1)];
    const ult = legs[legs.length - 1];
    if (ult && ult.floor === f) ult.ids.push(id);
    else legs.push({ floor: f, ids: [id] });
  }
  return legs.map((l) => ({
    floor: l.floor,
    ids: l.ids,
    points: l.ids.map((id) => ({ x: ed.graph[l.floor].nodes[id][0], y: ed.graph[l.floor].nodes[id][1] })),
  }));
}

/* ---------- ruta completa (mismo piso o con escaleras, de un piso a otro) ---------- */
export function calcularRuta(ed: Edificio, mi: Ubicacion, targetFloor: string, forma: Forma, label: string): Ruta {
  const origen = pointById(ed, mi.floor, mi.pointId);
  const orden = Object.keys(ed.floors);
  const tramos = caminoEntrePisos(ed, mi, targetFloor, forma.id);

  // sin datos de pasillo: línea en "L" como último recurso
  if (!tramos) {
    const pasos: Paso[] = [
      [{ t: 'Salís desde ' }, { t: origen.label, b: true }, { t: ` en ${mi.floor}` }],
      [{ t: 'Seguís hasta ' }, { t: label, b: true }, { t: ` (${targetFloor.toLowerCase()})` }],
    ];
    const pts = mi.floor === targetFloor ? [{ x: origen.x, y: origen.y }, { x: forma.cx, y: origen.y }, { x: forma.cx, y: forma.cy }] : [];
    return { points: pts, pasos, legs: pts.length ? [{ floor: targetFloor, points: pts }] : [] };
  }

  const legs = tramos.map((t, i) => ({
    floor: t.floor,
    points: i === tramos.length - 1 ? [...t.points, { x: forma.cx, y: forma.cy }] : t.points,
  }));

  let pasos: Paso[];
  if (tramos.length === 1) {
    pasos = [
      [{ t: 'Salís desde ' }, { t: origen.label, b: true }],
      [{ t: 'Seguís por el pasillo hasta la altura de ' }, { t: label, b: true }],
      [{ t: `Entrás — está en ${targetFloor.toLowerCase()}` }],
    ];
  } else {
    pasos = [[{ t: 'Salís desde ' }, { t: origen.label, b: true }, { t: ` en ${mi.floor}` }]];
    for (let i = 0; i < tramos.length - 1; i++) {
      const salida = pointById(ed, tramos[i].floor, tramos[i].ids[tramos[i].ids.length - 1]);
      const nuevo = tramos[i + 1].floor;
      const sube = orden.indexOf(nuevo) > orden.indexOf(tramos[i].floor) ? 'subís' : 'bajás';
      pasos.push([{ t: `Vas hasta la ${salida ? nombreEscalera(salida.label) : 'escalera'} y ${sube} a ` }, { t: nuevo, b: true }]);
    }
    pasos.push([{ t: `Ya en ${targetFloor}, seguís por el pasillo hasta ` }, { t: label, b: true }]);
  }
  return { points: legs[legs.length - 1].points, pasos, legs };
}

export function rutaToPath(points: Coord[]): string {
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
}

/* ---------- buscador ---------- */
/** "aula 13", "13" o "Aula 13" encuentran también las aulas combinadas (ej: Aula 11-13) */
export function buscarEspacio(ed: Edificio, consulta: string): { floor: string; forma: Forma } | null {
  const q = consulta.trim().toLowerCase();
  if (!q) return null;
  const soloNumero = q.match(/^(?:aula\s*)?(\d+)$/);
  for (const floor of Object.keys(ed.floors)) {
    for (const forma of ed.floors[floor].shapes) {
      if (classify(forma.id) === 'muted') continue;
      const label = (labelFor(forma.id) || forma.id).toLowerCase();
      if (soloNumero && label.startsWith('aula')) {
        const nums = (label.match(/\d+/g) || []).map((n) => parseInt(n, 10));
        if (nums.includes(parseInt(soloNumero[1], 10))) return { floor, forma };
        continue;
      }
      if (label.includes(q) || forma.id.toLowerCase().includes(q)) return { floor, forma };
    }
  }
  return null;
}