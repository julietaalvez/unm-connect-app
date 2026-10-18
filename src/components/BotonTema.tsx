import { Pressable, StyleProp, StyleSheet, ViewStyle } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';

import { useTema } from '../lib/tema';

/** Botón de modo claro/oscuro: es el mismo de la cabecera de Inicio, para usarlo en cualquier pantalla */
export default function BotonTema({ style }: { style?: StyleProp<ViewStyle> }) {
  const { modo, C, alternar } = useTema();

  return (
    <Pressable
      onPress={alternar}
      style={[s.btn, { backgroundColor: C.btnBg, borderColor: C.btnBorder }, style]}
      accessibilityLabel={modo === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
    >
      {modo === 'dark' ? (
        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={C.text} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <Circle cx={12} cy={12} r={4.5} />
          <Line x1={12} y1={2} x2={12} y2={4.5} />
          <Line x1={12} y1={19.5} x2={12} y2={22} />
          <Line x1={2} y1={12} x2={4.5} y2={12} />
          <Line x1={19.5} y1={12} x2={22} y2={12} />
          <Line x1={4.9} y1={4.9} x2={6.7} y2={6.7} />
          <Line x1={17.3} y1={17.3} x2={19.1} y2={19.1} />
          <Line x1={4.9} y1={19.1} x2={6.7} y2={17.3} />
          <Line x1={17.3} y1={6.7} x2={19.1} y2={4.9} />
        </Svg>
      ) : (
        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={C.text} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </Svg>
      )}
    </Pressable>
  );
}

const s = StyleSheet.create({
  btn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center', elevation: 3 },
});