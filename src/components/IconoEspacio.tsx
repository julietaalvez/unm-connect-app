// src/components/IconoEspacio.tsx
import { Image, StyleSheet } from 'react-native';
import { ICONOS, TipoIcono } from '../data/iconos';

type Props = {
  tipo: TipoIcono;
  x: number;      // centro del ícono, en coordenadas del plano
  y: number;
  size: number;   // lado del ícono, en unidades del plano
  vbX: number;    // origen del viewBox del plano
  vbY: number;
  k: number;      // píxeles por unidad del plano (svgW / vw)
  color: string;  // color del tema (C.icon)
};

// Se dibuja ENCIMA del <Svg>, dentro de un <View> del mismo tamaño que el plano.
export default function IconoEspacio({ tipo, x, y, size, vbX, vbY, k, color }: Props) {
  const px = size * k;
  return (
    <Image
      source={ICONOS[tipo]}
      resizeMode="contain"
      style={[s.icono, { width: px, height: px, left: (x - vbX) * k - px / 2, top: (y - vbY) * k - px / 2, tintColor: color }]}
    />
  );
}

const s = StyleSheet.create({ icono: { position: 'absolute' } });