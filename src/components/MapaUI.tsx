import { ReactNode, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Keyboard, PanResponder, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Colores, useTema } from '../lib/tema';
import IconoUI from './IconoUI';

/** Barra de arriba, flotando sobre el mapa: atrás + buscador (y lo que le pases debajo) */
export function BarraSuperior({
  onBack,
  value,
  onChange,
  placeholder,
  children,
}: {
  onBack?: () => void;
  value: string;
  onChange: (t: string) => void;
  placeholder: string;
  children?: ReactNode;
}) {
  const { C } = useTema();
  const s = estilos(C);
  return (
    <View style={s.top} pointerEvents="box-none">
      <View style={s.fila} pointerEvents="box-none">
        {onBack && (
          <Pressable style={s.redondo} onPress={onBack} hitSlop={6}>
            <IconoUI nombre="atras" size={24} color={C.text} />
          </Pressable>
        )}
        <View style={s.buscador}>
          <IconoUI nombre="buscar" size={16} color={C.dim} />
          <TextInput
            value={value}
            onChangeText={onChange}
            placeholder={placeholder}
            placeholderTextColor={C.placeholder}
            style={s.input}
          />
        </View>
      </View>
      {children}
    </View>
  );
}

/** Botones + y − flotando sobre el mapa */
export function BotonesZoom({ onMas, onMenos, abajo = 14, desplaza }: { onMas: () => void; onMenos: () => void; abajo?: number; desplaza?: Animated.AnimatedInterpolation<number> }) {
  const { C } = useTema();
  const s = estilos(C);
  return (
    <Animated.View style={[s.zoom, { bottom: abajo }, desplaza ? { transform: [{ translateY: desplaza }] } : null]} pointerEvents="box-none">
      <Pressable style={s.redondo} onPress={onMas}>
        <IconoUI nombre="mas" size={22} color={C.text} />
      </Pressable>
      <Pressable style={s.redondo} onPress={onMenos}>
        <IconoUI nombre="menos" size={22} color={C.text} />
      </Pressable>
    </Animated.View>
  );
}

/** Fila de "chips" (pisos, "estás en"…) */
export function FilaChips({ children }: { children: ReactNode }) {
  const s = estilos(useTema().C);
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips} style={{ flexGrow: 0 }}>
      {children}
    </ScrollView>
  );
}

export function Chip({ texto, activo, onPress, icono, derecha }: { texto: string; activo?: boolean; onPress?: () => void; icono?: ReactNode; derecha?: ReactNode }) {
  const { C } = useTema();
  const s = estilos(C);
  return (
    <Pressable onPress={onPress} style={[s.chip, activo && { backgroundColor: C.accent, borderColor: C.accent }]}>
      {icono}
      <Text style={[s.chipTxt, activo && { color: C.onAccent }]} numberOfLines={1}>{texto}</Text>
      {derecha}
    </Pressable>
  );
}
/** true mientras el teclado está abierto */
export function useTeclado() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const a = Keyboard.addListener('keyboardDidShow', () => setVisible(true));
    const b = Keyboard.addListener('keyboardDidHide', () => setVisible(false));
    return () => {
      a.remove();
      b.remove();
    };
  }, []);
  return visible;
}
/** Lo que queda a la vista de la hoja cuando está bajada (la manija + el nombre) */
export const HOJA_CERRADA = 76;

/**
 * Cuánto hay que subir los botones +/− para que no los tape la hoja.
 * `progreso` es el mismo valor que le pasás a <Hoja> (1 = abierta, 0 = bajada).
 */
export function subeBotones(progreso: Animated.Value, altoHoja: number) {
  const rango = Math.max(0, altoHoja - HOJA_CERRADA);
  return Animated.multiply(Animated.add(HOJA_CERRADA + 26, Animated.multiply(progreso, rango)), -1);
}

/**
 * Hoja de abajo (como la de Google Maps): se apoya sobre el mapa.
 * Se baja y se sube arrastrando la manija (sigue al dedo) o tocándola; bajada muestra solo `resumen`.
 */
export function Hoja({
  children,
  resumen,
  progreso,
  onCerrar,
  onLayoutAlto,
}: {
  children: ReactNode;
  resumen?: string;
  progreso: Animated.Value;
  onCerrar: () => void;
  onLayoutAlto?: (h: number) => void;
}) {
  const { C } = useTema();
  const s = estilos(C);
  const [abierta, setAbierta] = useState(true);
  const [alto, setAlto] = useState(0);
  const abiertaRef = useRef(true);
  const altoRef = useRef(0);

  useEffect(() => {
    progreso.setValue(1); // cada hoja nueva arranca abierta
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ir = (abrir: boolean) => {
    abiertaRef.current = abrir;
    setAbierta(abrir);
    Animated.timing(progreso, { toValue: abrir ? 1 : 0, duration: 240, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  };

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, g) => {
        const rango = Math.max(1, altoRef.current - HOJA_CERRADA);
        const base = abiertaRef.current ? 1 : 0;
        progreso.setValue(Math.max(0, Math.min(1, base - g.dy / rango))); // sigue al dedo
      },
      onPanResponderRelease: (_, g) => {
        if (Math.abs(g.dy) < 6) ir(!abiertaRef.current); // un toque
        else if (g.dy > 25 || g.vy > 0.6) ir(false);
        else if (g.dy < -25 || g.vy < -0.6) ir(true);
        else ir(abiertaRef.current);
      },
      onPanResponderTerminate: () => ir(abiertaRef.current),
    }),
  ).current;

  const baja = progreso.interpolate({ inputRange: [0, 1], outputRange: [Math.max(0, alto - HOJA_CERRADA), 0] });
  const opResumen = progreso.interpolate({ inputRange: [0, 0.5], outputRange: [1, 0], extrapolate: 'clamp' });
  const opContenido = progreso.interpolate({ inputRange: [0.5, 1], outputRange: [0, 1], extrapolate: 'clamp' });

  return (
    <Animated.View
      style={[s.hoja, { transform: [{ translateY: baja }] }]}
      onLayout={(e) => {
        const h = e.nativeEvent.layout.height;
        altoRef.current = h;
        setAlto(h);
        onLayoutAlto?.(h);
      }}
    >
      <View {...pan.panHandlers} style={s.manija}>
        <View style={s.agarre} />
      </View>
      <Animated.View {...pan.panHandlers} style={[s.resumenFila, { opacity: opResumen }]} pointerEvents={abierta ? 'none' : 'auto'}>
        <Text style={s.resumenTxt} numberOfLines={1}>{resumen}</Text>
      </Animated.View>
      <Pressable style={s.cerrar} onPress={onCerrar} hitSlop={10}>
        <IconoUI nombre="cerrar" size={14} color={C.text} />
      </Pressable>
      <Animated.View style={{ opacity: opContenido }} pointerEvents={abierta ? 'auto' : 'none'}>
        {children}
      </Animated.View>
    </Animated.View>
  );
}

const estilos = (C: Colores) =>
  StyleSheet.create({
    top: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: 12, paddingTop: 8, gap: 8 },
    fila: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingRight: 60 /* deja lugar al botón de ajustes */ },
    redondo: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.btnBg, borderWidth: 1, borderColor: C.btnBorder, alignItems: 'center', justifyContent: 'center', elevation: 4 },
    buscador: { flex: 1, height: 44, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, borderRadius: 22, backgroundColor: C.btnBg, borderWidth: 1, borderColor: C.btnBorder, elevation: 4 },
    input: { flex: 1, fontSize: 14, color: C.text, padding: 0 },
    zoom: { position: 'absolute', right: 12, gap: 8 },
    chips: { gap: 6, paddingRight: 12 },
    chip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.btnBg, borderWidth: 1, borderColor: C.btnBorder, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, elevation: 3 },
    chipTxt: { fontSize: 12.5, fontWeight: '600', color: C.text, maxWidth: 230 },
    hoja: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: C.panel2, borderTopLeftRadius: 22, borderTopRightRadius: 22, borderWidth: 1, borderColor: C.border, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 16, elevation: 12 },
    manija: { paddingTop: 4, paddingBottom: 8 },
    agarre: { alignSelf: 'center', width: 56, height: 6, borderRadius: 3, backgroundColor: C.mapAccent },
    resumenFila: { position: 'absolute', top: 30, left: 16, right: 58, height: 36, justifyContent: 'center' },
    resumenTxt: { flex: 1, fontSize: 16, fontWeight: '700', color: C.text },
    cerrar: { position: 'absolute', right: 14, top: -18, width: 34, height: 34, borderRadius: 17, backgroundColor: C.btnBg, borderWidth: 1, borderColor: C.btnBorder, elevation: 6, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  });
