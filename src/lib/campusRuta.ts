import { DESTINOS_INTERIORES, ESCALERAS_PB, GRAFO } from '../data/campusGrafo';
import type { Coord, Paso } from './interior';

// Datos generados del HTML original: puertas de cada edificio y caminos peatonales del campus.

export type PuertaCampus = 'mitre' | 'corvalan';
export const GATE_LABELS: Record<PuertaCampus, string> = {
  mitre: 'Entrada Mitre',
  corvalan: 'Entrada Intendente Corvalán',
};

const BUILDING_DOORS: Record<string, string[]> = {
  "edificio-daract1": [
    "entrada-daract1-1",
    "entrada-daract1-2"
  ],
  "edificio-daract2": [
    "entrada-daract2-1",
    "entrada-daract2-2"
  ],
  "edificio-dorrego1": [
    "entrada-dorrego1-1",
    "entrada-dorrego1-2"
  ],
  "edificio-dorrego2": [
    "edificio-dorrego2-centro"
  ],
  "edificio-historico": [
    "entrada-historico-1",
    "entrada-historico-2",
    "entrada-historico-3"
  ],
  "edificio-laboratorios": [
    "entrada-laboratorios-1"
  ],
  "edificio-comedor": [
    "entrada-comedor-1",
    "entrada-comedor-2"
  ],
  "edificio-carpa": [
    "entrada-carpa-1",
    "entrada-carpa-2",
    "entrada-carpa-3"
  ],
  "edificio-oficinas": [
    "edificio-oficinas-centro"
  ],
  "edificio-espum": [
    "edificio-espum-centro"
  ]
};

const DOOR_POINTS: Record<string, Coord> = {
  "entrada-mitre": {
    "x": 433.4,
    "y": 745.2
  },
  "entrada-corvalan": {
    "x": 36.3,
    "y": 487
  },
  "entrada-daract2-2": {
    "x": 766.1,
    "y": 331.3
  },
  "entrada-daract2-1": {
    "x": 705,
    "y": 269.8
  },
  "entrada-daract1-1": {
    "x": 665.8,
    "y": 245.6
  },
  "entrada-daract1-2": {
    "x": 580.7,
    "y": 212.7
  },
  "entrada-laboratorios-1": {
    "x": 839.8,
    "y": 390.7
  },
  "entrada-dorrego1-1": {
    "x": 255.9,
    "y": 126
  },
  "entrada-dorrego1-2": {
    "x": 158,
    "y": 124.5
  },
  "entrada-historico-1": {
    "x": 437.9,
    "y": 461.4
  },
  "entrada-historico-2": {
    "x": 147.3,
    "y": 464
  },
  "entrada-historico-3": {
    "x": 488.5,
    "y": 333.7
  },
  "entrada-carpa-3": {
    "x": 438.3,
    "y": 436.4
  },
  "entrada-carpa-2": {
    "x": 476.8,
    "y": 335.7
  },
  "entrada-carpa-1": {
    "x": 437.4,
    "y": 429
  },
  "entrada-comedor-1": {
    "x": 321.3,
    "y": 363.8
  },
  "entrada-comedor-2": {
    "x": 323.5,
    "y": 398.7
  },
  "edificio-dorrego2-centro": {
    "x": 339,
    "y": 125
  },
  "edificio-oficinas-centro": {
    "x": 65,
    "y": 100
  },
  "edificio-espum-centro": {
    "x": 450,
    "y": 100
  }
};

const CAMPUS_GRAPH = GRAFO;
const GRAFO_VIEJO: { nodes: Record<string, Coord>; edges: [string, string][] } = {
  "nodes": {
    "mitre": {
      "x": 433.4,
      "y": 745.2
    },
    "mitre_top": {
      "x": 397,
      "y": 690
    },
    "corvalan": {
      "x": 36.3,
      "y": 487
    },
    "spine_w": {
      "x": 70,
      "y": 440
    },
    "spine_c": {
      "x": 245,
      "y": 440
    },
    "spine_mid": {
      "x": 320,
      "y": 442
    },
    "plaza": {
      "x": 437.9,
      "y": 461.4
    },
    "spine_e": {
      "x": 530,
      "y": 440
    },
    "spine_e2": {
      "x": 670,
      "y": 435
    },
    "spine_e3": {
      "x": 750,
      "y": 420
    },
    "nw_junction": {
      "x": 230,
      "y": 175
    },
    "hist_north": {
      "x": 488.5,
      "y": 333.7
    },
    "ne1": {
      "x": 500,
      "y": 210
    },
    "ne2": {
      "x": 650,
      "y": 260
    },
    "ne3": {
      "x": 720,
      "y": 330
    },
    "ne4": {
      "x": 790,
      "y": 350
    },
    "ne_low": {
      "x": 720,
      "y": 390
    }
  },
  "edges": [
    [
      "corvalan",
      "spine_w"
    ],
    [
      "spine_w",
      "spine_c"
    ],
    [
      "spine_c",
      "spine_mid"
    ],
    [
      "spine_mid",
      "plaza"
    ],
    [
      "plaza",
      "spine_e"
    ],
    [
      "spine_e",
      "spine_e2"
    ],
    [
      "spine_e2",
      "spine_e3"
    ],
    [
      "mitre",
      "mitre_top"
    ],
    [
      "mitre_top",
      "plaza"
    ],
    [
      "spine_w",
      "nw_junction"
    ],
    [
      "nw_junction",
      "ne1"
    ],
    [
      "ne1",
      "ne2"
    ],
    [
      "ne2",
      "ne3"
    ],
    [
      "ne3",
      "ne4"
    ],
    [
      "ne4",
      "ne_low"
    ],
    [
      "ne_low",
      "spine_e3"
    ],
    [
      "hist_north",
      "plaza"
    ]
  ]
};

/** a qué nodo del grafo se llega parado en la puerta de cada edificio */
// en el grafo nuevo cada puerta es un nodo con su mismo nombre
const DOOR_ANCHOR: Record<string, string> = Object.fromEntries(Object.keys(DOOR_POINTS).map((k) => [k, k]));
const DOOR_ANCHOR_VIEJO: Record<string, string> = {
  "entrada-mitre": "mitre",
  "entrada-corvalan": "corvalan",
  "entrada-daract1-1": "ne2",
  "entrada-daract1-2": "ne1",
  "entrada-daract2-1": "ne3",
  "entrada-daract2-2": "ne3",
  "entrada-laboratorios-1": "ne4",
  "entrada-dorrego1-1": "nw_junction",
  "entrada-dorrego1-2": "nw_junction",
  "entrada-historico-1": "plaza",
  "entrada-historico-2": "spine_c",
  "entrada-historico-3": "hist_north",
  "entrada-comedor-1": "spine_mid",
  "entrada-comedor-2": "spine_mid",
  "entrada-carpa-1": "plaza",
  "entrada-carpa-2": "hist_north",
  "entrada-carpa-3": "plaza",
  "edificio-dorrego2-centro": "nw_junction",
  "edificio-oficinas-centro": "nw_junction",
  "edificio-espum-centro": "nw_junction"
};

const dist2 = (a: Coord, b: Coord) => Math.hypot(a.x - b.x, a.y - b.y);

function dijkstra(startId: string, endId: string): string[] | null {
  const nodes = CAMPUS_GRAPH.nodes;
  const adj: Record<string, [string, number][]> = {};
  Object.keys(nodes).forEach((n) => (adj[n] = []));
  CAMPUS_GRAPH.edges.forEach(([a, b]) => {
    const w = dist2(nodes[a], nodes[b]);
    adj[a].push([b, w]);
    adj[b].push([a, w]);
  });
  const dist: Record<string, number> = {};
  const prev: Record<string, string> = {};
  const visited = new Set<string>();
  Object.keys(nodes).forEach((n) => (dist[n] = Infinity));
  dist[startId] = 0;
  while (true) {
    let u: string | null = null;
    let best = Infinity;
    for (const n of Object.keys(dist)) {
      if (!visited.has(n) && dist[n] < best) {
        best = dist[n];
        u = n;
      }
    }
    if (u === null || u === endId) break;
    visited.add(u);
    for (const [v, w] of adj[u]) {
      if (dist[u] + w < dist[v]) {
        dist[v] = dist[u] + w;
        prev[v] = u;
      }
    }
  }
  if (dist[endId] === Infinity) return null;
  const path = [endId];
  let cur = endId;
  while (cur !== startId) {
    cur = prev[cur];
    if (cur === undefined) return null;
    path.unshift(cur);
  }
  return path;
}

function nearestDoor(buildingKey: string, from: Coord): string | null {
  let best: string | null = null;
  let bd = Infinity;
  for (const d of BUILDING_DOORS[buildingKey] || []) {
    const dd = dist2(DOOR_POINTS[d], from);
    if (dd < bd) {
      bd = dd;
      best = d;
    }
  }
  return best;
}

 const NOMBRE_EDIFICIO: Record<string, string> = {
  'edificio-daract1': 'Daract I', 'edificio-daract2': 'Daract II', 'edificio-dorrego1': 'Dorrego I',
  'edificio-dorrego2': 'Dorrego II', 'edificio-historico': 'Edificio Histórico', 'edificio-laboratorios': 'Laboratorios',
  'edificio-comedor': 'Comedor', 'edificio-carpa': 'Carpa / Pabellón', 'edificio-oficinas': 'Oficinas', 'edificio-espum': 'ESPUM',
};

/** Todas las puertas del campus, para elegir "desde dónde salís" */
export const ORIGENES: { id: string; label: string }[] = [
  { id: 'entrada-mitre', label: GATE_LABELS.mitre },
  { id: 'entrada-corvalan', label: GATE_LABELS.corvalan },
  ...Object.entries(BUILDING_DOORS).flatMap(([key, puertas]) =>
    puertas.map((p, i) => ({
      id: p,
      label: `${NOMBRE_EDIFICIO[key] ?? key} · Entrada${puertas.length > 1 ? ' ' + (i + 1) : ''}`,
    })),
  ),
];
export const nombreOrigen = (id: string) => ORIGENES.find((o) => o.id === id)?.label ?? id;

// las puertas de un lugar: una puerta suelta ("entrada-…") o todas las de un edificio
function puertasDe(id: string): string[] {
  if (DOOR_POINTS[id]) return [id];
  const key = id.startsWith('edificio-') ? id : 'edificio-' + id;
  return BUILDING_DOORS[key] ?? [];
}

/** Ruta caminando entre dos lugares del campus (puerta o edificio de salida → edificio de llegada) */
function rutaPorPuertas(origen: string, buildingId: string, label: string, nombreDesde?: string): { points: Coord[]; pasos: Paso[]; puerta?: string } | { error: string } {
  const desde = puertasDe(origen);
  const hasta = puertasDe(buildingId);
  if (!desde.length) return { error: 'Ese lugar todavía no tiene una puerta cargada para salir.' };
  if (!hasta.length) return { error: 'Todavía no cargamos una puerta de acceso para este edificio.' };

  // el par de puertas más cercano entre sí
  let a = desde[0];
  let b = hasta[0];
  let mejor = Infinity;
  for (const x of desde) for (const y of hasta) {
    const d = dist2(DOOR_POINTS[x], DOOR_POINTS[y]);
    if (d < mejor) { mejor = d; a = x; b = y; }
  }

  const quien = nombreDesde ?? nombreOrigen(a);
  if (a === b) {
    return { points: [DOOR_POINTS[a]], pasos: [[{ t: 'Ya estás en la entrada de ' }, { t: label, b: true }]], puerta: b };
  }

  const path = dijkstra(DOOR_ANCHOR[a], DOOR_ANCHOR[b]);
  if (!path) return { points: [DOOR_POINTS[a], DOOR_POINTS[b]], pasos: [], puerta: b };

  const points = [DOOR_POINTS[a], ...path.map((n) => CAMPUS_GRAPH.nodes[n]), DOOR_POINTS[b]];
  const porHistorico = path.some((n) => n.startsWith('h:'));
  const pasos: Paso[] = [
    [{ t: 'Salís desde ' }, { t: quien, b: true }],
    [{ t: 'Seguís el camino principal' + (porHistorico ? ', entrás por la puerta del edificio histórico y cruzás por su pasillo interno' : '') }],
    [{ t: 'Llegás a la entrada de ' }, { t: label, b: true }],
  ];
  return { points, pasos, puerta: b };
}
// puerta del campus -> punto de entrada en el plano interior (los de la lista "Estás en")
const PUNTO_INTERIOR: Record<string, string> = {
  'entrada-daract1-1': 'entrada-1', 'entrada-daract1-2': 'entrada-2',
  'entrada-daract2-1': 'entrada-1', 'entrada-daract2-2': 'entrada-2',
  'entrada-dorrego1-1': 'entrada-1', 'entrada-dorrego1-2': 'entrada-2',
  'entrada-historico-1': 'entrada-mitre', 'entrada-historico-2': 'entrada-corvalan', 'entrada-historico-3': 'salida-norte-2',
  'entrada-carpa-1': 'salida-patio', 'entrada-carpa-2': 'salida-norte-1', 'entrada-carpa-3': 'salida-patio',
  'entrada-comedor-1': 'salida-buffet-norte', 'entrada-comedor-2': 'salida-buffet-sur',
};
export const entradaInterior = (puerta?: string) => (puerta ? PUNTO_INTERIOR[puerta] : undefined);
const PREFIJO_INTERIOR: Record<string, string> = {
  'edificio-historico': 'h:', 'edificio-daract1': 'd1:', 'edificio-daract2': 'd2:', 'edificio-dorrego1': 'do:',
};

/** Ruta hasta un edificio o, si se pasa `destino`, hasta la puerta del aula (o la escalera si está en un piso de arriba) */
export function rutaCampus(
  origen: string,
  buildingId: string,
  label: string,
  nombreDesde?: string,
  destino?: { floor: string; id: string },
  aula?: string,
): { points: Coord[]; pasos: Paso[]; puerta?: string } | { error: string } {
  const base = rutaPorPuertas(origen, buildingId, label, nombreDesde);
  if (!destino) return base;
  const key = buildingId.startsWith('edificio-') ? buildingId : 'edificio-' + buildingId;
  const enPB = DESTINOS_INTERIORES[key]?.[destino.id];
  const objetivos = enPB ?? ESCALERAS_PB[key];
  const desde = puertasDe(origen);
  if (!objetivos?.length || !desde.length) return base;

  let mejor: { path: string[]; d: number; a: string } | null = null;
  for (const a of desde) {
    for (const t of objetivos) {
      const path = dijkstra(DOOR_ANCHOR[a], t);
      if (!path) continue;
      let d = 0;
      for (let i = 1; i < path.length; i++) {
        const p = CAMPUS_GRAPH.nodes[path[i - 1]];
        const q = CAMPUS_GRAPH.nodes[path[i]];
        d += Math.hypot(p.x - q.x, p.y - q.y);
      }
      if (!mejor || d < mejor.d) mejor = { path, d, a };
    }
  }
  if (!mejor) return base;

  // la puerta por la que se entra al edificio (para abrir el plano interior parado ahí)
  const pre = PREFIJO_INTERIOR[key] ?? '';
  let i = mejor.path.length;
  while (i > 0 && pre && mejor.path[i - 1].startsWith(pre)) i--;
  const puerta = i > 0 && DOOR_POINTS[mejor.path[i - 1]] ? mejor.path[i - 1] : 'error' in base ? undefined : base.puerta;

  const quien = nombreDesde ?? nombreOrigen(mejor.a);
  const porHistorico = key !== 'edificio-historico' && mejor.path.some((n) => n.startsWith('h:'));
  const pasos: Paso[] = [
    [{ t: 'Salís desde ' }, { t: quien, b: true }],
    [{ t: 'Seguís el camino principal' + (porHistorico ? ' y cruzás por el pasillo del Edificio Histórico' : '') }],
    [{ t: 'Entrás a ' }, { t: NOMBRE_EDIFICIO[key] ?? label, b: true }],
    enPB
      ? [{ t: 'Seguís por el pasillo hasta ' }, { t: aula ?? 'el aula', b: true }]
      : [{ t: 'Subí por la escalera a ' }, { t: destino.floor, b: true }, { t: ' y seguí hasta ' }, { t: aula ?? 'el aula', b: true }],
  ];
  return { points: [DOOR_POINTS[mejor.a], ...mejor.path.map((n) => CAMPUS_GRAPH.nodes[n])], pasos, puerta };
}