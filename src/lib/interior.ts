import type { Edificio, Forma, Punto } from '../data/edificios';

/* ---------- tipos ---------- */
export type TipoEspacio = 'aula' | 'bano' | 'serv' | 'muted';
export type Ubicacion = { floor: string; pointId: string };
export type Coord = { x: number; y: number };
/** Un paso de la ruta: trozos de texto, algunos en negrita */
export type Paso = { t: string; b?: boolean }[];
export type Ruta = { points: Coord[]; pasos: Paso[] };

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

function nearestStairLink(ed: Edificio, targetFloor: string, cx: number) {
  let best: { d: number; link: Record<string, string> } | null = null;
  for (const link of ed.stairs) {
    const tp = pointById(ed, targetFloor, link[targetFloor]);
    const d = Math.abs(tp.x - cx);
    if (!best || d < best.d) best = { d, link };
  }
  return best!.link;
}

/* ---------- ruta completa (mismo piso o con escalera) ---------- */
export function calcularRuta(ed: Edificio, mi: Ubicacion, targetFloor: string, forma: Forma, label: string): Ruta {
  const origen = pointById(ed, mi.floor, mi.pointId);
  const orden = Object.keys(ed.floors);
  let points: Coord[] | null = null;
  let pasos: Paso[];

  if (mi.floor === targetFloor) {
    const r = routeToRoom(ed, targetFloor, mi.pointId, forma.id);
    if (r) points = [...r.path, { x: forma.cx, y: forma.cy }];
    pasos = [
      [{ t: 'Salís desde ' }, { t: origen.label, b: true }],
      [{ t: 'Seguís por el pasillo hasta la altura de ' }, { t: label, b: true }],
      [{ t: `Entrás — está en ${targetFloor.toLowerCase()}` }],
    ];
  } else {
    const link = nearestStairLink(ed, targetFloor, forma.cx);
    const stairOrigen = pointById(ed, mi.floor, link[mi.floor]);
    const stairDestino = pointById(ed, targetFloor, link[targetFloor]);
    const sube = orden.indexOf(targetFloor) > orden.indexOf(mi.floor) ? 'subís' : 'bajás';
    const r = routeToRoom(ed, targetFloor, link[targetFloor], forma.id);
    if (r) points = [...r.path, { x: forma.cx, y: forma.cy }];
    else points = [{ x: stairDestino.x, y: stairDestino.y }, { x: forma.cx, y: stairDestino.y }, { x: forma.cx, y: forma.cy }];
    const nombreEsc = stairOrigen.label.replace('Cerca de ', '').toLowerCase();
    pasos = [
      [{ t: 'Salís desde ' }, { t: origen.label, b: true }, { t: ` en ${mi.floor}` }],
      [{ t: `Vas hasta la ${nombreEsc} y ${sube} a ` }, { t: targetFloor, b: true }],
      [{ t: `Ya en ${targetFloor}, seguís por el pasillo hasta ` }, { t: label, b: true }],
    ];
  }

  if (!points) {
    // sin datos de pasillo: línea en "L" como último recurso
    const start = mi.floor === targetFloor ? origen : pointById(ed, targetFloor, nearestStairLink(ed, targetFloor, forma.cx)[targetFloor]);
    points = [{ x: start.x, y: start.y }, { x: forma.cx, y: start.y }, { x: forma.cx, y: forma.cy }];
  }
  return { points, pasos };
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
