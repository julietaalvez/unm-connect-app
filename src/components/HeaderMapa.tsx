import React, { useRef, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { useTema } from '../lib/tema';

const LOGO_CLARO = require('../../assets/images/unm-logo.png');
const LOGO_OSCURO = require('../../assets/images/unm-logo-dark.png');

/** Barra de arriba: (flecha opcional) + logo UNM Connect + botón de modo oscuro */
export default function HeaderMapa({ onBack }: { onBack?: () => void }) {
  const { modo, C, alternar } = useTema();
  const insets = useSafeAreaInsets();
  const boton = { backgroundColor: C.btnBg, borderColor: C.btnBorder };

  const ref = useRef<View>(null);
  const [extraTop, setExtraTop] = useState<number | null>(null); // null = todavía no midió

  // Mide a qué altura de la pantalla quedó el header. Si el contenedor ya lo bajó
  // (por ejemplo las pestañas nativas), solo se suma lo que falta de la zona segura.
  // Se mide una sola vez por montaje, con el scroll arriba de todo.
  function medir() {
    if (extraTop !== null) return;
    ref.current?.measureInWindow((_x, y) => {
      setExtraTop(Math.max(0, insets.top - Math.max(0, y)));
    });
  }

  return (
    <View
      ref={ref}
      collapsable={false}
      onLayout={medir}
      style={[s.row, { paddingTop: (extraTop ?? 0) + 8, opacity: extraTop === null ? 0 : 1 }]}
    >
      {onBack && (
        <Pressable onPress={onBack} style={[s.btn, boton]} accessibilityLabel="Volver al campus">
          <Text style={{ fontSize: 20, color: C.text, marginTop: -2 }}>‹</Text>
        </Pressable>
      )}

      {/* El logo queda a la izquierda y se achica solo si falta lugar */}
      <View style={s.logoBox}>
        <Image source={modo === 'dark' ? LOGO_OSCURO : LOGO_CLARO} style={s.logo} resizeMode="contain" />
      </View>

      <Pressable
        onPress={alternar}
        style={[s.btn, boton]}
        accessibilityLabel={modo === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      >
        {modo === 'dark' ? (
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={C.text} strokeWidth={2} strokeLinecap="round">
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
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 18, paddingBottom: 8 },
  logoBox: { flex: 1, minWidth: 0, height: 44, justifyContent: 'center', alignItems: 'flex-start' },
  logo: { height: '100%', maxWidth: '100%', aspectRatio: 328 / 74 },
  btn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center', elevation: 3 },
});