import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions
} from 'react-native';
import Svg, { Circle, G, Path, Text as SvgText } from 'react-native-svg';
import { AMENITIES, Comodidades, EDIFICIOS, NOTES, Piso, SCHEDULE } from '../data/edificios';
import { fotoDeEdificio, fotoDeEspacio } from '../data/fotosEdificios';
import { TAM_ICONO, TipoIcono, centroVisual, tipoIcono } from '../data/iconos';
import type { NombreIcono } from '../data/iconosUI';
import { cargarAulas } from '../lib/api';
import { esOscuro, mezclar } from '../lib/colores';
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
import { MapaVista, useMapaGestos } from '../lib/MapaZoom';
import { Colores, useTema } from '../lib/tema';
import HeaderMapa from './HeaderMapa';
import IconoEspacio from './IconoEspacio';
import IconoUI from './IconoUI';
import { BarraSuperior, BotonesZoom, Chip as ChipMapa, FilaChips, Hoja, subeBotones, useTeclado } from './MapaUI';
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

const LABEL_PX = 12; // tamaño de los nombres en pantalla, sin importar el zoom

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

type Props = { buildingId: string; onBack: () => void; inicial?: { floor: string; id: string } };

export default function BuildingInterior({ buildingId, onBack, inicial }: Props) {
  const { C, s } = useEstilos();
  const FILL = fillDe(C);
  const oscuro = esOscuro(C.bg);
  // colores del plano: verde más suave, pasillos claros, espacios "nulos" grises
  const VERDE = oscuro ? mezclar(C.field, C.mapBg, 0.3) : mezclar(C.field, '#ffffff', 0.5);
  const PASILLO = oscuro ? { fill: '#3a3f4d', stroke: '#4a5062' } : { fill: '#f3eee2', stroke: '#e0d8c4' };
  const NULO = oscuro ? { fill: '#4b505c', stroke: '#5d6371' } : { fill: '#cfd2d9', stroke: '#b3b8c3' };

  const ed = EDIFICIOS[buildingId];
  const { height: winH } = useWindowDimensions();
  const pisos = Object.keys(ed.floors);

  // foto del edificio (la misma que se ve en el mapa del campus)
  const foto = fotoDeEdificio(buildingId, ed.name) ?? fotoDeEdificio(buildingId.replace('edificio-', ''), ed.name);

  // si venís de buscar un espacio en el campus, abre en su piso y lo deja elegido
  const destino = inicial && ed.floors[inicial.floor]?.shapes.some((x) => x.id === inicial.id) ? inicial : null;
  const destinoRef = useRef(destino);
  const [floor, setFloor] = useState(destino?.floor ?? pisos[0]);
  const [mi, setMi] = useState<Ubicacion>(() => puntoInicial(ed));
  const [selId, setSelId] = useState<string | null>(destino?.id ?? null);
  const [ruta, setRuta] = useState<Ruta | null>(null);
  const [whereOpen, setWhereOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [alturaHoja, setAlturaHoja] = useState(0);
  const progHoja = useRef(new Animated.Value(1)).current; // 1 = ficha abierta, 0 = bajada
  const zb = ed.zoomBase ?? 1; // edificios con espacios chicos arrancan con más zoom
  const zInicial = 1.8 * zb; // zoom de arranque (antes era mucho más cerca)

  // el mapa ocupa toda la pantalla: se mide el espacio disponible
  const [caja, setCaja] = useState({ w: 360, h: 640 });
    const teclado = useTeclado();
  // el alto "de verdad" (sin teclado): así el plano no se recentra cuando se abre el teclado
  const hEstable = useRef(caja.h);
  if (!teclado) hEstable.current = caja.h;
  const mapW = caja.w;
  const viewH = caja.h;

  const piso = ed.floors[floor];
  const viewBox = viewBoxAjustado(piso);
  const [vx, vy, vw, vh] = viewBox.split(' ').map(Number);
  const baseH = (mapW * vh) / vw;
  const m = useMapaGestos(zInicial, { viewW: mapW, viewH, baseW: mapW, baseH, min: 1, max: 3 * zb });
  const zoom = m.zoom;
  const svgW = mapW * zoom;
  const svgH = baseH * zoom;
  const k = svgW / vw; // píxeles por unidad del plano
  const fs = LABEL_PX / (svgW / vw); // mismo tamaño de letra en todos los edificios

  // íconos de baños, escaleras y ascensor: posición y tamaño de cada uno (se recalcula solo al cambiar de piso)
  const iconos = useMemo(
    () =>
      piso.shapes.flatMap((sh) => {
        const tipo = tipoIcono(sh.id);
        if (!tipo) return [];
        // Histórico: el ícono va justo en el centro del espacio; el resto usa su ajuste de siempre
        const c = ed.zoomBase != null
          ? { x: sh.cx, y: sh.cy, r: Math.min(sh.w, sh.h) / 2 }
          : centroVisual(sh, buildingId);
        const size = Math.min(TAM_ICONO[tipo], c.r * 2.4); // nunca más grande que el espacio
        return [{ id: sh.id, tipo: tipo as TipoIcono, x: c.x, y: c.y, size }];
      }),
    [piso, buildingId],
  );

  const forma = piso.shapes.find((x) => x.id === selId) ?? null;
  const miPunto = pointById(ed, mi.floor, mi.pointId);
  const puntoEnEstePiso = mi.floor === floor ? miPunto : null;

  // al abrir o cambiar de piso: acercar y centrar donde estás parado
  useEffect(() => {
    const obj = destinoRef.current && destinoRef.current.floor === floor ? piso.shapes.find((x) => x.id === destinoRef.current!.id) : null;
    const p = obj ? { x: obj.cx, y: obj.cy } : mi.floor === floor ? miPunto : piso.points[0] ?? null; // en otro piso: arranca en una escalera
    const px = p ? ((p.x - vx) / vw) * mapW : mapW / 2;
    const py = p ? ((p.y - vy) / vh) * baseH : baseH / 2;
    m.centrarEn(zInicial, px, py);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [floor, mapW, hEstable.current]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  }

  function elegirPiso(f: string) {
    destinoRef.current = null;
    setFloor(f);
    setSelId(null);
    setRuta(null);
  }

  function elegirEspacio(id: string) {
    setSelId(id);
    setRuta(null);
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

  function comoLlegar() {
    if (!forma) return;
    setRuta(calcularRuta(ed, mi, floor, forma, labelFor(forma.id) || forma.id));
  }

  /* ---------------- UI ---------------- */
  return (
    <View style={s.raiz}>
      <HeaderMapa onBack={onBack} />
      <View style={s.pantalla} onLayout={(e) => setCaja({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
      {/* el plano, a pantalla completa */}
      <MapaVista m={m} viewW={mapW} viewH={viewH} baseW={mapW} baseH={baseH}>
    <View style={{ width: svgW, height: svgH }}>
      <Svg width={svgW} height={svgH} viewBox={viewBox}>
        {/* espacios */}
        <G>
          {piso.shapes.map((sh) => {
            const tipo = classify(sh.id);
            const esVerde = sh.id.includes('-verde');
            const esSendero = sh.id.includes('-sendero') || sh.id.includes('-camino');
            const esContorno = sh.id.includes('-contorno');
            const esPasillo = sh.id.includes('-pasillo');
            const esNulo = sh.id.startsWith('nulo');
            // Histórico, pisos de arriba: el contorno de la planta baja que no tiene nada es espacio sin uso
            const sinUso = esContorno && ed.zoomBase != null && floor !== pisos[0];
            const st = esVerde
              ? { fill: VERDE, stroke: VERDE, selFill: VERDE, selStroke: VERDE }
              : esSendero
              ? { fill: C.paths, stroke: C.paths, selFill: C.paths, selStroke: C.paths }
              : esPasillo
              ? { fill: PASILLO.fill, stroke: PASILLO.stroke, selFill: PASILLO.fill, selStroke: PASILLO.stroke }
              : esNulo || sinUso
              ? { fill: NULO.fill, stroke: NULO.stroke, selFill: NULO.fill, selStroke: NULO.stroke }
              : esContorno
              ? { fill: C.bldgFill, stroke: C.bldgStroke, selFill: C.bldgFill, selStroke: C.bldgStroke }
              : FILL[tipo];
            const sel = sh.id === selId;
            return (
              <Path
                key={sh.id}
                d={sh.d}
                fill={sel ? st.selFill : st.fill}
                stroke={sel ? st.selStroke : st.stroke}
                strokeWidth={esContorno ? 1.8 : tipo === 'muted' ? 0.6 : 1.2}
                fillRule="evenodd"
                pointerEvents={tipo === 'muted' ? 'none' : 'auto'}
                onPress={tipo === 'muted' ? undefined : () => elegirEspacio(sh.id)}
              />
            );
          })}
        </G>

        {/* ruta */}
        {ruta &&
          (ruta.legs ?? [{ floor, points: ruta.points }])
            .filter((l) => l.floor === floor && l.points.length > 1) // solo el tramo de este piso
            .map((l, i) => (
              <Path
                key={'ruta' + i}
                d={rutaToPath(l.points)}
                fill="none"
                stroke={C.route}
                strokeWidth={2.5}
                strokeDasharray="6 5"
                strokeLinecap="round"
                pointerEvents="none"
              />
            ))}

        {/* "estás acá" */}
        {puntoEnEstePiso && (
          <G pointerEvents="none">
            <Circle cx={puntoEnEstePiso.x} cy={puntoEnEstePiso.y} r={9} fill="#4f8ef7" />
            <Circle cx={puntoEnEstePiso.x} cy={puntoEnEstePiso.y} r={15} fill="none" stroke="#4f8ef7" strokeWidth={2} opacity={0.5} />
          </G>
        )}

        {/* carteles (sin contorno blanco, igual que en los Daract) */}
        <G pointerEvents="none">
          {piso.shapes.map((sh) => {
            if (!mostrarCartel(sh.id)) return null;
            if (tipoIcono(sh.id)) return null; // baños, escaleras y ascensor se muestran con su ícono
            const tipo = classify(sh.id);
            const label = labelFor(sh.id)!;
            // si el nombre no entra en el espacio, se muestra recién al acercar (así no se pisan)
            if (label.length * fs * 0.6 > sh.w * 0.98) return null;
            const conClase = !!SCHEDULE[sh.id];
            const y = (conClase ? sh.cy - fs * 0.35 : sh.cy) + fs * 0.35; // +0.35 = centrado vertical
            return (
              <G key={'t' + sh.id}>
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
      </MapaVista>

      {/* arriba, flotando: atrás + buscador, pisos y "estás en" */}
      <BarraSuperior value={query} onChange={buscar} placeholder={`Buscar en ${ed.name} (ej: Aula 13)`}>
        <FilaChips>
          {pisos.map((f) => (
            <ChipMapa key={f} texto={f} activo={f === floor} onPress={() => elegirPiso(f)} />
          ))}
        </FilaChips>
        <FilaChips>
          <ChipMapa
            texto={`Estás en: ${miPunto.label} · ${mi.floor}`}
            icono={<IconoUI nombre="ubicacion" size={14} />}
            derecha={<IconoUI nombre={whereOpen ? 'arriba' : 'abajo'} size={12} color={C.dim} />}
            onPress={() => setWhereOpen((o) => !o)}
          />
        </FilaChips>
        {whereOpen && (
          <ScrollView style={s.whereList} nestedScrollEnabled>
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
          </ScrollView>
        )}
      </BarraSuperior>

      {toast && (
        <View style={s.toast}>
          <Text style={s.toastText}>{toast}</Text>
        </View>
      )}

      <BotonesZoom onMas={() => m.zoomPor(1.6)} onMenos={() => m.zoomPor(1 / 1.6)} desplaza={forma && !teclado ? subeBotones(progHoja, alturaHoja) : undefined} />

      {/* abajo: ficha del espacio elegido, como la hoja de Google Maps */}
            {forma && !teclado && (
        <Hoja progreso={progHoja} key={forma.id} resumen={labelFor(forma.id) || forma.id} onCerrar={() => { setSelId(null); setRuta(null); }} onLayoutAlto={setAlturaHoja}>
          <ScrollView style={{ maxHeight: winH * 0.45 }} nestedScrollEnabled showsVerticalScrollIndicator={false}>
            <FichaEspacio
              nombreEdificio={ed.name}
               foto={fotoDeEspacio(forma.id) ?? foto}
              piso={floor}
              id={forma.id}
              ruta={ruta}
              onComoLlegar={comoLlegar}
            />
          </ScrollView>
        </Hoja>
      )}
      </View>
    </View>
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
            <Chip ic="enchufe" txt={`${am.enchufes} enchufes`} />
<Chip ic="wifi" txt="Wifi" off={!am.wifi} />
<Chip ic="proyector" txt="Proyector" off={!am.proyector} />
<Chip ic="accesible" txt="Accesible" off={!am.accesible} />
<Chip ic="personas" txt={`${am.capacidad} pers.`} />
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

function Chip({ ic, txt, off }: { ic: NombreIcono; txt: string; off?: boolean }) {
  const { C, s } = useEstilos();
  return (
    <View style={[s.chip, off && { opacity: 0.35 }]}>
            <IconoUI nombre={ic} size={16} color={C.text} />
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
  whereList: { maxHeight: 260, backgroundColor: C.btnBg, borderWidth: 1, borderColor: C.btnBorder, borderRadius: 14, padding: 8, marginRight: 60, elevation: 8 },
  whereHeader: { fontSize: 10.5, color: C.dim, paddingHorizontal: 9, paddingTop: 7, paddingBottom: 3, textTransform: 'uppercase', letterSpacing: 0.4 },
  whereOpt: { flexDirection: 'row', alignItems: 'center', gap: 9, padding: 9, borderRadius: 9 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.accent },
  raiz: { flex: 1, backgroundColor: C.bg },
  pantalla: { flex: 1, backgroundColor: C.mapBg, overflow: 'hidden' },
  mapWrap: { marginHorizontal: 6, backgroundColor: C.mapBg, borderWidth: 1, borderColor: C.mapBorder, borderRadius: 22, overflow: 'hidden', paddingTop: 12 },
  floorLabelRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 14, marginBottom: 6 },
  floorLabel: { fontSize: 11.5, fontWeight: '600', color: C.floorLabel },
  toast: { position: 'absolute', top: 150, alignSelf: 'center', zIndex: 5, backgroundColor: C.toastBg, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, elevation: 6 },
  toastText: { fontSize: 12, fontWeight: '600', color: C.toastText },
  zoomCtl: { position: 'absolute', right: 14, bottom: 14, gap: 8 },
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