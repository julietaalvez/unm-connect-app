import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Svg, { Circle, Line, Path, Polyline } from 'react-native-svg';
import { FUENTE, PROFES } from '../data/profes';
import { cargarProfesores } from '../lib/api';
import {
  DIAS, DIAS_CORTO, Estado, Franja, GRUPOS, Momento, ORDEN_SEMANA, Profe,
  ahoraReal, estado, fmtMin, hm, iniciales, lugarTxt, norm, toMin,
} from '../lib/profes';
import { Colores, useTema } from '../lib/tema';
import { Wf, useWf } from '../lib/wf';
import HeaderMapa from './HeaderMapa';

const CYAN = '#3ec6ef';

// Fuentes (se cargan en _layout.tsx)
const F = {
  h1: 'Montserrat_800ExtraBold',
  bold: 'Montserrat_700Bold',
  body: 'Roboto_400Regular',
  med: 'Roboto_500Medium',
  strong: 'Roboto_700Bold',
};

type Pal = { C: Colores; W: Wf; oscuro: boolean };

export default function ProfesoresScreen({ alCerrar }: { alCerrar: () => void }) {
  const { C } = useTema();
  const { W, oscuro } = useWf();
  const pal: Pal = { C, W, oscuro };
  const s = useMemo(() => makeStyles(C, W, oscuro), [C, W, oscuro]);
  const router = useRouter();

  const [query, setQuery] = useState('');
  const [filtro, setFiltro] = useState('todos');
  const [sim, setSim] = useState<Momento | null>(null);   // null = hora real
  const [simAbierto, setSimAbierto] = useState(false);
  const [sel, setSel] = useState<Profe | null>(null);
  const [, setTic] = useState(0);
  const [profes, setProfes] = useState<Profe[]>(PROFES);

     useEffect(() => {
       cargarProfesores().then((r) => setProfes(r.datos));
     }, []);

  // refresca el estado cada minuto
  useEffect(() => {
    const id = setInterval(() => setTic((t) => t + 1), 60000);
    return () => clearInterval(id);
  }, []);

  const t = sim ?? ahoraReal();

  const todos = useMemo(() => profes.map((p) => ({ p, e: estado(p, t) })), [profes, t.day, t.min]);
  const q = norm(query.trim());
  const buscados = todos.filter(
    (x) => !q || norm(x.p.nombre).includes(q) || x.p.franjas.some((f) => norm(f.materia).includes(q))
  );
  const grupo = GRUPOS.find((g) => g.id === filtro) ?? GRUPOS[0];
  const vistos = buscados
    .filter((x) => grupo.test(x.e))
    .sort((a, b) => a.p.nombre.localeCompare(b.p.nombre, 'es'));

  function moverSim(delta: number) {
    const base = sim ?? ahoraReal();
    setSim({ day: base.day, min: Math.min(23 * 60 + 59, Math.max(0, base.min + delta)) });
  }

  function irAlMapa(destino: Franja) {
    setSel(null);
    alCerrar();
    router.navigate({
      pathname: '/mapa',
      params: {
        edificio: destino.edificio,
        edificioId: destino.edificioId ?? '',
        aula: destino.aula ?? '',
        lugar: destino.lugar,
      },
    } as never);
  }

  return (
    <View style={[s.screen, { backgroundColor: C.bg }]}>
      <HeaderMapa />

      <ScrollView
        contentContainerStyle={{ paddingBottom: 140 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* título + volver */}
        <View style={s.pageHead}>
          <Pressable style={s.back} accessibilityLabel="Volver al inicio" onPress={alCerrar}>
            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={C.text} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
              <Polyline points="15 18 9 12 15 6" />
            </Svg>
          </Pressable>
          <Text style={s.h1}>¿Y mi profe?</Text>
        </View>

        {/* búsqueda */}
        <View style={s.search}>
          <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="#8ea0c2" strokeWidth={2}>
            <Circle cx={11} cy={11} r={7} />
            <Line x1={21} y1={21} x2={16.65} y2={16.65} />
          </Svg>
          <TextInput
            style={s.input}
            value={query}
            onChangeText={setQuery}
            placeholder="Buscá un profesor o una materia"
            placeholderTextColor={C.dim}
            autoCorrect={false}
            autoCapitalize="none"
            accessibilityLabel="Buscar profesor o materia"
          />
          {!!query && (
            <Pressable onPress={() => setQuery('')} hitSlop={10} accessibilityLabel="Borrar búsqueda">
              <Text style={s.clear}>×</Text>
            </Pressable>
          )}
        </View>

        {/* filtros */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
          {GRUPOS.map((g) => {
            const activo = g.id === filtro;
            const n = buscados.filter((x) => g.test(x.e)).length;
            return (
              <Pressable key={g.id} style={[s.chip, activo && s.chipOn]} onPress={() => setFiltro(g.id)}>
                <Text style={[s.chipTxt, activo && { color: '#fff' }]}>{g.label}</Text>
                <Text style={[s.chipN, activo && { color: 'rgba(255,255,255,0.75)' }]}>{n}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* reloj / simulador */}
        <View style={s.clock}>
          <Text style={s.clockTxt}>
            {sim ? 'Simulando: ' : 'Ahora: '}
            <Text style={s.clockB}>{`${DIAS[t.day]} ${fmtMin(t.min)}`}</Text>
          </Text>
          <Pressable onPress={() => setSimAbierto((v) => !v)}>
            <Text style={s.clockBtn}>Cambiar día u hora</Text>
          </Pressable>
        </View>

        {simAbierto && (
          <View style={s.sim}>
            <View style={s.simDias}>
              {ORDEN_SEMANA.map((d) => (
                <Pressable key={d} style={[s.simDia, t.day === d && s.simDiaOn]} onPress={() => setSim({ day: d, min: t.min })}>
                  <Text style={[s.simDiaTxt, t.day === d && { color: '#fff' }]}>{DIAS_CORTO[d]}</Text>
                </Pressable>
              ))}
            </View>
            <View style={s.simHora}>
              <Pressable style={s.simBtn} onPress={() => moverSim(-30)}><Text style={s.simBtnTxt}>−30 min</Text></Pressable>
              <Text style={s.simHoraTxt}>{fmtMin(t.min)}</Text>
              <Pressable style={s.simBtn} onPress={() => moverSim(30)}><Text style={s.simBtnTxt}>+30 min</Text></Pressable>
              <Pressable style={[s.simBtn, { marginLeft: 'auto' }]} onPress={() => setSim(null)}>
                <Text style={s.simBtnTxt}>Volver a ahora</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* lista */}
        <View style={s.list}>
          {vistos.length ? (
            vistos.map(({ p, e }) => (
              <Pressable
                key={p.id}
                style={({ pressed }) => [s.row, pressed && { transform: [{ scale: 0.99 }] }]}
                onPress={() => setSel(p)}
              >
                <Avatar p={p} e={e} pal={pal} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={s.name} numberOfLines={1}>{`Prof. ${p.nombre}`}</Text>
                  <Text style={s.mat} numberOfLines={1}>{p.materias4.join(' · ')}</Text>
                  <View style={s.st}>
                    <Svg width={8} height={8} viewBox="0 0 8 8"><Circle cx={4} cy={4} r={4} fill={colorDe(e, pal)} /></Svg>
                    <Text style={[s.stTxt, { color: textoEstado(e, pal) }]} numberOfLines={1}>{e.corto}</Text>
                  </View>
                </View>
                <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={oscuro ? CYAN : C.accent} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
                  <Polyline points="9 6 15 12 9 18" />
                </Svg>
              </Pressable>
            ))
          ) : (
            <View style={s.empty}>
              <Text style={s.emptyB}>No encontramos a nadie</Text>
              <Text style={s.emptyT}>
                {q ? 'Probá con otro nombre o materia, o cambiá el filtro.' : 'Nadie coincide con este filtro en este momento.'}
              </Text>
            </View>
          )}
          <Text style={s.fuente}>{FUENTE}</Text>
        </View>
      </ScrollView>

      <Detalle
        p={sel}
        t={t}
        pal={pal}
        s={s}
        onClose={() => setSel(null)}
        onIr={irAlMapa}
      />
    </View>
  );
}

/* ----------------------------- helpers de color ----------------------------- */

function colorDe(e: Estado, { C, W }: Pal) {
  return e.cls === 'clase' ? W.busy : e.cls === 'virtual' ? W.virt : e.cls === 'viene' ? CYAN : C.dim;
}
function textoEstado(e: Estado, { C, W, oscuro }: Pal) {
  if (e.cls === 'clase') return W.busy;
  if (e.cls === 'virtual') return W.virt;
  if (e.cls === 'viene') return oscuro ? CYAN : C.accent;
  return C.dim;
}

/* --------------------------------- avatar --------------------------------- */

function Avatar({ p, e, pal, grande }: { p: Profe; e: Estado; pal: Pal; grande?: boolean }) {
  const { C, oscuro } = pal;
  const size = grande ? 58 : 44;
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: C.elevated, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontFamily: F.bold, fontSize: grande ? 20 : 15, color: oscuro ? '#cfe0ff' : '#153396' }}>{iniciales(p.nombre)}</Text>
      <View
        style={{
          position: 'absolute', right: -1, bottom: -1, width: 13, height: 13, borderRadius: 7,
          borderWidth: 2, borderColor: grande ? C.bg : C.panel2, backgroundColor: colorDe(e, pal),
        }}
      />
    </View>
  );
}

/* ------------------------------ detalle (sheet) ------------------------------ */

function Detalle({
  p, t, pal, s, onClose, onIr,
}: {
  p: Profe | null; t: Momento; pal: Pal; s: ReturnType<typeof makeStyles>;
  onClose: () => void; onIr: (f: Franja) => void;
}) {
  const { C, W, oscuro } = pal;
  if (!p) return <Modal visible={false} transparent />;

  const e = estado(p, t);
  const tag = (f: Franja): [string, string] =>
    f.modo === 'virtual' ? ['Virtual', W.virt] : f.alterna ? ['Semana por medio', W.busy] : ['Presencial', C.dim];
  const donde = (f: Franja) => (f.modo === 'virtual' ? 'Online' : lugarTxt(f));

  const varias = new Set(p.franjas.map((f) => f.materia)).size > 1;
  const presSem = p.franjas.filter((f) => f.modo === 'presencial');
  const destino =
    (e.actual && e.actual.modo === 'presencial' && e.actual) ||
    (e.proxima && e.proxima.modo === 'presencial' && e.proxima) ||
    e.hoy.find((f) => f.modo === 'presencial') ||
    presSem[0];

  const bigBg = e.cls === 'clase' ? W.busyBg : e.cls === 'virtual' ? W.virtBg : C.panel2;
  const bigInk = textoEstado(e, pal);

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.modalWrap}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={s.sheet}>
          <View style={s.grab} />
          <ScrollView contentContainerStyle={s.sheetBody} showsVerticalScrollIndicator={false}>
            {/* cabecera */}
            <View style={s.sHead}>
              <Avatar p={p} e={e} pal={pal} grande />
              <View style={{ flex: 1 }}>
                <Text style={s.sName}>{`Prof. ${p.nombre}`}</Text>
                <Text style={s.sMat}>{p.materias4.join(' · ')}</Text>
              </View>
              <Pressable style={s.close} onPress={onClose} accessibilityLabel="Cerrar">
                <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={C.text} strokeWidth={2.4} strokeLinecap="round">
                  <Path d="M6 6l12 12M18 6L6 18" />
                </Svg>
              </Pressable>
            </View>

            {/* estado grande */}
            <View style={[s.big, { backgroundColor: bigBg }]}>
              <Text style={[s.bigT, { color: bigInk }]}>{e.titulo}</Text>
              <Text style={[s.bigD, { color: bigInk }]}>{e.detalle}</Text>
              {!!e.nota && (
                <Text style={[s.bigD, s.bigNota, { color: bigInk, borderTopColor: bigInk }]}>{e.nota}</Text>
              )}
            </View>

            {/* hoy */}
            <Text style={s.sSec}>{`Hoy, ${DIAS[t.day].toLowerCase()}`}</Text>
            {e.hoy.length ? (
              e.hoy.map((f, i) => {
                const [tx, col] = tag(f);
                return (
                  <View key={i} style={[s.slot, e.actual === f && { borderWidth: 2, borderColor: W.busy }]}>
                    <Text style={s.slotH}>{`${hm(f.desde)} – ${hm(f.hasta)}`}</Text>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={s.slotW}>{f.materia}</Text>
                      <Text style={s.slotSmall}>{`${donde(f)} · ${f.anio}° año`}</Text>
                    </View>
                    <Text style={[s.tag, { color: col }]}>{tx}</Text>
                  </View>
                );
              })
            ) : (
              <View style={s.slot}><Text style={s.slotW}>No figura con clases hoy.</Text></View>
            )}

            {/* semana */}
            <Text style={s.sSec}>Toda la semana</Text>
            <View style={{ gap: 6 }}>
              {[1, 2, 3, 4, 5, 6].map((d) => {
                const fr = p.franjas.filter((f) => f.dias.includes(d)).sort((a, b) => toMin(a.desde) - toMin(b.desde));
                return (
                  <View key={d} style={s.weekRow}>
                    <Text style={[s.weekD, d === t.day && { color: oscuro ? CYAN : C.accent }]}>{DIAS_CORTO[d]}</Text>
                    <View style={{ flex: 1 }}>
                      {fr.length ? (
                        fr.map((f, i) => (
                          <View key={i} style={{ marginBottom: 3 }}>
                            <Text style={s.weekV}>
                              {`${hm(f.desde)}–${hm(f.hasta)} · ${f.modo === 'virtual' ? 'Virtual' : f.lugar}${f.alterna ? ' · sem. por medio' : ''}`}
                            </Text>
                            {varias && <Text style={s.weekM}>{f.materia}</Text>}
                          </View>
                        ))
                      ) : (
                        <Text style={[s.weekV, { color: C.dim }]}>No viene</Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>

            {/* cómo llegar */}
            <Pressable
              style={[s.go, !destino && { opacity: 0.5 }]}
              disabled={!destino}
              onPress={() => destino && onIr(destino)}
            >
              <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                <Path d="M3 11l18-8-8 18-2-8z" />
              </Svg>
              <Text style={s.goTxt}>{destino ? `Cómo llegar a ${destino.lugar}` : 'Sin clases presenciales'}</Text>
            </Pressable>
            <Text style={s.mail}>Si el aula aparece solo como código (ej. I001), todavía no está vinculada al mapa.</Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

/* --------------------------------- estilos --------------------------------- */

const makeStyles = (C: Colores, W: Wf, oscuro: boolean) =>
  StyleSheet.create({
    screen: { flex: 1 },

    pageHead: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 6, paddingHorizontal: 18, paddingBottom: 10 },
    back: {
      width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center',
      backgroundColor: oscuro ? '#14233d' : '#ffffff', borderWidth: 1, borderColor: oscuro ? '#263b5e' : '#c7d9f5',
      shadowColor: '#12213c', shadowOpacity: 0.25, shadowRadius: 7, shadowOffset: { width: 0, height: 4 }, elevation: 3,
    },
    h1: { fontFamily: F.h1, fontSize: 22, letterSpacing: -0.2, color: C.text },

    search: { marginHorizontal: 18, marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.panel2, borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingHorizontal: 12 },
    input: { flex: 1, minWidth: 0, fontFamily: F.med, fontSize: 14, color: C.text, paddingVertical: 11 },
    clear: { fontSize: 20, lineHeight: 22, color: C.dim, paddingHorizontal: 4 },

    chips: { gap: 8, paddingHorizontal: 18, paddingBottom: 10 },
    chip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: C.border, backgroundColor: C.bg, borderRadius: 999, paddingVertical: 7, paddingHorizontal: 13 },
    chipOn: { backgroundColor: C.accent, borderColor: C.accent },
    chipTxt: { fontFamily: F.strong, fontSize: 12.5, color: C.text },
    chipN: { fontFamily: F.med, fontSize: 12.5, color: C.dim },

    clock: { marginHorizontal: 18, marginBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    clockTxt: { fontFamily: F.body, fontSize: 12, color: C.dim },
    clockB: { fontFamily: F.strong, color: C.text },
    clockBtn: { fontFamily: F.strong, fontSize: 12, color: oscuro ? CYAN : C.accent, padding: 4 },

    sim: { marginHorizontal: 18, marginBottom: 10, padding: 12, borderWidth: 1, borderStyle: 'dashed', borderColor: C.elevated, borderRadius: 12, gap: 10 },
    simDias: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    simDia: { borderWidth: 1, borderColor: C.border, backgroundColor: C.bg, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10 },
    simDiaOn: { backgroundColor: C.accent, borderColor: C.accent },
    simDiaTxt: { fontFamily: F.strong, fontSize: 12, color: C.text },
    simHora: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
    simHoraTxt: { fontFamily: F.strong, fontSize: 15, color: C.text, minWidth: 48, textAlign: 'center' },
    simBtn: { backgroundColor: C.panel2, borderRadius: 8, paddingVertical: 7, paddingHorizontal: 10 },
    simBtnTxt: { fontFamily: F.strong, fontSize: 12, color: C.text },

    list: { paddingHorizontal: 18, gap: 9 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.panel2, borderWidth: 1, borderColor: C.border, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 12 },
    name: { fontFamily: F.strong, fontSize: 14.5, color: C.text },
    mat: { fontFamily: F.body, fontSize: 12.5, color: C.dim, marginTop: 1 },
    st: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 5 },
    stTxt: { fontFamily: F.med, fontSize: 12, flexShrink: 1 },
    fuente: { fontFamily: F.body, fontSize: 11, lineHeight: 15, color: C.dim, marginTop: 6, marginHorizontal: 2 },
    empty: { paddingVertical: 36, paddingHorizontal: 12, alignItems: 'center' },
    emptyB: { fontFamily: F.strong, fontSize: 15, color: C.text, marginBottom: 4 },
    emptyT: { fontFamily: F.body, fontSize: 13.5, lineHeight: 20, color: C.dim, textAlign: 'center' },

    /* detalle */
    modalWrap: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(11,20,36,0.45)' },
    sheet: { maxHeight: '86%', backgroundColor: C.bg, borderTopLeftRadius: 22, borderTopRightRadius: 22, borderWidth: 1, borderBottomWidth: 0, borderColor: C.border },
    grab: { width: 38, height: 4, borderRadius: 2, backgroundColor: C.elevated, alignSelf: 'center', marginTop: 9, marginBottom: 2 },
    sheetBody: { paddingTop: 8, paddingHorizontal: 18, paddingBottom: 34 },
    sHead: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    sName: { fontFamily: F.bold, fontSize: 18, color: C.text },
    sMat: { fontFamily: F.body, fontSize: 13, color: C.dim, marginTop: 2 },
    close: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start', backgroundColor: oscuro ? '#14233d' : '#ffffff', borderWidth: 1, borderColor: oscuro ? '#263b5e' : '#c7d9f5' },

    big: { marginTop: 14, marginBottom: 4, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 14 },
    bigT: { fontFamily: F.strong, fontSize: 14.5 },
    bigD: { fontFamily: F.body, fontSize: 12.5, marginTop: 2, opacity: 0.85 },
    bigNota: { marginTop: 6, paddingTop: 6, borderTopWidth: 1 },

    sSec: { fontFamily: F.bold, fontSize: 13, color: C.dim, marginTop: 16, marginBottom: 6 },
    slot: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 9, paddingHorizontal: 12, borderRadius: 12, backgroundColor: C.panel2, marginBottom: 6 },
    slotH: { fontFamily: F.strong, fontSize: 13, minWidth: 86, color: C.text },
    slotW: { fontFamily: F.med, fontSize: 13, lineHeight: 17, color: C.text },
    slotSmall: { fontFamily: F.body, fontSize: 12, color: C.dim, marginTop: 1 },
    tag: { fontFamily: F.strong, fontSize: 11, paddingVertical: 3, paddingHorizontal: 8, borderRadius: 999, backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, overflow: 'hidden' },

    weekRow: { flexDirection: 'row', gap: 10 },
    weekD: { fontFamily: F.strong, fontSize: 13, width: 44, paddingTop: 2, color: C.text },
    weekV: { fontFamily: F.body, fontSize: 13, lineHeight: 18, color: C.text },
    weekM: { fontFamily: F.body, fontSize: 11.5, color: C.dim },

    go: { marginTop: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.accent, borderRadius: 14, padding: 14 },
    goTxt: { fontFamily: F.strong, fontSize: 15, color: '#fff', flexShrink: 1, textAlign: 'center' },
    mail: { fontFamily: F.body, fontSize: 11.5, lineHeight: 16, color: C.dim, textAlign: 'center', marginTop: 10 },
  });