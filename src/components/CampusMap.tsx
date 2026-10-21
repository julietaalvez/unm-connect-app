import { useEffect, useMemo, useRef, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, Ellipse, Path, Polygon, Text as SvgText } from 'react-native-svg';

import { BUILDINGS, Building, FIELD, GATES, PATH_D, PATH_POLYGONS } from '../data/campus';
import { EDIFICIOS_CON_INTERIOR } from '../data/edificios';
import { fotoDeEdificio } from '../data/fotosEdificios';
import { GATE_LABELS, PuertaCampus, rutaCampus } from '../lib/campusRuta';
import { Paso, rutaToPath } from '../lib/interior';
import { Colores, useTema } from '../lib/tema';
import HeaderMapa from './HeaderMapa';
import { aSvg, puertaMasCercana } from '../lib/calibracion';
import { useUbicacion } from '../lib/ubicacion';

const VB_X = -70;
const VB_W = 1270;
const VB_H = 860;
const LABEL_PX = 13; // tamaño de letra legible en pantalla

const FOTO_CAMPUS = require('../../assets/images/campus-foto.jpg');

// [x, y, rx, ry] de los puntitos de puerta (del HTML)
const PUERTAS: [number, number, number, number][] = [
  [766.1, 331.3, 2.4, 2.4], [705, 269.8, 2.4, 2.4], [665.8, 245.6, 2.4, 2.4], [580.7, 212.7, 2.4, 2.4],
  [839.8, 390.7, 2.4, 2.4], [255.9, 126, 2.4, 2.4], [158, 124.5, 2.4, 2.4], [437.9, 461.4, 2.9, 2.5],
  [147.3, 464, 4.8, 4.3], [438.3, 436.4, 2.4, 2.4], [488.5, 333.7, 3.4, 3.4], [476.8, 335.7, 2.4, 2.4],
  [321.3, 363.8, 3.4, 2.6], [323.5, 398.7, 2.4, 2.4], [437.4, 429, 2.4, 2.4],
];

// Centro de un polígono (para poner el nombre encima)
function centro(points: string) {
  const pts = points.split(' ').map((p) => p.split(',').map(Number));
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  return {
    x: (Math.min(...xs) + Math.max(...xs)) / 2,
    y: (Math.min(...ys) + Math.max(...ys)) / 2,
  };
}

// Devuelve el id del plano interior de un edificio, o undefined si todavía no tiene
function idInterior(id: string) {
  return EDIFICIOS_CON_INTERIOR.find(
    (k) => k === id || k === 'edificio-' + id || k.replace('edificio-', '') === id
  );
}

const ROMANOS: Record<string, string> = { '1': 'i', '2': 'ii', '3': 'iii', '4': 'iv', '5': 'v' };

// minúsculas, sin tildes, y 1/2/3 -> i/ii/iii
function norm(t: string) {
  return t
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\b\d+\b/g, (n) => ROMANOS[n] ?? n)
    .trim();
}

// texto con halo para que se lea sobre cualquier color
function Cartel({ C, x, y, size, weight = '700', rotation, origin, children }: any) {
  return (
    <>
      <SvgText x={x} y={y} fontSize={size} fontWeight={weight} fill="none" stroke={C.halo} strokeWidth={size * 0.2} strokeLinejoin="round" textAnchor="middle" rotation={rotation} origin={origin} pointerEvents="none">
        {children}
      </SvgText>
      <SvgText x={x} y={y} fontSize={size} fontWeight={weight} fill={C.label} textAnchor="middle" rotation={rotation} origin={origin} pointerEvents="none">
        {children}
      </SvgText>
    </>
  );
}

type Props = { onEnterBuilding?: (id: string) => void };
type RutaState = { points: { x: number; y: number }[]; pasos: Paso[] } | null;

export default function CampusMap({ onEnterBuilding }: Props) {
  const { C } = useTema();
  const s = useMemo(() => makeStyles(C), [C]);
  const { width } = useWindowDimensions();

  const [selected, setSelected] = useState<Building | null>(null);
  const [origen, setOrigen] = useState<PuertaCampus>('mitre');
  const [whereOpen, setWhereOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [sinResultado, setSinResultado] = useState(false);
  const [ruta, setRuta] = useState<RutaState>(null);
  const [errorRuta, setErrorRuta] = useState<string | null>(null);

  const scrollRef = useRef<ScrollView>(null);
  const mapScrollRef = useRef<ScrollView>(null);
  const scrollX = useRef(0);
  const [zoom, setZoom] = useState(width < 600 ? 2.4 : 1);
  const [cardW, setCardW] = useState(Math.max(280, Math.min(width, 900) - 36));

  const mapWidth = cardW * zoom; // el mapa es más ancho que la tarjeta: se desliza con el dedo
  const mapHeight = (mapWidth * VB_H) / VB_W;
  const fontSize = LABEL_PX / (mapWidth / VB_W);
  const radioPunto = 9 / (mapWidth / VB_W);

  const ub = useUbicacion();
  const miPos = useMemo(() => (ub.punto ? aSvg(ub.punto) : null), [ub.punto]);
  const cerca = useMemo(() => (miPos ? puertaMasCercana(miPos) : null), [miPos]);
  const lejos = !!cerca && cerca.metros > 1500;
  const textoGps =
    ub.estado === 'denegado' ? 'Ubicación desactivada: habilitala en Ajustes para verte en el mapa.'
    : ub.estado === 'apagado' ? 'Activá el GPS del celular para verte en el mapa.'
    : ub.estado === 'error' ? 'No pudimos obtener tu ubicación.'
    : !ub.punto ? 'Buscando tu ubicación…'
    : !miPos ? 'Falta calibrar el mapa (ver calibracion.ts).'
    : lejos ? 'Estás lejos del campus.'
    : cerca ? `Estás a ${Math.round(cerca.metros)} m de ${GATE_LABELS[cerca.id]}`
    : '';

  // centrar el mapa al abrir
  useEffect(() => {
    const id = setTimeout(() => mapScrollRef.current?.scrollTo({ x: Math.max(0, (mapWidth - cardW) / 2), animated: false }), 30);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardW]);

  function cambiarZoom(factor: number) {
    const nuevo = Math.max(1, Math.min(4.5, zoom * factor));
    const fx = (scrollX.current + cardW / 2) / mapWidth;
    setZoom(nuevo);
    setTimeout(() => mapScrollRef.current?.scrollTo({ x: fx * cardW * nuevo - cardW / 2, animated: false }), 0);
  }

  const centros = useMemo(
    () => Object.fromEntries(BUILDINGS.map((b) => [b.id, centro(b.points)])),
    []
  );

  const interior = selected ? idInterior(selected.id) : undefined;
  const foto = selected ? fotoDeEdificio(selected.id, selected.label) : undefined;

  function limpiarRuta() {
    setRuta(null);
    setErrorRuta(null);
  }

  function elegir(b: Building) {
    setSelected(b);
    limpiarRuta();
    // centra el mapa sobre el edificio
    const c = centros[b.id];
    if (c) {
      const x = ((c.x - VB_X) / VB_W) * mapWidth - cardW / 2;
      mapScrollRef.current?.scrollTo({ x: Math.max(0, x), animated: true });
    }
    // baja hasta la ficha del edificio
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 60);
  }

  function buscar(texto: string) {
    setQuery(texto);
    const q = norm(texto);
    if (!q) {
      setSinResultado(false);
      return;
    }
    // 1) el nombre del edificio aparece dentro de lo escrito ("aula 5 daract 2" -> Daract II)
    const dentro = BUILDINGS.filter((b) => q.includes(norm(b.label))).sort(
      (a, b) => b.label.length - a.label.length
    )[0];
    // 2) lo escrito es parte del nombre ("dorr" -> Dorrego II)
    const parcial = BUILDINGS.find((b) => norm(b.label).includes(q));
    const b = dentro ?? parcial;
    if (b) {
      setSinResultado(false);
      elegir(b);
    } else {
      setSinResultado(true);
    }
  }

  function comoLlegar() {
    if (!selected) return;
    const r = rutaCampus(origen, selected.id, selected.label);
    if ('error' in r) {
      setRuta(null);
      setErrorRuta(r.error);
    } else {
      setErrorRuta(null);
      setRuta(r);
    }
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 60);
  }

  const gateSize = Math.min(fontSize, 24);
  const corvTx = 36.3 - 7 - 10 - gateSize * 0.4;

  return (
    <ScrollView
      ref={scrollRef}
      style={s.screen}
      contentContainerStyle={{ paddingBottom: 160 }}
      contentInsetAdjustmentBehavior="never"
    >
      <HeaderMapa />
      <Text style={s.subtitle}>Universidad Nacional de Moreno · Campus</Text>

      {/* buscador */}
      <View style={s.search}>
        <Text style={{ color: '#8ea0c2' }}>🔍</Text>
        <TextInput
          value={query}
          onChangeText={buscar}
          placeholder="Buscar edificio (ej: Daract II)"
          placeholderTextColor={C.placeholder}
          style={s.searchInput}
        />
      </View>
      {sinResultado && (
        <Text style={[s.subtitle, { marginTop: -6 }]}>No encontramos ese edificio.</Text>
      )}

      {/* estás en */}
      <Pressable style={s.whereBtn} onPress={() => setWhereOpen((o) => !o)}>
        <Text style={{ color: C.dim, fontSize: 12.5, flex: 1 }}>
          📍 Estás en: <Text style={{ color: C.text, fontWeight: '600' }}>{GATE_LABELS[origen]}</Text>
        </Text>
        <Text style={{ color: C.dim }}>{whereOpen ? '▴' : '▾'}</Text>
      </Pressable>
      {whereOpen && (
        <View style={s.whereList}>
          {(Object.keys(GATE_LABELS) as PuertaCampus[]).map((id) => {
            const activo = id === origen;
            return (
              <Pressable
                key={id}
                style={[s.whereOpt, activo && { backgroundColor: C.elevated }]}
                onPress={() => {
                  setOrigen(id);
                  setWhereOpen(false);
                  limpiarRuta();
                }}
              >
                <View style={s.dot} />
                <Text style={[{ fontSize: 12.5, color: C.text }, activo && { color: C.pillTypeText, fontWeight: '600' }]}>{GATE_LABELS[id]}</Text>
              </Pressable>
            );
          })}
        </View>
      )}

      <View style={s.gpsRow}>
        <Text style={s.gpsTxt}>{textoGps}</Text>
        {cerca && !lejos && (
          <Pressable
            style={s.gpsBtn}
            onPress={() => {
              setOrigen(cerca.id);
              limpiarRuta();
            }}
          >
            <Text style={s.gpsBtnTxt}>Usar mi ubicación</Text>
          </Pressable>
        )}
      </View>

      {/* mapa */}
      <View style={s.mapCard} onLayout={(e) => setCardW(e.nativeEvent.layout.width - 2)}>
        <View style={s.floorLabelRow}>
          <Text style={s.floorLabel}>Campus</Text>
          <Text style={s.floorLabel}>{BUILDINGS.length} edificios</Text>
        </View>
        <ScrollView
          ref={mapScrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={32}
          onScroll={(e) => (scrollX.current = e.nativeEvent.contentOffset.x)}
        >
          <Svg width={mapWidth} height={mapHeight} viewBox={`${VB_X} 0 ${VB_W} ${VB_H}`}>
            {FIELD.map((p, i) => (
              <Polygon key={`f${i}`} points={p} fill={C.field} />
            ))}
            <Path d={PATH_D} fill={C.paths} opacity={0.9} />
            {PATH_POLYGONS.map((p, i) => (
              <Polygon key={`p${i}`} points={p} fill={C.paths} opacity={0.9} />
            ))}

            {BUILDINGS.map((b) => (
              <Polygon
                key={b.id}
                points={b.points}
                fill={selected?.id === b.id ? C.bldgSel : C.bldgFill}
                stroke={selected?.id === b.id ? C.bldgSelStroke : C.bldgStroke}
                strokeWidth={1.3}
                onPress={() => elegir(b)}
              />
            ))}

            {/* puntitos de las puertas */}
            {PUERTAS.map(([x, y, rx, ry], i) => (
              <Ellipse key={`d${i}`} cx={x} cy={y} rx={rx} ry={ry} fill={C.door} pointerEvents="none" />
            ))}

            {ruta && (
              <Path
                d={rutaToPath(ruta.points)}
                fill="none"
                stroke={C.route}
                strokeWidth={2.5}
                strokeDasharray="6 5"
                strokeLinecap="round"
                pointerEvents="none"
              />
            )}

            {BUILDINGS.map((b) => (
              <Cartel C={C} key={`t-${b.id}`} x={centros[b.id].x} y={centros[b.id].y + fontSize * 0.35} size={fontSize}>
                {b.label}
              </Cartel>
            ))}

            {GATES.map((g) => (
              <Circle key={g.id} cx={g.x} cy={g.y} r={7} fill={C.mapAccent} />
            ))}

            {/* nombres de las dos entradas */}
            <Cartel C={C} x={433.4} y={764 + gateSize * 0.7} size={gateSize} weight="800">
              {GATE_LABELS.mitre}
            </Cartel>
            <Cartel C={C} x={corvTx} y={487} size={gateSize} weight="800" rotation={-90} origin={`${corvTx}, 487`}>
              {GATE_LABELS.corvalan}
            </Cartel>

            {miPos && !lejos && (
              <>
                <Circle cx={miPos.x} cy={miPos.y} r={radioPunto * 2.2} fill="#4f8ef7" opacity={0.25} pointerEvents="none" />
                <Circle cx={miPos.x} cy={miPos.y} r={radioPunto} fill="#2f6fe0" stroke="#ffffff" strokeWidth={radioPunto * 0.35} pointerEvents="none" />
              </>
            )}
          </Svg>
        </ScrollView>

        {/* zoom */}
        <View style={s.zoomCtl}>
          <Pressable style={s.zoomBtn} onPress={() => cambiarZoom(1.35)}>
            <Text style={s.zoomTxt}>+</Text>
          </Pressable>
          <Pressable style={s.zoomBtn} onPress={() => cambiarZoom(1 / 1.35)}>
            <Text style={s.zoomTxt}>−</Text>
          </Pressable>
        </View>
      </View>

      {/* ficha */}
      <View style={s.info}>
        {selected ? (
          <>
            {foto && <Image source={foto} style={[s.heroFoto, { marginBottom: 8 }]} resizeMode="cover" />}
            <View style={s.infoHead}>
              <View style={{ flex: 1 }}>
                <Text style={s.infoTitle}>{selected.label}</Text>
                <Text style={s.infoSub}>Campus UNM</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={s.pill}>
                  {selected.accesos} acceso{selected.accesos !== 1 ? 's' : ''}
                </Text>
                <Pressable
                  onPress={() => {
                    setSelected(null);
                    limpiarRuta();
                  }}
                  hitSlop={10}
                  style={{ width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: C.elevated }}
                >
                  <Text style={{ color: C.text, fontSize: 14, fontWeight: '700' }}>✕</Text>
                </Pressable>
              </View>
            </View>

            {interior ? (
              <Pressable style={s.primaryBtn} onPress={() => onEnterBuilding?.(interior)}>
                <Text style={s.primaryBtnText}>Ver mapa interior  →</Text>
              </Pressable>
            ) : (
              <View style={s.noteCard}>
                <Text style={{ color: C.dim, fontSize: 12 }}>Todavía no digitalizamos el interior de este edificio.</Text>
              </View>
            )}

            <Pressable style={s.secondaryBtn} onPress={comoLlegar}>
              <Text style={s.secondaryBtnText}>Cómo llegar</Text>
            </Pressable>

            {errorRuta && (
              <View style={s.noteCard}>
                <Text style={{ color: C.dim, fontSize: 12 }}>{errorRuta}</Text>
              </View>
            )}
            {ruta && (
              <View style={{ marginTop: 6, gap: 8 }}>
                {ruta.pasos.map((paso, i) => (
                  <View key={i} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
                    <View style={s.stepN}>
                      <Text style={{ fontSize: 10, fontWeight: '700', color: C.text }}>{i + 1}</Text>
                    </View>
                    <Text style={{ flex: 1, fontSize: 12.5, color: C.dim }}>
                      {paso.map((seg, j) => (
                        <Text key={j} style={seg.b ? { color: C.text, fontWeight: '600' } : undefined}>
                          {seg.t}
                        </Text>
                      ))}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </>
        ) : (
          <View>
            <Image source={FOTO_CAMPUS} style={s.heroFoto} resizeMode="cover" />
            <Text style={[s.infoTitle, { marginTop: 12 }]}>Campus UNM</Text>
            <Text style={s.infoSub}>Tocá un edificio en el mapa para ver su información.</Text>
            <Text style={[s.pill, { marginTop: 6 }]}>{BUILDINGS.length} edificios</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const makeStyles = (C: Colores) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: C.bg },
    subtitle: { fontSize: 11, color: C.dim, marginHorizontal: 18, marginBottom: 10 },
    search: { marginHorizontal: 18, marginBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.panel2, borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
    searchInput: { flex: 1, fontSize: 14, color: C.text, padding: 0 },
    whereBtn: { marginHorizontal: 18, marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.panel2, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 10 },
    whereList: { marginHorizontal: 18, marginBottom: 10, backgroundColor: C.panel2, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 8 },
    whereOpt: { flexDirection: 'row', alignItems: 'center', gap: 9, padding: 9, borderRadius: 9 },
    gpsRow: { marginHorizontal: 18, marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 8 },
    gpsTxt: { flex: 1, fontSize: 12, color: C.dim },
    gpsBtn: { backgroundColor: C.elevated, borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7 },
    gpsBtnTxt: { color: C.text, fontSize: 12, fontWeight: '700' },
    dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.accent },
    mapCard: { marginHorizontal: 18, marginBottom: 12, backgroundColor: C.mapBg, borderRadius: 22, borderWidth: 1, borderColor: C.mapBorder, overflow: 'hidden', paddingTop: 12 },
    floorLabelRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 14, marginBottom: 6 },
    floorLabel: { fontSize: 11.5, fontWeight: '600', color: C.floorLabel },
    info: { marginHorizontal: 18, padding: 16, borderRadius: 18, backgroundColor: C.panel2, borderWidth: 1, borderColor: C.border, gap: 6 },
    infoHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 4 },
    infoTitle: { fontSize: 17, fontWeight: '700', color: C.text },
    infoSub: { fontSize: 13, color: C.dim },
    pill: { alignSelf: 'flex-start', fontSize: 11, fontWeight: '600', color: C.pillTypeText, backgroundColor: C.pillTypeBg, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20, overflow: 'hidden' },
    primaryBtn: { marginTop: 8, backgroundColor: C.accent, borderRadius: 14, padding: 14, alignItems: 'center' },
    primaryBtnText: { color: C.onAccent, fontWeight: '700', fontSize: 14 },
    secondaryBtn: { marginTop: 6, backgroundColor: C.elevated, borderWidth: 1, borderColor: C.border, borderRadius: 14, padding: 14, alignItems: 'center' },
    secondaryBtnText: { color: C.text, fontWeight: '700', fontSize: 14 },
    noteCard: { backgroundColor: C.elevated, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 10, marginTop: 6 },
    stepN: { width: 18, height: 18, borderRadius: 9, backgroundColor: C.elevated, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
    heroFoto: { width: '100%', height: 150, borderRadius: 14, backgroundColor: C.elevated },
    zoomCtl: { position: 'absolute', right: 20, bottom: 20, gap: 8 },
    zoomBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: C.btnBg, borderWidth: 1, borderColor: C.btnBorder, alignItems: 'center', justifyContent: 'center', elevation: 3 },
    zoomTxt: { fontSize: 22, color: C.text, lineHeight: 24 },
  });