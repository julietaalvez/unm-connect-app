import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import Svg, { Circle, G, Path, Text as SvgText } from 'react-native-svg';
import { AMENITIES, Comodidades, EDIFICIOS, NOTES, Piso, SCHEDULE } from '../data/edificios';
import { fotoDeEdificio } from '../data/fotosEdificios';
import { TAM_ICONO, TipoIcono, centroVisual, tipoIcono } from '../data/iconos';
import { cargarAulas } from '../lib/api';
import {
  Ruta,
  Ubicacion,
  buscarEspacio,
  calcularRuta,
  classify,
  labelFor,
  mostrarCartel,
  pointById,
  puntoInicial,
  rutaToPath,
  typeLabel,
} from '../lib/interior';
import { Colores, useTema } from '../lib/tema';
import HeaderMapa from './HeaderMapa';
import IconoEspacio from './IconoEspacio';

const fillDe = (C: Colores) => ({
  aula: { fill: C.aulaFill, stroke: C.aulaStroke, selFill: C.aulaSel, selStroke: C.aulaSelStroke },
  bano: { fill: C.banoFill, stroke: C.banoStroke, selFill: C.banoSel, selStroke: C.banoSelStroke },
  serv: { fill: C.servFill, stroke: C.servStroke, selFill: C.servSel, selStroke: C.servSelStroke },
  muted: { fill: C.mutedFill, stroke: C.mutedStroke, selFill: C.mutedFill, selStroke: C.mutedStroke },
});

function useEstilos() {
  const { C } = useTema();
  const s = useMemo(() => makeStyles(C), [C]);
  return { C, s };
}

const LABEL_PX = 13; // tamaño de los nombres en pantalla, sin importar el zoom

// Ajusta el viewBox al dibujo real (con un margen) para que no sobre espacio vacío
function viewBoxAjustado(piso: Piso): string {
  const PAD = 20; // margen; también deja lugar al círculo de "estás acá"
  let x1 = Infinity;
  let y1 = Infinity;
  let x2 = -Infinity;
  let y2 = -Infinity;
  for (const sh of piso.shapes) {
    x1 = Math.min(x1, sh.x);
    y1 = Math.min(y1, sh.y);
    x2 = Math.max(x2, sh.x + sh.w);
    y2 = Math.max(y2, sh.y + sh.h);
  }
  for (const p of piso.points) {
    x1 = Math.min(x1, p.x - PAD);
    y1 = Math.min(y1, p.y - PAD);
    x2 = Math.max(x2, p.x + PAD);
    y2 = Math.max(y2, p.y + PAD);
  }
  if (!isFinite(x1)) return piso.viewBox; // por las dudas
  return `${x1 - PAD} ${y1 - PAD} ${x2 - x1 + PAD * 2} ${y2 - y1 + PAD * 2}`;
}

type Props = { buildingId: string; onBack: () => void };

export default function BuildingInterior({ buildingId, onBack }: Props) {
  const { C, s } = useEstilos();
  const FILL = fillDe(C);
  const ed = EDIFICIOS[buildingId];
  const { width: winW } = useWindowDimensions();
  const pisos = Object.keys(ed.floors);

  // foto del edificio (la misma que se ve en el mapa del campus)
  const foto = fotoDeEdificio(buildingId, ed.name) ?? fotoDeEdificio(buildingId.replace('edificio-', ''), ed.name);

  const [floor, setFloor] = useState(pisos[0]);
  const [mi, setMi] = useState<Ubicacion>(() => puntoInicial(ed));
  const [selId, setSelId] = useState<string | null>(null);
  const [ruta, setRuta] = useState<Ruta | null>(null);
  const [whereOpen, setWhereOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [zoom, setZoom] = useState(winW < 600 ? 2.4 : 1);
  const [mapW, setMapW] = useState(Math.max(280, Math.min(winW, 900) - 60));

  const scrollRef = useRef<ScrollView>(null);
  const pantallaRef = useRef<ScrollView>(null);
  const scrollX = useRef(0);

  const piso = ed.floors[floor];
  const viewBox = viewBoxAjustado(piso);
  const [vx, vy, vw, vh] = viewBox.split(' ').map(Number);
  const svgW = mapW * zoom;
  const svgH = (svgW * vh) / vw;
  const k = svgW / vw; // píxeles por unidad del plano
  const fs = LABEL_PX / k; // tamaño de letra en unidades del plano

  // íconos de baños, escaleras y ascensor: posición y tamaño de cada uno (se recalcula solo al cambiar de piso)
  const iconos = useMemo(
    () =>
      piso.shapes.flatMap((sh) => {
        const tipo = tipoIcono(sh.id);
        if (!tipo) return [];
        const c = centroVisual(sh, buildingId);
        const size = Math.min(TAM_ICONO[tipo], c.r * 2.4); // nunca más grande que el espacio
        return [{ id: sh.id, tipo: tipo as TipoIcono, x: c.x, y: c.y, size }];
      }),
    [piso, buildingId],
  );

  // al cambiar de piso, centrar el plano
  useEffect(() => {
    const id = setTimeout(() => scrollRef.current?.scrollTo({ x: Math.max(0, (svgW - mapW) / 2), animated: false }), 30);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [floor, mapW]);

  function cambiarZoom(factor: number) {
    const nuevo = Math.max(1, Math.min(4.5, zoom * factor));
    const fx = (scrollX.current + mapW / 2) / svgW;
    setZoom(nuevo);
    setTimeout(() => scrollRef.current?.scrollTo({ x: fx * mapW * nuevo - mapW / 2, animated: false }), 0);
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  }

  function elegirPiso(f: string) {
    setFloor(f);
    setSelId(null);
    setRuta(null);
  }

  function elegirEspacio(id: string) {
    setSelId(id);
    setRuta(null);
    // baja hasta la ficha del espacio
    setTimeout(() => pantallaRef.current?.scrollToEnd({ animated: true }), 80);
  }

  function buscar(texto: string) {
    setQuery(texto);
    const r = buscarEspacio(ed, texto);
    if (!r) return;
    if (r.floor !== floor) {
      setFloor(r.floor);
      showToast(`${labelFor(r.forma.id)} está en ${r.floor} — te llevamos ahí`);
    }
    elegirEspacio(r.forma.id);
  }

  const forma = piso.shapes.find((s) => s.id === selId) ?? null;
  const miPunto = pointById(ed, mi.floor, mi.pointId);
  const puntoEnEstePiso = mi.floor === floor ? miPunto : null;

  function comoLlegar() {
    if (!forma) return;
    setRuta(calcularRuta(ed, mi, floor, forma, labelFor(forma.id) || forma.id));
    // baja para ver los pasos de la ruta
    setTimeout(() => pantallaRef.current?.scrollToEnd({ animated: true }), 80);
  }

  /* ---------------- UI ---------------- */
  return (
    <ScrollView
      ref={pantallaRef}
      style={s.screen}
      contentContainerStyle={{ paddingBottom: 40 }}
      contentInsetAdjustmentBehavior="never"
    >
      <HeaderMapa onBack={onBack} />
      <Text style={s.subtitle}>{ed.name} · Planos reales</Text>

      {/* buscador */}
      <View style={s.search}>
        <Text style={{ color: '#8ea0c2' }}>🔍</Text>
        <TextInput
          value={query}
          onChangeText={buscar}
          placeholder="Buscar aula (ej: Aula 13)"
          placeholderTextColor={C.placeholder}
          style={s.searchInput}
        />
      </View>

      {/* pisos */}
      <View style={s.tabs}>
        {pisos.map((f) => (
          <Pressable key={f} onPress={() => elegirPiso(f)} style={[s.tab, f === floor && s.tabActive]}>
            <Text style={[s.tabText, f === floor && { color: C.onAccent }]}>{f}</Text>
          </Pressable>
        ))}
      </View>

      {/* estás en */}
      <Pressable style={s.whereBtn} onPress={() => setWhereOpen((o) => !o)}>
        <Text style={{ color: C.dim, fontSize: 12.5, flex: 1 }}>
          📍 Estás en: <Text style={{ color: C.text, fontWeight: '600' }}>{`${miPunto.label} · ${mi.floor}`}</Text>
        </Text>
        <Text style={{ color: C.dim }}>{whereOpen ? '▴' : '▾'}</Text>
      </Pressable>
      {whereOpen && (
        <View style={s.whereList}>
          {pisos.map((f) => {
            const pts = ed.floors[f].points.filter((p) => p.selectable !== false);
            if (!pts.length) return null;
            return (
              <View key={f}>
                <Text style={s.whereHeader}>{f}</Text>
                {pts.map((p) => {
                  const activo = f === mi.floor && p.id === mi.pointId;
                  return (
                    <Pressable
                      key={p.id}
                      style={[s.whereOpt, activo && { backgroundColor: C.elevated }]}
                      onPress={() => {
                        setMi({ floor: f, pointId: p.id });
                        setWhereOpen(false);
                        elegirPiso(f);
                      }}
                    >
                      <View style={s.dot} />
                      <Text style={[{ fontSize: 12.5, color: C.text }, activo && { color: C.pillTypeText, fontWeight: '600' }]}>{p.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            );
          })}
        </View>
      )}

      {/* mapa */}
      <View style={s.mapWrap} onLayout={(e) => setMapW(e.nativeEvent.layout.width - 24)}>
        {toast && (
          <View style={s.toast}>
            <Text style={s.toastText}>{toast}</Text>
          </View>
        )}
        <View style={s.floorLabelRow}>
          <Text style={s.floorLabel}>{floor}</Text>
          <Text style={s.floorLabel}>{piso.shapes.filter((x) => classify(x.id) !== 'muted').length} espacios</Text>
        </View>

        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={32}
          onScroll={(e: NativeSyntheticEvent<NativeScrollEvent>) => (scrollX.current = e.nativeEvent.contentOffset.x)}
          style={{ borderRadius: 14 }}
        >
          <View style={{ width: svgW, height: svgH }}>
            <Svg width={svgW} height={svgH} viewBox={viewBox}>
              {/* espacios */}
              <G>
                {piso.shapes.map((sh) => {
                  const tipo = classify(sh.id);
                  const st = FILL[tipo];
                  const sel = sh.id === selId;
                  return (
                    <Path
                      key={sh.id}
                      d={sh.d}
                      fill={sel ? st.selFill : st.fill}
                      stroke={sel ? st.selStroke : st.stroke}
                      strokeWidth={tipo === 'muted' ? 0.6 : 1.2}
                      pointerEvents={tipo === 'muted' ? 'none' : 'auto'}
                      onPress={tipo === 'muted' ? undefined : () => elegirEspacio(sh.id)}
                    />
                  );
                })}
              </G>

              {/* ruta */}
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

              {/* "estás acá" */}
              {puntoEnEstePiso && (
                <G pointerEvents="none">
                  <Circle cx={puntoEnEstePiso.x} cy={puntoEnEstePiso.y} r={9} fill="#4f8ef7" />
                  <Circle cx={puntoEnEstePiso.x} cy={puntoEnEstePiso.y} r={15} fill="none" stroke="#4f8ef7" strokeWidth={2} opacity={0.5} />
                </G>
              )}

              {/* carteles (con halo blanco para que se lean sobre cualquier color) */}
              <G pointerEvents="none">
                {piso.shapes.map((sh) => {
                  if (!mostrarCartel(sh.id)) return null;
                  if (tipoIcono(sh.id)) return null; // baños, escaleras y ascensor se muestran con su ícono
                  const tipo = classify(sh.id);
                  const label = labelFor(sh.id)!;
                  const conClase = !!SCHEDULE[sh.id];
                  const y = (conClase ? sh.cy - fs * 0.35 : sh.cy) + fs * 0.35; // +0.35 = centrado vertical
                  return (
                    <G key={'t' + sh.id}>
                      <SvgText x={sh.cx} y={y} fontSize={fs} fontWeight="700" textAnchor="middle" fill="none" stroke={C.halo} strokeWidth={fs * 0.2} strokeLinejoin="round">
                        {label}
                      </SvgText>
                      <SvgText x={sh.cx} y={y} fontSize={fs} fontWeight="700" textAnchor="middle" fill={C.label}>
                        {label}
                      </SvgText>
                      {(conClase || tipo === 'aula') && (
                        <Circle cx={sh.cx} cy={y - fs * 0.35 + fs * 0.95} r={Math.max(3, fs * 0.2)} fill={conClase ? '#f5a35c' : '#4fd18a'} />
                      )}
                    </G>
                  );
                })}
              </G>
            </Svg>

            {/* íconos (PNG) encima del plano; no bloquean los toques */}
            <View style={StyleSheet.absoluteFill} pointerEvents="none">
              {iconos.map((ic) => (
                <IconoEspacio key={ic.id} tipo={ic.tipo} x={ic.x} y={ic.y} size={ic.size} vbX={vx} vbY={vy} k={k} color={C.icon} />
              ))}
            </View>
          </View>
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
        {!forma ? (
          <Text style={s.infoEmpty}>Tocá un espacio en el mapa para ver su información.</Text>
        ) : (
          <FichaEspacio
            nombreEdificio={ed.name}
            foto={foto}
            piso={floor}
            id={forma.id}
            ruta={ruta}
            onComoLlegar={comoLlegar}
          />
        )}
      </View>
    </ScrollView>
  );
}

/* ---------- ficha de un espacio ---------- */
function FichaEspacio({
  nombreEdificio,
  foto,
  piso,
  id,
  ruta,
  onComoLlegar,
}: {
  nombreEdificio: string;
  foto?: any;
  piso: string;
  id: string;
  ruta: Ruta | null;
  onComoLlegar: () => void;
}) {
  const { C, s } = useEstilos();
  const tipo = classify(id);
  const label = labelFor(id) || id;
  const clase = SCHEDULE[id];
  const nota = NOTES[id];
  const [todas, setTodas] = useState<Record<string, Comodidades>>(AMENITIES);
  useEffect(() => {
    let vivo = true;
    cargarAulas().then((r) => vivo && setTodas(r));
    return () => {
      vivo = false;
    };
  }, []);
  const am = todas[id];

  return (
    <View>
      <View style={s.roomHeader}>
        <View style={{ flex: 1, gap: 1 }}>
          <Text style={s.bldgName}>{nombreEdificio}</Text>
          <Text style={s.roomTitle}>{label}</Text>
          <Text style={s.where}>{piso}</Text>
          {tipo === 'aula' ? (
            <View style={[s.pill, { backgroundColor: clase ? C.busyBg : C.freeBg }]}>
              <Text style={[s.pillText, { color: clase ? C.busy : C.free }]}>{clase ? 'Con clase' : 'Libre ahora'}</Text>
            </View>
          ) : (
            <View style={[s.pill, { backgroundColor: C.pillTypeBg }]}>
              <Text style={[s.pillText, { color: C.pillTypeText }]}>{typeLabel(tipo)}</Text>
            </View>
          )}
        </View>
        {foto && <Image source={foto} style={s.photo} resizeMode="cover" />}
      </View>

      {clase && (
        <View style={s.card}>
          <Text style={{ fontWeight: '600', color: C.text, marginBottom: 3 }}>{clase.subject}</Text>
          <Text style={{ color: C.dim, fontSize: 12.5 }}>{`${clase.time} · Prof. ${clase.prof}`}</Text>
        </View>
      )}

      {tipo === 'aula' &&
        (am ? (
          <View style={s.amenities}>
            <Chip ic="🔌" txt={`${am.enchufes} enchufes`} />
            <Chip ic="📶" txt="Wifi" off={!am.wifi} />
            <Chip ic="📽️" txt="Proyector" off={!am.proyector} />
            <Chip ic="♿" txt="Accesible" off={!am.accesible} />
            <Chip ic="👥" txt={`${am.capacidad} pers.`} />
          </View>
        ) : (
          <View style={s.card}>
            <Text style={{ color: C.dim, fontSize: 12 }}>Todavía no cargamos los datos de enchufes/wifi de esta aula.</Text>
          </View>
        ))}

      {nota && (
        <View style={s.card}>
          <Text style={{ color: C.dim, fontSize: 12 }}>{nota}</Text>
        </View>
      )}

      <Pressable style={s.goBtn} onPress={onComoLlegar}>
        <Text style={s.goBtnText}>Cómo llegar</Text>
      </Pressable>

      {ruta && (
        <View style={{ marginTop: 12, gap: 8 }}>
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
    </View>
  );
}

function Chip({ ic, txt, off }: { ic: string; txt: string; off?: boolean }) {
  const { C, s } = useEstilos();
  return (
    <View style={[s.chip, off && { opacity: 0.35 }]}>
      <Text style={{ fontSize: 13 }}>{ic}</Text>
      <Text style={[{ fontSize: 11.5, color: C.text }, off && { textDecorationLine: 'line-through' }]}>{txt}</Text>
    </View>
  );
}

/* ---------- estilos ---------- */
const makeStyles = (C: Colores) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  subtitle: { fontSize: 11, color: C.dim, marginHorizontal: 18, marginBottom: 10 },
  search: { marginHorizontal: 18, marginBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.panel2, borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
  searchInput: { flex: 1, fontSize: 14, color: C.text, padding: 0 },
  tabs: { flexDirection: 'row', gap: 6, paddingHorizontal: 18, marginBottom: 12 },
  tab: { backgroundColor: C.panel2, borderWidth: 1, borderColor: C.border, paddingVertical: 7, paddingHorizontal: 14, borderRadius: 20 },
  tabActive: { backgroundColor: C.accent, borderColor: C.accent },
  tabText: { fontSize: 12.5, fontWeight: '600', color: C.dim },
  whereBtn: { marginHorizontal: 18, marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.panel2, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 10 },
  whereList: { marginHorizontal: 18, marginBottom: 10, backgroundColor: C.panel2, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 8 },
  whereHeader: { fontSize: 10.5, color: C.dim, paddingHorizontal: 9, paddingTop: 7, paddingBottom: 3, textTransform: 'uppercase', letterSpacing: 0.4 },
  whereOpt: { flexDirection: 'row', alignItems: 'center', gap: 9, padding: 9, borderRadius: 9 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.accent },
  mapWrap: { marginHorizontal: 18, backgroundColor: C.mapBg, borderWidth: 1, borderColor: C.mapBorder, borderRadius: 22, padding: 12, paddingTop: 14 },
  floorLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  floorLabel: { fontSize: 11.5, fontWeight: '600', color: C.floorLabel },
  toast: { position: 'absolute', top: 8, alignSelf: 'center', zIndex: 5, backgroundColor: C.toastBg, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, elevation: 6 },
  toastText: { fontSize: 12, fontWeight: '600', color: C.toastText },
  zoomCtl: { position: 'absolute', right: 20, bottom: 20, gap: 8 },
  zoomBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: C.btnBg, borderWidth: 1, borderColor: C.btnBorder, alignItems: 'center', justifyContent: 'center', elevation: 3 },
  zoomTxt: { fontSize: 22, color: C.text, lineHeight: 24 },
  info: { margin: 18, marginBottom: 0, backgroundColor: C.panel2, borderWidth: 1, borderColor: C.border, borderRadius: 18, padding: 16 },
  infoEmpty: { color: C.dim, fontSize: 13, textAlign: 'center', padding: 20, lineHeight: 20 },
  roomHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  bldgName: { fontSize: 16, fontWeight: '700', color: C.text },
  roomTitle: { fontSize: 16, fontWeight: '700', color: C.text },
  where: { fontSize: 12.5, color: C.dim, marginBottom: 6 },
  pill: { alignSelf: 'flex-start', paddingVertical: 4, paddingHorizontal: 9, borderRadius: 20 },
  pillText: { fontSize: 10.5, fontWeight: '600' },
  photo: { width: 112, height: 80, borderRadius: 14, backgroundColor: C.elevated },
  card: { backgroundColor: C.elevated, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 11, marginTop: 10 },
  amenities: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: C.elevated, borderWidth: 1, borderColor: C.border, borderRadius: 20, paddingVertical: 5, paddingHorizontal: 10 },
  goBtn: { marginTop: 12, backgroundColor: C.accent, borderRadius: 14, padding: 14, alignItems: 'center' },
  goBtnText: { color: C.onAccent, fontWeight: '700', fontSize: 14 },
  stepN: { width: 18, height: 18, borderRadius: 9, backgroundColor: C.elevated, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
});