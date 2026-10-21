// src/data/fotosEdificios.ts
// Fotos de los edificios del campus.
// React Native exige que cada require() tenga la ruta escrita completa,
// por eso es una tabla fija y no se arma con texto dinámico.
import type { ImageSourcePropType } from 'react-native';

const FOTOS: Record<string, ImageSourcePropType> = {
  daract1: require('../../assets/images/daract1.jpg'),
  daract2: require('../../assets/images/daract2.jpg'),
  dorrego1: require('../../assets/images/dorrego1.jpg'),
  dorrego2: require('../../assets/images/dorrego2.jpg'),
  espum: require('../../assets/images/espum.jpg'),
};

// "edificio-daract2", "Daract II" y "daract2" dan todos la misma clave: "daract2"
function clave(texto: string) {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // saca tildes
    .replace(/^edificio[-\s]*/, '') // saca el prefijo "edificio-"
    .replace(/[^a-z0-9]+/g, '') // saca espacios y símbolos
    .replace(/iii$/, '3')
    .replace(/ii$/, '2')
    .replace(/i$/, '1');
}

// Devuelve la foto del edificio, o undefined si no tiene (comedor, carpa, etc.)
export function fotoDeEdificio(id: string, label: string): ImageSourcePropType | undefined {
  for (const texto of [id, label]) {
    const c = clave(texto);
    if (FOTOS[c]) return FOTOS[c];
    const k = Object.keys(FOTOS).find((x) => c.startsWith(x)); // ej: "espumlaboratorio"
    if (k) return FOTOS[k];
  }
  return undefined;
}