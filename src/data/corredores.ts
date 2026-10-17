import type { Corredores } from '../lib/corredores';

export const CORREDORES: Record<string, Record<string, Corredores>> = {
  'edificio-daract2': {
    'Planta Baja': {
      vertices: { a: [18, 300], e: [880, 300], s: [880, 522] },
      lineas: [['a', 'e'], ['e', 's']],
      forzar: { 'escalera-2': 0 },
    },
    'Planta Alta': {
      vertices: { a: [16, 335], b: [785, 335], c: [880, 335], d: [900, 335], v1: [785, 397], v2: [880, 431] },
      lineas: [['a', 'b', 'c', 'd'], ['b', 'v1'], ['c', 'v2']],
      forzar: { 'entrada-aula-9': 0, 'escalera-2-alta': 0 },
    },
  },
  'edificio-daract1': {
    'Planta Baja': {
      vertices: {
        w0: [315, 395], s0: [335, 395], e1: [1178, 395],
        w1: [315, 620], s1: [335, 330], e0: [1178, 377], e2: [1178, 435],
      },
      lineas: [['w0', 's0', 'e1'], ['w0', 'w1'], ['s0', 's1'], ['e0', 'e1', 'e2']],
      forzar: { 'escalera-1': 0, 'entrada-bedelia': 0, 'entrada-bano-pb-m1': 0, 'escalera-2': 0 },
    },
    'Planta Alta': {
      vertices: {
        h0: [290, 367], a0: [335, 367], a1: [335, 315], b0: [410, 367], b1: [410, 423],
        c0: [1052, 367], c1: [1052, 451], h1: [1150, 367], w1: [290, 414],
      },
      lineas: [['h0', 'a0', 'b0', 'c0', 'h1'], ['a0', 'a1'], ['b0', 'b1'], ['c0', 'c1'], ['h0', 'w1']],
      forzar: { 'entrada-aula-17': 0, 'escalera-2-alta': 0 },
    },
  },
};