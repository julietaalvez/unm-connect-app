import { ReactNode, useRef, useState } from 'react';
import { NativeScrollEvent, NativeSyntheticEvent, ScrollView, View } from 'react-native';

// Alto de la tarjeta del mapa: el MISMO para el campus y para el interior.
export const altoMapa = (winW: number, winH: number) => Math.round(Math.min(winH * 0.5, winW * 1.05));

type Opts = {
  viewW: number; // ancho visible (la tarjeta)
  viewH: number; // alto visible
  baseW: number; // ancho del mapa con zoom 1
  baseH: number; // alto del mapa con zoom 1
  min: number;
  max: number;
  arriba?: number; // espacio tapado por los controles de arriba: el mapa se centra en lo que queda libre
};

/**
 * Versión simple y liviana: el mapa se mueve con el dedo (scroll nativo, en todas las direcciones)
 * y el zoom se cambia con los botones + y −. Sin pellizco.
 */
export function useMapaGestos(inicial: number, o: Opts) {
  const { viewW, viewH, baseW, baseH, min, max } = o;
  const arriba = o.arriba ?? 0;
  const [zoom, setZoom] = useState(inicial);
  const zoomRef = useRef(inicial);
  const hRef = useRef<ScrollView>(null);
  const vRef = useRef<ScrollView>(null);
  const pos = useRef({ x: 0, y: 0 });

  const clampZ = (z: number) => Math.max(min, Math.min(max, z));

  // acerca/aleja a z y deja el punto (mx, my) del mapa (en px con zoom 1) en el centro de la tarjeta
  function irA(z0: number, mx: number, my: number) {
    const z = clampZ(z0);
    zoomRef.current = z;
    setZoom(z);
    const x = Math.max(0, Math.min(baseW * z - viewW, mx * z - viewW / 2));
    const y = Math.max(0, Math.min(baseH * z + arriba - viewH, my * z + arriba - viewH / 2));
    setTimeout(() => {
      hRef.current?.scrollTo({ x, animated: false });
      vRef.current?.scrollTo({ y, animated: false });
    }, 40);
  }

  const centrarEn = irA;

  // botones + y −: mantienen lo que estás mirando en el centro
  function zoomPor(factor: number) {
    const z = zoomRef.current;
    const mx = baseW * z <= viewW ? baseW / 2 : (pos.current.x + viewW / 2) / z;
    const my = baseH * z + arriba <= viewH ? baseH / 2 : (pos.current.y + viewH / 2 - arriba) / z;
    irA(z * factor, mx, my);
  }

  const puedeMover = baseW * zoom > viewW + 1 || baseH * zoom + arriba > viewH + 1;

  return { zoom, zoomRef, hRef, vRef, pos, centrarEn, irA, zoomPor, puedeMover };
}

export function MapaVista({
  m,
  viewW,
  viewH,
  baseW,
  baseH,
  arriba = 0,
  children,
}: {
  m: ReturnType<typeof useMapaGestos>;
  viewW: number;
  viewH: number;
  baseW: number;
  baseH: number;
  arriba?: number;
  onTocar?: (tocando: boolean) => void; // ya no hace falta, se deja por compatibilidad
  children: ReactNode;
}) {
  const mapW = baseW * m.zoom;
  const mapH = baseH * m.zoom;
  return (
    <View style={{ width: viewW, height: viewH, overflow: 'hidden' }}>
      <ScrollView
        ref={m.hRef}
        horizontal
        nestedScrollEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={32}
        onScroll={(e: NativeSyntheticEvent<NativeScrollEvent>) => (m.pos.current.x = e.nativeEvent.contentOffset.x)}
      >
        <ScrollView
          ref={m.vRef}
          nestedScrollEnabled
          bounces={false}
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={32}
          onScroll={(e: NativeSyntheticEvent<NativeScrollEvent>) => (m.pos.current.y = e.nativeEvent.contentOffset.y)}
          style={{ width: Math.max(viewW, mapW), height: viewH }}
          contentContainerStyle={{ minHeight: viewH, paddingTop: arriba, justifyContent: 'center', alignItems: 'center' }}
        >
          <View style={{ width: mapW, height: mapH }}>{children}</View>
        </ScrollView>
              </ScrollView>
    </View>
  );
}
