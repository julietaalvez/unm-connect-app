import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Image, Keyboard, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, G, Path, Polygon, Rect, Text as SvgText } from 'react-native-svg';

import { Building, BUILDINGS, FIELD, GATES, PATH_D, PATH_POLYGONS, ROADS_D } from '../data/campus';
import { EDIFICIOS_CON_INTERIOR } from '../data/edificios';
import { fotoDeEdificio } from '../data/fotosEdificios';
import { TRANSFORMS } from '../data/unificado';
import { MapaVista, useMapaGestos } from '../lib/MapaZoom';
import { buscarEnTodos } from '../lib/buscadorGlobal';
import { aSvg, puertaMasCercana } from '../lib/calibracion';
import { entradaInterior, GATE_LABELS, ORIGENES, rutaCampus } from '../lib/campusRuta';
import { esOscuro, mezclar } from '../lib/colores';
import { Paso, rutaToPath } from '../lib/interior';
import { rutaGeneral } from '../lib/rutaGeneral';
import { Colores, useTema } from '../lib/tema';
import { useUbicacion } from '../lib/ubicacion';
import HeaderMapa from './HeaderMapa';
import IconoUI from './IconoUI';
import type { LugarInterior } from './InterioresCampus';
import { InterioresCampus, SelectorPiso, ZOOM_INTERIORES } from './InterioresCampus';
import { BarraSuperior, BotonesZoom, Chip, FilaChips, Hoja, subeBotones, useTeclado } from './MapaUI';

// Recuadro del mapa nuevo: entra TODO el campus
const VB_X = -15;
const VB_Y = 25;
const VB_W = 930;
const VB_H = 785;
const ZOOM_MAX = 4;
const ZOOM_INICIAL = 1.3;
const ARRIBA = 120; // lo que tapan el buscador y el chip de arriba
const YO = '__yo__'; // "Mi ubicación" (GPS)

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
type Lugar = { clave: string; label: string; sub?: string; edificio?: string; destino?: { floor: string; id: string }; punto?: { x: number; y: number } };
type Props = { onEnterBuilding?: (id: string, destino?: { floor: string; id: string }, entrada?: string) => void; activo?: boolean;};
type RutaState = { points: { x: number; y: number }[]; pasos: Paso[]; puerta?: string } | null;

export default function CampusMap({ onEnterBuilding, activo = true }: Props) {
  const { C } = useTema();
  const s = useMemo(() => makeStyles(C), [C]);
  const { width, height: winH } = useWindowDimensions();

  const [selected, setSelected] = useState<Building | null>(null);
  const [origen, setOrigen] = useState<string>('entrada-mitre');
  const [whereOpen, setWhereOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [listaAbierta, setListaAbierta] = useState(false);
  const [ruta, setRuta] = useState<RutaState>(null);
  const [errorRuta, setErrorRuta] = useState<string | null>(null);
    // barra "Desde / Hasta"
  const [modoRuta, setModoRuta] = useState(false);
  const [desdeTxt, setDesdeTxt] = useState('');
  const [hastaTxt, setHastaTxt] = useState('');
  const [campo, setCampo] = useState<'desde' | 'hasta' | null>(null);
  const [desde, setDesde] = useState<Lugar | null>(null);
  const [hasta, setHasta] = useState<Lugar | null>(null);
    const [elegirEn, setElegirEn] = useState<'desde' | 'hasta' | null>(null);

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
    const [nivel, setNivel] = useState(0);
      const [aulaSel, setAulaSel] = useState<LugarInterior | null>(null);
  const conInterior = (b: { id: string }) => zoom >= ZOOM_INTERIORES && !!TRANSFORMS['edificio-' + b.id];
  const mapWidth = cardW * zoom;
  const mapHeight = baseH * zoom;
  const scale = mapWidth / VB_W; // píxeles de pantalla por unidad del mapa
    // los planos interiores se redibujan de a saltos (no en cada cuadro del pellizco): el zoom fluye
  const zoomQ = Math.floor(zoom * 5 + 1e-6) / 5;
  const scaleQ = (cardW * zoomQ) / VB_W;
  const onElegirRef = useRef<(l: LugarInterior) => void>(() => {});
   const onEdificioRef = useRef<(id: string, e?: any) => void>(() => {});
  const onElegirEst = useCallback((l: LugarInterior) => onElegirRef.current(l), []);
    const onEdificioEst = useCallback((id: string, e?: any) => onEdificioRef.current(id, e), []);
  onElegirRef.current = (l) => {
    if (modoRuta) ponerLugar(l);
    else { setSelected(null); setAulaSel(l); }
  };
    onEdificioRef.current = (id, e) => {
    if (modoRuta && e) { tocarMapa(e); return; }
    const b = BUILDINGS.find((x) => 'edificio-' + x.id === id);
    if (b) elegir(b);
  };
  const labelPx = Math.min(13, 6.5 + zoom * 1.5); // la letra crece al acercar
  const fontSize = labelPx / scale;
  const radioPunto = 9 / scale;

  const ub = useUbicacion(activo);
  const miPos = useMemo(() => (ub.punto ? aSvg(ub.punto) : null), [ub.punto]);
  const cerca = useMemo(() => (miPos ? puertaMasCercana(miPos) : null), [miPos]);
  const lejos = !!cerca && cerca.metros > 1500;
    const posKey = miPos ? `${Math.round(miPos.x / 4)},${Math.round(miPos.y / 4)}` : '';
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
    // por defecto se sale de donde estás (GPS); si no hay ubicación, de la Entrada Mitre
  function ponerDesdeInicial() {
    if (miPos && !lejos) { setDesde({ clave: YO, label: 'Mi ubicación' }); setDesdeTxt('Mi ubicación'); return; }
    const o = ORIGENES.find((x) => x.id === origen);
    if (o) { setDesde({ clave: o.id, label: o.label }); setDesdeTxt(o.label); }
  }
  function abrirRuta(h?: Building | null) {
    setModoRuta(true);
    setCampo(null);
    setSelected(null);
    limpiarRuta();
    ponerDesdeInicial();
    if (h) { setHasta({ clave: 'edificio-' + h.id, label: h.label }); setHastaTxt(h.label); }
    else { setHasta(null); setHastaTxt(''); }
  }
  // desde el buscador: primero se ve el camino por el campus hasta el edificio del aula
  function abrirRutaA(l: Lugar) {
    setModoRuta(true);
    setCampo(null);
    setSelected(null);
    limpiarRuta();
    ponerDesdeInicial();
    setHasta(l);
    setHastaTxt(l.label);
  }
  function cerrarRuta() {
    setModoRuta(false);
    setCampo(null);
        setElegirEn(null);
    setDesde(null); setHasta(null);
    setDesdeTxt(''); setHastaTxt('');
    limpiarRuta();
  }

  function intercambiar() {
    const d = desde, h = hasta, dt = desdeTxt, ht = hastaTxt;
    setDesde(h); setHasta(d); setDesdeTxt(ht); setHastaTxt(dt);
  }

  function sugerir(texto: string, esDesde: boolean): Lugar[] {
    const t = norm(texto);
    const out: Lugar[] = [];
    if (esDesde && miPos && !lejos) out.push({ clave: YO, label: 'Mi ubicación', sub: 'Tu posición actual (GPS)' });
    if (esDesde) ORIGENES.filter((o) => !t || norm(o.label).includes(t)).forEach((o) => out.push({ clave: o.id, label: o.label, sub: 'Entrada' }));
    if (t) {
      BUILDINGS.filter((b) => norm(b.label).includes(t)).slice(0, 3).forEach((b) => out.push({ clave: 'edificio-' + b.id, label: b.label, sub: 'Edificio' }));
      buscarEnTodos(texto, 6).forEach((r) => out.push({ clave: r.buildingId, label: r.label, edificio: r.edificio, sub: `${r.edificio} · ${r.floor}`, destino: { floor: r.floor, id: r.id } }));
    }
    return out.slice(0, 30);
  }

  function elegirLugar(l: Lugar) {
    if (campo === 'desde') { setDesde(l); setDesdeTxt(l.label); }
    else { setHasta(l); setHastaTxt(l.label); }
    setCampo(null);
    Keyboard.dismiss();
  }
    // pone un lugar en "Desde" o "Hasta" según lo que estés eligiendo
  function ponerLugar(l: Lugar) {
    const donde = elegirEn ?? campo ?? 'hasta';
    if (donde === 'desde') { setDesde(l); setDesdeTxt(l.label); }
    else { setHasta(l); setHastaTxt(l.label); }
    setElegirEn(null);
    setCampo(null);
    Keyboard.dismiss();
  }
  // tocaste un lugar cualquiera del mapa
  function tocarMapa(e: any) {
    const { locationX, locationY } = e.nativeEvent;
    ponerLugar({ clave: '__punto__', label: 'Punto elegido en el mapa', punto: { x: VB_X + locationX / scale, y: VB_Y + locationY / scale } });
  }

  // cuando están los dos lugares, se traza sola la ruta
  useEffect(() => {
    if (!modoRuta) return;
    if (desde && hasta) {
                const ext = (l: Lugar) => ({
        punto: l.punto,
        clave: /^(edificio-|entrada-|__)/.test(l.clave) ? l.clave : 'edificio-' + l.clave,
        label: l.label, edificio: l.edificio, destino: l.destino,
      });
      const r =
        desde.clave === YO
          ? miPos
            ? rutaGeneral({ punto: miPos, label: 'Mi ubicación', gps: true }, ext(hasta))
            : { error: 'Todavía no tenemos tu ubicación. Elegí desde dónde salís.' }
          : rutaGeneral(ext(desde), ext(hasta));
      if ('error' in r) { setRuta(null); setErrorRuta(r.error); }
      else { setErrorRuta(null); setRuta(r); }
    } else {
      limpiarRuta();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [desde, hasta, modoRuta, posKey]);
  function elegir(b: Building) {
    if (modoRuta) { ponerLugar({ clave: 'edificio-' + b.id, label: b.label }); return; }
    setSelected(b);
    setAulaSel(null);
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
  const lista = campo ? sugerir(campo === 'desde' ? desdeTxt : hastaTxt, campo === 'desde') : [];
  const rutaAbierta = modoRuta && !!(ruta || errorRuta);
  const intr = hasta && !hasta.destino ? idInterior(hasta.clave) : undefined;

  const pasosUI = ruta && ruta.pasos.length > 0 && (
    <View style={{ marginTop: 8, gap: 8 }}>
      {ruta.pasos.map((paso, i) => (
        <View key={i} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
          <View style={s.stepN}>
            <Text style={{ fontSize: 10, fontWeight: '700', color: C.text }}>{i + 1}</Text>
          </View>
          <Text style={{ flex: 1, fontSize: 12.5, color: C.dim }}>
            {paso.map((seg, j) => (
              <Text key={j} style={seg.b ? { color: C.text, fontWeight: '600' } : undefined}>{seg.t}</Text>
            ))}
          </Text>
        </View>
      ))}
    </View>
  );

  const panelRuta = (
    <View style={s.rutaCard}>
      <View style={s.rutaFila}>
        <View style={s.rutaGuia}>
          <View style={[s.rutaPunto, { backgroundColor: C.mapAccent }]} />
          <View style={s.rutaLinea} />
          <View style={[s.rutaPunto, { backgroundColor: C.accent }]} />
        </View>
        <View style={{ flex: 1, gap: 6 }}>
          <TextInput
            value={desdeTxt}
            onFocus={() => setCampo('desde')}
            onChangeText={(t) => { setDesdeTxt(t); setDesde(null); setCampo('desde'); }}
            placeholder="Desde: entrada, edificio o aula"
            placeholderTextColor={C.placeholder}
            style={s.rutaInput}
          />
          <TextInput
            value={hastaTxt}
            onFocus={() => setCampo('hasta')}
            onChangeText={(t) => { setHastaTxt(t); setHasta(null); setCampo('hasta'); }}
            placeholder="Hasta: edificio o aula"
            placeholderTextColor={C.placeholder}
            style={s.rutaInput}
          />
        </View>
        <View style={{ gap: 6 }}>
          <Pressable onPress={intercambiar} hitSlop={8} style={s.rutaBtn}><Text style={s.rutaBtnTxt}>⇅</Text></Pressable>
          <Pressable onPress={cerrarRuta} hitSlop={8} style={s.rutaBtn}><Text style={s.rutaBtnTxt}>✕</Text></Pressable>
        </View>
      </View>
           {elegirEn && (
        <Text style={{ fontSize: 12, color: C.dim, marginTop: 6 }}>
          {elegirEn === 'desde' ? 'Tocá en el mapa desde dónde salís' : 'Tocá en el mapa adónde querés llegar'}
        </Text>
      )}
      {!!campo && (
        <ScrollView style={{ maxHeight: 260, marginTop: 6 }} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
          <Pressable style={s.whereOpt} onPress={() => { setElegirEn(campo); setCampo(null); Keyboard.dismiss(); }}>
            <View style={s.dot} />
            <Text style={{ fontSize: 13, fontWeight: '600', color: C.text }}>Elegir en el mapa</Text>
          </Pressable>
          {lista.map((l, i) => (
            <Pressable key={l.clave + (l.destino?.id ?? '') + i} style={s.whereOpt} onPress={() => elegirLugar(l)}>
              <View style={s.dot} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: C.text }} numberOfLines={1}>{l.label}</Text>
                {!!l.sub && <Text style={{ fontSize: 11, color: C.dim }}>{l.sub}</Text>}
              </View>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
  const gateSize = fontSize;
  const corvTx = 36.3 - 7 / scale - gateSize * 0.5;

  return (
    <View style={s.raiz}>
      <HeaderMapa />
      <View style={s.pantalla} onLayout={(e) => setCaja({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
      {/* el mapa, a pantalla completa */}
      <MapaVista m={m} viewW={cardW} viewH={viewH} baseW={cardW} baseH={baseH} arriba={ARRIBA}>
          <Svg width={mapWidth} height={mapHeight} viewBox={`${VB_X} ${VB_Y} ${VB_W} ${VB_H}`}>
                        <G onPress={modoRuta ? tocarMapa : undefined}>
            <Rect x={VB_X} y={VB_Y} width={VB_W} height={VB_H} fill="#000" fillOpacity={0} />
            {/* 1. terreno (contorno de la universidad) */}
            <Path d={PATH_D} fill={C.paths} opacity={0.45} stroke={C.bldgStroke} strokeWidth={1 / scale} />
            {PATH_POLYGONS.map((p, i) => (
              <Polygon key={`t${i}`} points={p} fill={C.paths} opacity={0.45} stroke={C.bldgStroke} strokeWidth={1 / scale} />
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
                fillOpacity={conInterior(b) ? 0.01 : 1}
                stroke={selected?.id === b.id ? C.bldgSelStroke : C.bldgStroke}
                strokeOpacity={conInterior(b) && selected?.id !== b.id ? 0 : 1}
                strokeWidth={1 / scale}
                onPress={modoRuta ? tocarMapa : () => elegir(b)}
              />
            ))}
  
                           <InterioresCampus C={C} scale={scaleQ} zoom={zoomQ} nivel={nivel} verde={VERDE} onElegir={onElegirEst} onEdificio={onEdificioEst} />
  
            {ruta && (
              <Path
                d={rutaToPath(ruta.points)}
                fill="none"
                stroke={C.route}
                strokeWidth={1.4 / scale}
                strokeDasharray={`${4 / scale} ${3 / scale}`}
                strokeLinecap="round"
                pointerEvents="none"
              />
            )}
                        {desde?.punto && <Circle cx={desde.punto.x} cy={desde.punto.y} r={radioPunto * 1.3} fill={C.mapAccent} stroke="#ffffff" strokeWidth={radioPunto * 0.35} pointerEvents="none" />}
            {hasta?.punto && <Circle cx={hasta.punto.x} cy={hasta.punto.y} r={radioPunto * 1.3} fill={C.accent} stroke="#ffffff" strokeWidth={radioPunto * 0.35} pointerEvents="none" />}
  
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
                        </G>
          </Svg>
     </MapaVista>
      <SelectorPiso C={C} nivel={nivel} onCambiar={setNivel} visible={zoom >= ZOOM_INTERIORES && !modoRuta} />

      {/* arriba, flotando: buscador y "estás en" */}
      <BarraSuperior value={query} onChange={buscar} placeholder="Buscar edificio o aula (ej: Aula 5)" sinBuscador={modoRuta}>
                {modoRuta && panelRuta}
        {!modoRuta && (
          <FilaChips>
            <Chip texto="Cómo llegar" icono={<IconoUI nombre="ubicacion" size={14} />} onPress={() => abrirRuta()} />
          </FilaChips>
        )}
        {!!textoGps && !modoRuta && (
          <View style={s.gpsChip}>
            <Text style={s.gpsTxt}>{textoGps}</Text>
          </View>
        )}
        {hayLista && !modoRuta && (
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
                  setQuery('');
                  Keyboard.dismiss();
                  abrirRutaA({ clave: r.buildingId, label: r.label, edificio: r.edificio, sub: `${r.edificio} · ${r.floor}`, destino: { floor: r.floor, id: r.id } });
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

      <BotonesZoom onMas={() => m.zoomPor(1.6)} onMenos={() => m.zoomPor(1 / 1.6)} desplaza={(selected || aulaSel || rutaAbierta) && !teclado ? subeBotones(progHoja, alturaHoja) : undefined} />
      {rutaAbierta && !teclado && (
        <Hoja progreso={progHoja} key="ruta" resumen={`${desdeTxt} → ${hastaTxt}`} onCerrar={cerrarRuta} onLayoutAlto={setAlturaHoja}>
          <ScrollView style={{ maxHeight: winH * 0.5 }} nestedScrollEnabled showsVerticalScrollIndicator={false}>
            <Text style={s.infoTitle}>{hasta?.edificio ?? hasta?.label}</Text>
            <Text style={s.infoSub}>{`Desde ${desde?.edificio ?? desde?.label}`}</Text>
            {errorRuta && (
              <View style={s.noteCard}>
                <Text style={{ color: C.dim, fontSize: 12 }}>{errorRuta}</Text>
              </View>
            )}
            {pasosUI}
            {hasta?.destino && (
              <Pressable style={s.primaryBtn} onPress={() => onEnterBuilding?.(hasta.clave, hasta.destino, entradaInterior(ruta?.puerta))}>
                <Text style={s.primaryBtnText}>{`Ver ${hasta.label} en el plano  →`}</Text>
              </Pressable>
            )}
            {intr && (
              <Pressable style={s.primaryBtn} onPress={() => onEnterBuilding?.(intr, undefined, entradaInterior(ruta?.puerta))}>
                <Text style={s.primaryBtnText}>Ver mapa interior  →</Text>
              </Pressable>
            )}
          </ScrollView>
        </Hoja>
      )}
            {aulaSel && !selected && !rutaAbierta && !teclado && (
        <Hoja progreso={progHoja} key={'aula' + aulaSel.destino.id} resumen={aulaSel.label} onCerrar={() => setAulaSel(null)} onLayoutAlto={setAlturaHoja}>
          <ScrollView style={{ maxHeight: winH * 0.5 }} nestedScrollEnabled showsVerticalScrollIndicator={false}>
            <Text style={s.infoTitle}>{aulaSel.label}</Text>
            <Text style={s.infoSub}>{`${aulaSel.edificio} · ${aulaSel.sub}`}</Text>
            <Pressable style={s.primaryBtn} onPress={() => onEnterBuilding?.(aulaSel.clave, aulaSel.destino)}>
              <Text style={s.primaryBtnText}>Ver en el mapa interior  →</Text>
            </Pressable>
            <Pressable style={s.secondaryBtn} onPress={() => { const l = aulaSel; setAulaSel(null); abrirRutaA(l); }}>
              <Text style={s.secondaryBtnText}>Cómo llegar</Text>
            </Pressable>
          </ScrollView>
        </Hoja>
      )}
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

           <Pressable style={s.secondaryBtn} onPress={() => abrirRuta(selected)}>
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
        rutaCard: { backgroundColor: C.btnBg, borderWidth: 1, borderColor: C.btnBorder, borderRadius: 16, padding: 10, elevation: 8 },
    rutaFila: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    rutaGuia: { alignItems: 'center', width: 14, gap: 3 },
    rutaPunto: { width: 10, height: 10, borderRadius: 5 },
    rutaLinea: { width: 2, height: 22, backgroundColor: C.btnBorder },
    rutaInput: { height: 38, borderRadius: 10, backgroundColor: C.elevated, paddingHorizontal: 10, fontSize: 13, color: C.text },
    rutaBtn: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: C.elevated },
    rutaBtnTxt: { fontSize: 14, fontWeight: '700', color: C.text },
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