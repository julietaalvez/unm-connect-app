import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Image, Keyboard, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, Ellipse, Path, Polygon, Text as SvgText } from 'react-native-svg';

import { Building, BUILDINGS, FIELD, GATES, PATH_D, PATH_POLYGONS, ROADS_D } from '../data/campus';
import { EDIFICIOS_CON_INTERIOR } from '../data/edificios';
import { fotoDeEdificio } from '../data/fotosEdificios';
import { MapaVista, useMapaGestos } from '../lib/MapaZoom';
import { buscarEnTodos } from '../lib/buscadorGlobal';
import { aSvg, puertaMasCercana } from '../lib/calibracion';
import { GATE_LABELS, PuertaCampus, rutaCampus } from '../lib/campusRuta';
import { esOscuro, mezclar } from '../lib/colores';
import { Paso, rutaToPath } from '../lib/interior';
import { Colores, useTema } from '../lib/tema';
import { useUbicacion } from '../lib/ubicacion';
import HeaderMapa from './HeaderMapa';
import IconoUI from './IconoUI';
import { BarraSuperior, BotonesZoom, Chip, FilaChips, Hoja, subeBotones, useTeclado } from './MapaUI';

// Recuadro del mapa nuevo: entra TODO el campus
const VB_X = -15;
const VB_Y = 25;
const VB_W = 930;
const VB_H = 785;
const ZOOM_MAX = 6;
const ZOOM_INICIAL = 1.3;
const ARRIBA = 120; // lo que tapan el buscador y el chip de arriba

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

type Props = { onEnterBuilding?: (id: string, destino?: { floor: string; id: string }) => void };
type RutaState = { points: { x: number; y: number }[]; pasos: Paso[] } | null;

export default function CampusMap({ onEnterBuilding }: Props) {
  const { C } = useTema();
  const s = useMemo(() => makeStyles(C), [C]);
  const { width, height: winH } = useWindowDimensions();

  const [selected, setSelected] = useState<Building | null>(null);
  const [origen, setOrigen] = useState<PuertaCampus>('mitre');
  const [whereOpen, setWhereOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [listaAbierta, setListaAbierta] = useState(false);
  const [ruta, setRuta] = useState<RutaState>(null);
  const [errorRuta, setErrorRuta] = useState<string | null>(null);

  const oscuro = esOscuro(C.bg);
  const VERDE = oscuro ? mezclar(C.field, C.mapBg, 0.3) : mezclar(C.field, '#ffffff', 0.5); // verde más suave

  // el mapa ocupa toda la pantalla: se mide el espacio disponible
  const [caja, setCaja] = useState({ w: width, h: winH * 0.8 });
  const teclado = useTeclado();
  // el alto "de verdad" (sin teclado): así el mapa no se recentra ni cambia de zoom cada vez que se abre el teclado
  const hEstable = useRef(caja.h);
  if (!teclado) hEstable.current = caja.h;
  const [alturaHoja, setAlturaHoja] = useState(0);
  const progHoja = useRef(new Animated.Value(1)).current; // 1 = ficha abierta, 0 = bajada
  const cardW = caja.w;
  const viewH = caja.h;
  const baseH = (cardW * VB_H) / VB_W;
  const m = useMapaGestos(ZOOM_INICIAL, { viewW: cardW, viewH, baseW: cardW, baseH, min: 1, max: ZOOM_MAX, arriba: ARRIBA });
  const zoom = m.zoom;
  const mapWidth = cardW * zoom;
  const mapHeight = baseH * zoom;
  const scale = mapWidth / VB_W; // píxeles de pantalla por unidad del mapa
  const labelPx = Math.min(13, 6.5 + zoom * 1.5); // la letra crece al acercar
  const fontSize = labelPx / scale;
  const radioPunto = 9 / scale;

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

  // al abrir: el campus entero, centrado
  useEffect(() => {
    m.centrarEn(ZOOM_INICIAL, ((450 - VB_X) / VB_W) * cardW, ((420 - VB_Y) / VB_H) * baseH);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardW, hEstable.current]);

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
    // acerca y centra el mapa sobre el edificio
    const c = centros[b.id];
    if (c) {
      m.irA(Math.max(m.zoomRef.current, 1.8), ((c.x - VB_X) / VB_W) * cardW, ((c.y - VB_Y) / VB_H) * baseH);
    }
  }

  function buscar(texto: string) {
    setQuery(texto);
    setListaAbierta(true);
  }

  // lo que se muestra mientras escribís: edificios y, debajo, cualquier aula u oficina de los planos
  const q = norm(query);
  const edificiosHallados = useMemo(
    () => (q ? BUILDINGS.filter((b) => norm(b.label).includes(q)).slice(0, 3) : []),
    [q],
  );
  const espaciosHallados = useMemo(() => buscarEnTodos(query), [query]);
  const hayLista = listaAbierta && (edificiosHallados.length > 0 || espaciosHallados.length > 0);
  const sinResultado = listaAbierta && !!query.trim() && !hayLista;

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
  }

  const gateSize = fontSize;
  const corvTx = 36.3 - 7 / scale - gateSize * 0.5;

  return (
    <View style={s.raiz}>
      <HeaderMapa />
      <View style={s.pantalla} onLayout={(e) => setCaja({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
      {/* el mapa, a pantalla completa */}
      <MapaVista m={m} viewW={cardW} viewH={viewH} baseW={cardW} baseH={baseH} arriba={ARRIBA}>
          <Svg width={mapWidth} height={mapHeight} viewBox={`${VB_X} ${VB_Y} ${VB_W} ${VB_H}`}>
            {/* 1. terreno (contorno de la universidad) */}
            <Path d={PATH_D} fill={C.paths} opacity={0.45} stroke={C.bldgStroke} strokeWidth={1.5 / scale} />
            {PATH_POLYGONS.map((p, i) => (
              <Polygon key={`t${i}`} points={p} fill={C.paths} opacity={0.45} stroke={C.bldgStroke} strokeWidth={1.5 / scale} />
            ))}
  
            {/* 2. césped, encima del terreno */}
            {FIELD.map((p, i) => (
              <Polygon key={`f${i}`} points={p} fill={VERDE} />
            ))}
  
            {/* 3. caminos, encima del césped */}
            <Path d={ROADS_D} fill={C.paths} fillRule="evenodd" opacity={0.95} />
  
            {BUILDINGS.map((b) => (
              <Polygon
                key={b.id}
                points={b.points}
                fill={selected?.id === b.id ? C.bldgSel : C.bldgFill}
                stroke={selected?.id === b.id ? C.bldgSelStroke : C.bldgStroke}
                strokeWidth={1.2 / scale}
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
                strokeWidth={3 / scale}
                strokeDasharray={`${7 / scale} ${5 / scale}`}
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
              <Circle key={g.id} cx={g.x} cy={g.y} r={5 / scale} fill={C.mapAccent} />
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
      </MapaVista>

      {/* arriba, flotando: buscador y "estás en" */}
      <BarraSuperior value={query} onChange={buscar} placeholder="Buscar edificio o aula (ej: Aula 5)">
        <FilaChips>
          <Chip
            texto={`Estás en: ${GATE_LABELS[origen]}`}
            icono={<IconoUI nombre="ubicacion" size={14} />}
            derecha={<IconoUI nombre={whereOpen ? 'arriba' : 'abajo'} size={12} color={C.dim} />}
            onPress={() => setWhereOpen((o) => !o)}
          />
          {cerca && !lejos && (
            <Chip
              texto="Usar mi ubicación"
              onPress={() => {
                setOrigen(cerca.id);
                limpiarRuta();
              }}
            />
          )}
        </FilaChips>
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
        {!!textoGps && (
          <View style={s.gpsChip}>
            <Text style={s.gpsTxt}>{textoGps}</Text>
          </View>
        )}
        {hayLista && (
          <ScrollView style={s.resultados} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
            {edificiosHallados.map((b) => (
              <Pressable
                key={'b' + b.id}
                style={s.whereOpt}
                onPress={() => {
                  setListaAbierta(false);
                  Keyboard.dismiss();
                  elegir(b);
                }}
              >
                <View style={s.dot} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: C.text }}>{b.label}</Text>
                  <Text style={{ fontSize: 11, color: C.dim }}>Edificio</Text>
                </View>
              </Pressable>
            ))}
            {espaciosHallados.map((r) => (
              <Pressable
                key={r.buildingId + r.floor + r.id}
                style={s.whereOpt}
                onPress={() => {
                  setListaAbierta(false);
                  Keyboard.dismiss();
                  onEnterBuilding?.(r.buildingId, { floor: r.floor, id: r.id });
                }}
              >
                <View style={s.dot} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: C.text }} numberOfLines={1}>{r.label}</Text>
                  <Text style={{ fontSize: 11, color: C.dim }}>{r.edificio} · {r.floor}</Text>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        )}
        {sinResultado && (
          <View style={s.gpsChip}>
            <Text style={s.gpsTxt}>No encontramos ese edificio ni esa aula.</Text>
          </View>
        )}
      </BarraSuperior>

      <BotonesZoom onMas={() => m.zoomPor(1.6)} onMenos={() => m.zoomPor(1 / 1.6)} desplaza={selected && !teclado ? subeBotones(progHoja, alturaHoja) : undefined} />

      {/* abajo: ficha del edificio elegido, como la hoja de Google Maps */}
      {selected && !teclado && (
        <Hoja progreso={progHoja} key={selected.id} resumen={selected.label} onCerrar={() => { setSelected(null); limpiarRuta(); }} onLayoutAlto={setAlturaHoja}>
          <ScrollView style={{ maxHeight: winH * 0.5 }} nestedScrollEnabled showsVerticalScrollIndicator={false}>
            {foto && <Image source={foto} style={[s.heroFoto, { marginBottom: 8 }]} resizeMode="cover" />}
            <View style={s.infoHead}>
              <View style={{ flex: 1 }}>
                <Text style={s.infoTitle}>{selected.label}</Text>
                <Text style={s.infoSub}>Campus UNM</Text>
              </View>
              <Text style={s.pill}>
                {selected.accesos} acceso{selected.accesos !== 1 ? 's' : ''}
              </Text>
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
          </ScrollView>
        </Hoja>
      )}
      </View>
    </View>
  );
}

const makeStyles = (C: Colores) =>
  StyleSheet.create({
    raiz: { flex: 1, backgroundColor: C.bg },
    pantalla: { flex: 1, backgroundColor: C.mapBg, overflow: 'hidden' },
    whereList: { backgroundColor: C.btnBg, borderWidth: 1, borderColor: C.btnBorder, borderRadius: 14, padding: 8, marginRight: 60, elevation: 8 },
    whereOpt: { flexDirection: 'row', alignItems: 'center', gap: 9, padding: 9, borderRadius: 9 },
    resultados: { maxHeight: 280, backgroundColor: C.btnBg, borderWidth: 1, borderColor: C.btnBorder, borderRadius: 14, padding: 6, marginRight: 60, elevation: 8 },
    dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.accent },
    gpsChip: { alignSelf: 'flex-start', backgroundColor: C.btnBg, borderWidth: 1, borderColor: C.btnBorder, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 6, elevation: 3 },
    gpsTxt: { fontSize: 11.5, color: C.dim },
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
    heroFoto: { width: '100%', height: 110, borderRadius: 14, backgroundColor: C.elevated },
  });