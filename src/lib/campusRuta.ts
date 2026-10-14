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

const CAMPUS_GRAPH: { nodes: Record<string, Coord>; edges: [string, string][] } = {
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
const DOOR_ANCHOR: Record<string, string> = {
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

/** Ruta caminando desde una de las dos entradas hasta la puerta más cercana de un edificio */
export function rutaCampus(origen: PuertaCampus, buildingId: string, label: string): { points: Coord[]; pasos: Paso[] } | { error: string } {
  const key = buildingId.startsWith('edificio-') ? buildingId : 'edificio-' + buildingId;
  const origin = CAMPUS_GRAPH.nodes[origen];
  const door = nearestDoor(key, origin);
  if (!door) return { error: 'Todavía no cargamos una puerta de acceso para este edificio.' };

  const path = dijkstra(origen, DOOR_ANCHOR[door]);
  const doorPoint = DOOR_POINTS[door];
  if (!path) return { points: [origin, doorPoint], pasos: [] };

  const points = [...path.map((n) => CAMPUS_GRAPH.nodes[n]), doorPoint];
  const porHistorico = path.includes('hist_north');
  const pasos: Paso[] = [
    [{ t: 'Salís desde ' }, { t: GATE_LABELS[origen], b: true }],
    [{ t: 'Seguís el camino principal' + (porHistorico ? ', entrás por la puerta del edificio histórico y cruzás por su pasillo interno' : '') }],
    [{ t: 'Llegás a la entrada de ' }, { t: label, b: true }],
  ];
  return { points, pasos };
}
