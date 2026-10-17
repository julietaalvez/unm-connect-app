import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path, Polyline } from 'react-native-svg';

import HeaderMapa from '../components/HeaderMapa';
import {
  ClaseHoy,
  Fuente,
  Novedad,
  cargarClasesHoy,
  cargarNovedades,
  clasesEjemplo,
  NOVEDADES_EJEMPLO,
} from '../lib/api';
import { aMinutos, contarAulasLibres, minutosDe } from '../lib/inicio';
import { labelFor } from '../lib/interior';
import { useTema } from '../lib/tema';
import { Wf, useWf } from '../lib/wf';

const FOTO_CAMPUS = require('../../assets/images/campus-foto.jpg');
const IC = {
  campana: require('../../assets/icons/campana.png'),
  clase: require('../../assets/icons/clase.png'),
  novedades: require('../../assets/icons/novedades.png'),
  profesores: require('../../assets/icons/profesores.png'),
};

// TODO: tomarlo del perfil / sesión cuando exista
const NOMBRE = 'Juan';

// Fuentes (se cargan en _layout.tsx). Si no están, usa la del sistema.
const F = {
  h1: 'Montserrat_800ExtraBold',
  bold: 'Montserrat_700Bold',
  semi: 'Montserrat_600SemiBold',
  body: 'Roboto_400Regular',
  bodyMed: 'Roboto_500Medium',
  bodyBold: 'Roboto_700Bold',
};

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const sin0 = (h: string) => h.replace(/^0/, '');

/* mini íconos de la fila (pin / reloj / persona) */
const IcoPin = ({ W }: { W: Wf }) => (
  <Svg width={11} height={11} viewBox="0 0 24 24">
    <Path d="M12 22S5 15.5 5 10a7 7 0 0 1 14 0c0 5.5-7 12-7 12Z" fill={W.pin} />
    <Circle cx={12} cy={10} r={2.6} fill={W.pinIn} />
  </Svg>
);
const IcoReloj = ({ W }: { W: Wf }) => (
  <Svg width={11} height={11} viewBox="0 0 24 24">
    <Circle cx={12} cy={12} r={10} fill={W.pin} />
    <Polyline points="12 6.5 12 12 15.5 14" fill="none" stroke={W.pinIn} strokeWidth={2.4} strokeLinecap="round" />
  </Svg>
);
const IcoPersona = ({ W }: { W: Wf }) => (
  <Svg width={11} height={11} viewBox="0 0 24 24">
    <Circle cx={12} cy={12} r={10} fill={W.pin} />
    <Circle cx={12} cy={9.5} r={3} fill={W.pinIn} />
    <Path d="M6.5 18c1-2.6 3-3.8 5.5-3.8s4.5 1.2 5.5 3.8" fill={W.pinIn} />
  </Svg>
);

export default function InicioScreen() {
  const { C } = useTema();
  const { W } = useWf();
  const s = useMemo(() => makeStyles(W), [W]);
  const router = useRouter();

  // Arranca con datos de ejemplo para que la pantalla nunca quede vacía
  const [clases, setClases] = useState<ClaseHoy[]>(() => clasesEjemplo());
  const [novedades, setNovedades] = useState<Novedad[]>(NOVEDADES_EJEMPLO);
  const [fuente, setFuente] = useState<Fuente>('ejemplo');
  const [cargando, setCargando] = useState(true);
  const [, setTic] = useState(0);

  const cargar = useCallback(async () => {
    const [c, n] = await Promise.all([cargarClasesHoy(), cargarNovedades()]);
    setClases(c.datos);
    setNovedades(n.datos);
    setFuente(c.fuente === 'servidor' || n.fuente === 'servidor' ? 'servidor' : 'ejemplo');
    setCargando(false);
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  // actualiza "en curso" y "aulas libres" cada minuto
  useEffect(() => {
    const id = setInterval(() => setTic((t) => t + 1), 60000);
    return () => clearInterval(id);
  }, []);

  const ahora = new Date();
  const min = minutosDe(ahora);
  const { total, libres } = contarAulasLibres(clases, min);

  const miDia = useMemo(
    () => [...clases].sort((a, b) => aMinutos(a.desde) - aMinutos(b.desde)),
    [clases]
  );
  const quedan = miDia.some((c) => aMinutos(c.hasta) > min);
  const fecha = `${DIAS[ahora.getDay()]} ${ahora.getDate()} de ${MESES[ahora.getMonth()]}`;
  const subtitulo = miDia.length && !quedan ? `Ya terminaste por hoy · ${fecha}` : `Hoy, ${fecha}`;

  return (
    <ScrollView
      style={[s.screen, { backgroundColor: C.bg }]}
      contentContainerStyle={{ paddingBottom: 140 }}
      contentInsetAdjustmentBehavior="never"
      refreshControl={<RefreshControl refreshing={false} onRefresh={cargar} tintColor={C.dim} />}
    >
      <HeaderMapa />

      {/* saludo + campana */}
      <View style={s.homeHead}>
        <Text style={s.h1}>{`HOLA ${NOMBRE.toUpperCase()}!`}</Text>
        <Pressable
          style={s.plainBtn}
          accessibilityLabel="Notificaciones"
          onPress={() => Alert.alert('Notificaciones', 'No tenés notificaciones nuevas')}
        >
          <Image source={IC.campana} style={s.campana} resizeMode="contain" />
        </Pressable>
      </View>

      {/* MI DÍA */}
      <View style={s.mdCard}>
        <Text style={s.mdTitulo}>MI DÍA</Text>
        <Text style={s.mdSub}>{subtitulo}</Text>

        {cargando ? (
          <Text style={s.mdNone}>Cargando…</Text>
        ) : miDia.length === 0 ? (
          <Text style={s.mdNone}>No hay nada agendado por ahora.</Text>
        ) : (
          miDia.map((c, i) => {
            const enCurso = aMinutos(c.desde) <= min && min < aMinutos(c.hasta);
            return (
              <Pressable
                key={`${c.materia}-${c.desde}-${i}`}
                style={({ pressed }) => [s.mdItem, enCurso && s.mdItemAhora, pressed && { transform: [{ scale: 0.99 }] }]}
                onPress={() => router.navigate('/mapa')}
              >
                <View style={s.mdIc}>
                  <Image source={IC.clase} style={s.mdIcImg} resizeMode="contain" />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={s.mdN}>{c.materia}</Text>
                  <View style={s.mdM}>
                    <View style={s.mdMItem}>
                      <IcoPin W={W} />
                      <Text style={s.mdMTxt}>{labelFor(c.aulaId) ?? c.aulaId}</Text>
                    </View>
                    <View style={s.mdMItem}>
                      <IcoReloj W={W} />
                      <Text style={s.mdMTxt}>{`${sin0(c.desde)} – ${sin0(c.hasta)}`}</Text>
                    </View>
                    {!!c.profesor && (
                      <View style={s.mdMItem}>
                        <IcoPersona W={W} />
                        <Text style={s.mdMTxt}>{`Prof. ${c.profesor}`}</Text>
                      </View>
                    )}
                  </View>
                  <View style={s.mdTags}>
                    {enCurso && <Text style={[s.mdTag, s.mdTagAhora]}>En curso</Text>}
                    <Text style={s.mdTag}>Presencial</Text>
                  </View>
                </View>
              </Pressable>
            );
          })
        )}
      </View>

      {/* banner */}
      <View style={s.hero}>
        <Image source={FOTO_CAMPUS} style={StyleSheet.absoluteFill} resizeMode="cover" />
        <LinearGradient
          colors={['rgba(26,51,153,0.95)', 'rgba(26,51,153,0.7)', 'rgba(26,51,153,0.15)']}
          locations={[0, 0.5, 1]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={s.heroTxt}>
          <Text style={s.heroB}>Universidad Nacional de Moreno</Text>
          <Text style={s.heroSpan}>Más cerca, siempre.</Text>
        </View>
      </View>

      {/* accesos rápidos */}
      <Text style={s.quickTitle}>Accesos rápidos</Text>
      <View style={s.quick}>
        <Pressable style={s.qbtn} onPress={() => router.navigate('/agenda')}>
          <Image source={IC.novedades} style={s.qIc} resizeMode="contain" />
          <Text style={s.qTxt}>Novedades</Text>
        </Pressable>
        <Pressable style={s.qbtn} onPress={() => router.navigate('/profesores' as never)}>
          <Image source={IC.profesores} style={s.qIc} resizeMode="contain" />
          <Text style={s.qTxt}>Profesores</Text>
        </Pressable>
      </View>

      {/* lo que ya tenías: aulas libres y novedades, con el mismo estilo */}
      <View style={s.bloque}>
        <View style={{ flex: 1 }}>
          <Text style={s.bloqueLabel}>AULAS LIBRES AHORA</Text>
          <Text style={s.bloqueSub}>{`${libres} de ${total} aulas sin clase`}</Text>
        </View>
        <Text style={s.libresNum}>{libres}</Text>
      </View>

      <Text style={s.quickTitle}>Novedades</Text>
      {novedades.length === 0 ? (
        <View style={s.bloque}>
          <Text style={s.bloqueSub}>No hay novedades por ahora.</Text>
        </View>
      ) : (
        novedades.map((n) => (
          <View key={n.id} style={[s.bloque, { flexDirection: 'column', alignItems: 'flex-start', gap: 2 }]}>
            <Text style={s.avisoTitulo}>{n.titulo}</Text>
            {!!n.texto && <Text style={s.bloqueSub}>{n.texto}</Text>}
          </View>
        ))
      )}

      {/* solo se ve mientras desarrollan (expo start), no en la app final */}
      {__DEV__ && fuente === 'ejemplo' && (
        <Text style={s.dev}>Mostrando datos de ejemplo: el servidor no respondió o la base está vacía.</Text>
      )}
    </ScrollView>
  );
}

const makeStyles = (W: Wf) =>
  StyleSheet.create({
    screen: { flex: 1 },

    homeHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingTop: 16, paddingHorizontal: 18, paddingBottom: 14 },
    h1: { fontFamily: F.h1, fontSize: 22, letterSpacing: 0.3, color: W.ink },
    plainBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
    campana: { width: 26, height: 26 },

    mdCard: { marginHorizontal: 16, backgroundColor: W.card, borderRadius: 18, paddingTop: 12, paddingHorizontal: 10, paddingBottom: 10 },
    mdTitulo: { fontFamily: F.h1, fontSize: 20, letterSpacing: 0.3, color: W.h2, marginHorizontal: 6 },
    mdSub: { fontFamily: F.body, fontSize: 11.5, color: W.meta, marginHorizontal: 6, marginTop: 2 },
    mdNone: { fontFamily: F.body, fontSize: 12.5, color: W.meta, paddingTop: 10, paddingHorizontal: 6, paddingBottom: 4 },
    mdItem: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: W.item, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 10, marginTop: 8 },
    mdItemAhora: { borderWidth: 2, borderColor: W.busy },
    mdIc: { width: 34, height: 34, borderRadius: 9, backgroundColor: W.sq, alignItems: 'center', justifyContent: 'center' },
    mdIcImg: { width: 21, height: 21 },
    mdN: { fontFamily: F.bold, fontSize: 12, lineHeight: 15.6, color: W.ink },
    mdM: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 12, rowGap: 3, marginTop: 3 },
    mdMItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    mdMTxt: { fontFamily: F.bodyMed, fontSize: 10.5, color: W.meta },
    mdTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 4 },
    mdTag: { fontFamily: F.bodyBold, fontSize: 9.5, color: W.tagInk, backgroundColor: W.tagBg, paddingVertical: 2, paddingHorizontal: 7, borderRadius: 999, overflow: 'hidden' },
    mdTagAhora: { color: W.busy, backgroundColor: W.busyBg },

    hero: { marginTop: 14, marginHorizontal: 16, height: 150, borderRadius: 18, overflow: 'hidden', backgroundColor: W.navy, justifyContent: 'center' },
    heroTxt: { position: 'absolute', left: 18, right: '38%' },
    heroB: { fontFamily: F.h1, fontSize: 15, lineHeight: 18.75, color: '#fff' },
    heroSpan: { fontFamily: F.body, fontSize: 11, color: 'rgba(255,255,255,0.85)', marginTop: 10 },

    quickTitle: { fontFamily: F.h1, fontSize: 14, color: W.ink, marginTop: 16, marginHorizontal: 18, marginBottom: 10 },
    quick: { flexDirection: 'row', justifyContent: 'space-around', gap: 16, paddingHorizontal: 18, paddingBottom: 22 },
    qbtn: {
      flexGrow: 0, flexShrink: 1, flexBasis: 140, backgroundColor: W.tile, borderRadius: 10,
      paddingTop: 12, paddingHorizontal: 8, paddingBottom: 8, alignItems: 'center', gap: 4,
      shadowColor: '#1a3399', shadowOpacity: 0.35, shadowRadius: 6, shadowOffset: { width: 0, height: 4 }, elevation: 3,
    },
    qIc: { width: 34, height: 34 },
    qTxt: { fontFamily: F.bold, fontSize: 10.5, color: W.ink },

    bloque: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 16, marginBottom: 10, padding: 14, borderRadius: 18, backgroundColor: W.card },
    bloqueLabel: { fontFamily: F.bold, fontSize: 10.5, letterSpacing: 0.6, color: W.meta, marginBottom: 4 },
    bloqueSub: { fontFamily: F.body, fontSize: 12.5, color: W.meta },
    libresNum: { fontFamily: F.h1, fontSize: 34, color: W.navy },
    avisoTitulo: { fontFamily: F.bold, fontSize: 13, color: W.ink },
    dev: { fontFamily: F.body, fontSize: 11, color: W.meta, textAlign: 'center', marginHorizontal: 18, marginTop: 4 },
  });