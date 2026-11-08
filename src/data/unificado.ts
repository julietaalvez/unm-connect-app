// Matrices SVG [a, b, c, d, e, f]: pasan cada plano interior a coordenadas del campus.
// Histórico: su plano es una copia ampliada del campus. Daract I/II y Dorrego I: ajustadas al contorno del edificio
// (Biblioteca de Daract I en la punta noroeste y SUM de Daract II en la sudeste).
export const TRANSFORMS: Record<string, [number, number, number, number, number, number]> = {
  'edificio-historico': [0.64114, 0, 0, 0.64114, 40.8177, 88.82249],
  'edificio-daract1': [0.08963, 0.05582, -0.05582, 0.08963, 582.54406, 145.41348],
  'edificio-daract2': [0.08642, 0.0592, -0.0592, 0.08642, 721.38015, 241.24862],
  'edificio-dorrego1': [0.08424, 0.00131, -0.00131, 0.08424, 157.17129, 104.20429],
};
