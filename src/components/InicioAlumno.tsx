import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Image, Linking, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import AlertaImportante from '../components/AlertaImportante';
import HeaderMapa from '../components/HeaderMapa';
import MisNotas from '../components/MisNotas';
import NotificacionesScreen from '../components/NotificacionesScreen';
import ProfesoresScreen from '../components/ProfesoresScreen';
import { ClaseHoy, Fuente, cargarClasesHoy, clasesEjemplo } from '../lib/api';
import { aMinutos, contarAulasLibres, minutosDe } from '../lib/inicio';
import { armarCursadas, clasesDelDia, useCatalogo, useInscripciones } from '../lib/inscripciones';
import { labelFor } from '../lib/interior';
import { useNovedades } from '../lib/novedades';
import { usuarioActual } from '../lib/sesion';
import { useTema } from '../lib/tema';
import { Wf, useWf } from '../lib/wf';

const FOTO_CAMPUS = require('../../assets/images/campus-foto.jpg');
const URL_UNM = 'https://www.unm.edu.ar/';
const IC = {
  campana: require('../../assets/icons/campana.png'),
  clase: require('../../assets/icons/clase.png'),
  novedades: require('../../assets/icons/novedades.png'),
  profesores: require('../../assets/icons/profesores.png'),
  // iconos chicos de Mi día y avisos: cambiá el nombre del archivo si querés otros
  pin: require('../../assets/icons/pin.png'),
  reloj: require('../../assets/icons/reloj.png'),
  video: require('../../assets/icons/video.png'),
  persona: require('../../assets/icons/profesores.png'),
  aviso: require('../../assets/icons/campana.png'),
  calendario: require('../../assets/icons/materias.png'),
};
const ICONO_TIPO = { aula: IC.pin, evento: IC.calendario, aviso: IC.campana };
const primerNombre = () => (usuarioActual()?.nombre ?? 'estudiante').split(' ')[0];

// Fuentes (se cargan en _layout.tsx). Si no están, usa la del sistema.
export const F = {
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

const ANCHO_WEB = 900; // a partir de este ancho se usan dos columnas

const Mini = ({ src }: { src: number }) => <Image source={src} style={{ width: 12, height: 12 }} resizeMode="contain" />;

export default function InicioAlumno() {
  const { C } = useTema();
  const { W } = useWf();
  const s = useMemo(() => makeStyles(W), [W]);
  const router = useRouter();
  const { width } = useWindowDimensions();
  const ancho = width >= ANCHO_WEB;

  // Arranca con datos de ejemplo para que la pantalla nunca quede vacía
  const [clases, setClases] = useState<ClaseHoy[]>(() => clasesEjemplo());
  const [verNotifs, setVerNotifs] = useState(false);
  const { lista: novedades, sinLeer, recargar: recargarNovedades } = useNovedades();
  const [fuente, setFuente] = useState<Fuente>('ejemplo');
  const [, setCargando] = useState(true);
  const [verProfes, setVerProfes] = useState(false);
  const [verNotas, setVerNotas] = useState(false);
  const [, setTic] = useState(0);

  const cargar = useCallback(async () => {
    const c = await cargarClasesHoy();
    setClases(c.datos);
    setFuente(c.fuente);
    setCargando(false);
  }, []);
  useEffect(() => {
    cargar();
  }, [cargar]);

  // actualiza "en curso" y "aulas libres" cada minuto
  useEffect(() => {
    const id = setInterval(() => {
      setTic((t) => t + 1);
      recargarNovedades();
    }, 60000);
    return () => clearInterval(id);
  }, []);

  const ahora = new Date();
  const min = minutosDe(ahora);
  const { total, libres } = contarAulasLibres(clases, min);

  const catalogo = useCatalogo();
  const { claves } = useInscripciones();
  const hoyKey = ahora.toDateString();
  const miDia = useMemo(
    () => clasesDelDia(armarCursadas(catalogo).filter((c) => claves.has(c.clave)), new Date()),
    [catalogo, claves, hoyKey]
  );
  const quedan = miDia.some((c) => aMinutos(c.hasta) > min);
  const fecha = `${DIAS[ahora.getDay()]} ${ahora.getDate()} de ${MESES[ahora.getMonth()]}`;
  const subtitulo = miDia.length && !quedan ? `Ya terminaste por hoy · ${fecha}` : `Hoy, ${fecha}`;

  return (
    <ScrollView
      style={[s.screen, { backgroundColor: C.bg }]}
      contentContainerStyle={{ paddingBottom: 140 }}
      contentInsetAdjustmentBehavior="never"
      refreshControl={<RefreshControl refreshing={false} onRefresh={() => { cargar(); recargarNovedades(); }} tintColor={C.dim} />}
    >
      <View style={s.pagina}>
        <HeaderMapa />

        {/* saludo + campana */}
        <View style={s.homeHead}>
          <Text style={s.h1}>{`HOLA ${primerNombre().toUpperCase()}!`}</Text>
          <Pressable
            style={s.plainBtn}
            accessibilityLabel={sinLeer > 0 ? `Notificaciones, ${sinLeer} sin leer` : 'Notificaciones'}
            onPress={() => setVerNotifs(true)}
          >
            <Image source={IC.campana} style={s.campana} resizeMode="contain" />
            {sinLeer > 0 && (
              <View style={s.badge}>
                <Text style={s.badgeTxt}>{sinLeer > 9 ? '9+' : sinLeer}</Text>
              </View>
            )}
          </Pressable>
        </View>

        <View style={ancho ? s.cols : undefined}>
          {/* columna izquierda: Mi día + banner */}
          <View style={ancho ? s.colIzq : undefined}>
            {/* MI DÍA */}
            <View style={s.mdCard}>
              <Text style={s.mdTitulo}>MI DÍA</Text>
              <Text style={s.mdSub}>{subtitulo}</Text>

              {claves.size === 0 ? (
                <View>
                  <Text style={s.mdNone}>Todavía no agregaste tus materias.</Text>
                  <Pressable style={s.mdBtn} onPress={() => router.navigate('/perfil')}>
                    <Text style={s.mdBtnTxt}>Agregar materias</Text>
                  </Pressable>
                </View>
              ) : miDia.length === 0 ? (
                <Text style={s.mdNone}>Hoy no tenés clases.</Text>
              ) : (
                miDia.map((c, i) => {
                  const enCurso = aMinutos(c.desde) <= min && min < aMinutos(c.hasta);
                  const lugar = (c.aula && labelFor(c.aula)) || c.lugar;
                  return (
                    <Pressable
                      key={`${c.materia}-${c.desde}-${i}`}
                      style={({ pressed }) => [s.mdItem, enCurso && s.mdItemAhora, pressed && { transform: [{ scale: 0.99 }] }]}
                      onPress={() => {
                        if (!c.virtual) router.navigate('/mapa');
                      }}
                    >
                      <View style={s.mdIc}>
                        <Image source={IC.clase} style={s.mdIcImg} resizeMode="contain" />
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={s.mdN}>{c.materia}</Text>
                        <View style={s.mdM}>
                          <View style={s.mdMItem}>
                            <Mini src={c.virtual ? IC.video : IC.pin} />
                            <Text style={s.mdMTxt}>{c.virtual ? 'Virtual' : lugar}</Text>
                          </View>
                          <View style={s.mdMItem}>
                            <Mini src={IC.reloj} />
                            <Text style={s.mdMTxt}>{`${sin0(c.desde)} – ${sin0(c.hasta)}`}</Text>
                          </View>
                          {!!c.profesor && (
                            <View style={s.mdMItem}>
                              <Mini src={IC.persona} />
                              <Text style={s.mdMTxt}>{`Prof. ${c.profesor}`}</Text>
                            </View>
                          )}
                        </View>
                        <View style={s.mdTags}>
                          {enCurso && <Text style={[s.mdTag, s.mdTagAhora]}>En curso</Text>}
                          <Text style={s.mdTag}>{c.virtual ? 'Virtual' : 'Presencial'}</Text>
                        </View>
                      </View>
                    </Pressable>
                  );
                })
              )}
            </View>

            {/* banner: al tocarlo abre el sitio de la UNM */}
            <Pressable
              accessibilityRole="link"
              accessibilityLabel="Abrir el sitio de la Universidad Nacional de Moreno"
              onPress={() => Linking.openURL(URL_UNM).catch(() => {})}
              style={({ pressed }) => [s.hero, ancho && { height: 220 }, pressed && { opacity: 0.9 }]}
            >
              <Image
                source={FOTO_CAMPUS}
                style={[StyleSheet.absoluteFill, { width: '100%', height: '100%' }]}
                resizeMode="cover"
              />
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
            </Pressable>
          </View>

          {/* columna derecha: accesos, aulas libres, novedades */}
          <View style={ancho ? s.colDer : undefined}>
            <Text style={[s.quickTitle, ancho && { marginTop: 0 }]}>Accesos rápidos</Text>
            <View style={[s.quick, { flexWrap: 'wrap', rowGap: 12 }, ancho && { justifyContent: 'flex-start' }]}>
              <Pressable style={s.qbtn} onPress={() => setVerNotifs(true)}>
                <Image source={IC.novedades} style={s.qIc} resizeMode="contain" />
                <Text style={s.qTxt}>Novedades</Text>
              </Pressable>
              <Pressable style={s.qbtn} onPress={() => setVerProfes(true)}>
                <Image source={IC.profesores} style={s.qIc} resizeMode="contain" />
                <Text style={s.qTxt}>Profesores</Text>
              </Pressable>
              <Pressable
                style={s.qbtn}
                onPress={() => {
                  if (usuarioActual()?.id == null) {
                    Alert.alert('Mis notas', 'No pudimos identificar tu cuenta. Cerrá sesión y volvé a entrar.');
                    return;
                  }
                  setVerNotas(true);
                }}
              >
                {/* CAMBIO: icono teñido con el azul oscuro del tema */}
                <Image source={IC.calendario} style={s.qIcNavy} resizeMode="contain" />
                <Text style={s.qTxt}>Mis notas</Text>
              </Pressable>
            </View>

            <View style={s.bloque}>
              <View style={{ flex: 1 }}>
                <Text style={s.bloqueLabel}>AULAS LIBRES AHORA</Text>
                <Text style={s.bloqueSub}>{`${libres} de ${total} aulas sin clase`}</Text>
              </View>
              <Text style={s.libresNum}>{libres}</Text>
            </View>

           
          </View>
        </View>

        {/* solo se ve mientras desarrollan (expo start), no en la app final */}
        {__DEV__ && fuente === 'ejemplo' && (
          <Text style={s.dev}>Mostrando datos de ejemplo: el servidor no respondió o la base está vacía.</Text>
        )}
      </View>

            <AlertaImportante />
      <Modal visible={verProfes} animationType="slide" statusBarTranslucent onRequestClose={() => setVerProfes(false)}>
        <ProfesoresScreen alCerrar={() => setVerProfes(false)} />
      </Modal>
      <Modal visible={verNotifs} animationType="slide" statusBarTranslucent onRequestClose={() => setVerNotifs(false)}>
        <NotificacionesScreen alCerrar={() => setVerNotifs(false)} />
      </Modal>
      <Modal visible={verNotas} animationType="slide" statusBarTranslucent onRequestClose={() => setVerNotas(false)}>
        <View style={{ flex: 1, backgroundColor: '#fff', paddingTop: 40 }}>
          <MisNotas usuarioId={Number(usuarioActual()?.id)} alCerrar={() => setVerNotas(false)} />
        </View>
      </Modal>
    </ScrollView>
  );
}

export const makeStyles = (W: Wf) =>
  StyleSheet.create({
    screen: { flex: 1 },

    // contenedor centrado: en web no se estira a todo el ancho
    pagina: { width: '100%', maxWidth: 1100, alignSelf: 'center' },
    cols: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
    colIzq: { flex: 3, minWidth: 0 },
    colDer: { flex: 2, minWidth: 0 },

    homeHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingTop: 16, paddingHorizontal: 18, paddingBottom: 14 },
    h1: { fontFamily: F.h1, fontSize: 22, letterSpacing: 0.3, color: W.ink },
    plainBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
    campana: { width: 26, height: 26 },
    badge: { position: 'absolute', top: -3, right: -5, minWidth: 17, height: 17, borderRadius: 9, backgroundColor: '#e03131', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
    badgeTxt: { fontFamily: F.bodyBold, fontSize: 10, color: '#ffffff' },

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
    // CAMBIO: igual que qIc, pero teñido con el azul oscuro del tema (para los iconos que se veían claros)
    qIcNavy: { width: 34, height: 34, tintColor: W.navy },
    qTxt: { fontFamily: F.bold, fontSize: 10.5, color: W.ink, textAlign: 'center' },

    bloque: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 16, marginBottom: 10, padding: 14, borderRadius: 18, backgroundColor: W.card },
    bloqueLabel: { fontFamily: F.bold, fontSize: 10.5, letterSpacing: 0.6, color: W.meta, marginBottom: 4 },
    bloqueSub: { fontFamily: F.body, fontSize: 12.5, color: W.meta },
    libresNum: { fontFamily: F.h1, fontSize: 34, color: W.navy },
    avisoTitulo: { fontFamily: F.bold, fontSize: 13, color: W.ink },
    avisoIc: { width: 26, height: 26 },
    mdBtn: { alignSelf: 'flex-start', marginTop: 8, marginHorizontal: 6, marginBottom: 4, backgroundColor: W.tagBg, borderRadius: 999, paddingVertical: 7, paddingHorizontal: 14 },
    mdBtnTxt: { fontFamily: F.bold, fontSize: 11.5, color: W.tagInk },
    dev: { fontFamily: F.body, fontSize: 11, color: W.meta, textAlign: 'center', marginHorizontal: 18, marginTop: 4 },
  });