// ICONOS DE LA INTERFAZ DEL MAPA — acá ponés los tuyos.
//
// 1) Copiá tus PNG a:  assets/images/iconos/   (mejor cuadrados, 64×64 o más, fondo transparente)
// 2) Acá abajo, reemplazá `null` por el require de cada uno. Ejemplo:
//        buscar: require('../../assets/images/iconos/buscar.png'),
// 3) Los que dejes en `null` siguen mostrando el símbolo de texto de siempre.
//
// Importante: no pongas un require() de un archivo que todavía no existe: la app no arranca.
// Si querés que el ícono tome el color del tema, que el PNG sea de un solo color (negro o blanco).

export type NombreIcono = 'buscar' | 'ubicacion' | 'atras' | 'mas' | 'menos' | 'cerrar' | 'abajo' | 'arriba' | 'ruta';

export const ICONOS_UI: Record<NombreIcono, any | null> = {
  buscar: null,
  ubicacion: null,
  atras: null,
  mas: null,
  menos: null,
  cerrar: null,
  abajo: null,
  arriba: null,
  ruta: null,
};

/** Lo que se muestra mientras no pongas un PNG */
export const SIMBOLOS: Record<NombreIcono, string> = {
  buscar: '🔍',
  ubicacion: '📍',
  atras: '‹',
  mas: '+',
  menos: '−',
  cerrar: '✕',
  abajo: '▾',
  arriba: '▴',
  ruta: '➜',
};
