// ICONOS DE LA INTERFAZ DEL MAPA — acá ponés los tuyos.
//
// 1) Copiá tus PNG a:  assets/images/iconos/   (mejor cuadrados, 64×64 o más, fondo transparente)
// 2) Acá abajo, reemplazá `null` por el require de cada uno. Ejemplo:
//        buscar: require('../../assets/images/iconos/buscar.png'),
// 3) Los que dejes en `null` siguen mostrando el símbolo de texto de siempre.
//
// Importante: no pongas un require() de un archivo que todavía no existe: la app no arranca.
// Si querés que el ícono tome el color del tema, que el PNG sea de un solo color (negro o blanco).

export type NombreIcono = 'buscar' | 'ubicacion' | 'atras' | 'mas' | 'menos' | 'cerrar' | 'abajo' | 'arriba' | 'ruta' | 'enchufe' | 'wifi' | 'proyector' | 'accesible' | 'personas';

export const ICONOS_UI: Record<NombreIcono, any | null> = {
  buscar: require('../../assets/icons/buscar.png'),
  ubicacion: require('../../assets/icons/pin.png'),
  atras: require('../../assets/icons/atras.png'),
  mas: null,
  menos: null,
  cerrar: null,
  abajo: require('../../assets/icons/abajo.png'),
  arriba: require('../../assets/icons/arriba.png'),
  ruta: null,
  enchufe: require('../../assets/icons/enchufe.png'),
  wifi: require('../../assets/icons/wifi.png'),
  proyector: require('../../assets/icons/proyector.png'),
  accesible: null,
  personas: require('../../assets//icons/personas.png'),
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
  enchufe: '🔌',
  wifi: '📶',
  proyector: '📽️',
  accesible: '♿',
  personas: '👥',
};
