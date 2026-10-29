import { Image, Text } from 'react-native';

import { ICONOS_UI, NombreIcono, SIMBOLOS } from '../data/iconosUI';

type Props = { nombre: NombreIcono; size?: number; color?: string };

/** Muestra el PNG que pusiste en data/iconosUI.ts, o el símbolo de texto si todavía no hay PNG */
export default function IconoUI({ nombre, size = 20, color }: Props) {
  const src = ICONOS_UI[nombre];
  if (src) {
    return <Image source={src} style={{ width: size, height: size, tintColor: color }} resizeMode="contain" />;
  }
  return <Text style={{ fontSize: size * 0.95, lineHeight: size * 1.15, color, fontWeight: '600' }}>{SIMBOLOS[nombre]}</Text>;
}
