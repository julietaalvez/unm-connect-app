import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Linking,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

import { ClaseHoy, Fuente, cargarClasesHoy, clasesEjemplo } from '../lib/api';
import { aMinutos, contarAulasLibres, minutosDe, proximaClase } from '../lib/inicio';
import { labelFor } from '../lib/interior';
import { useNovedades } from '../lib/novedades';
import { usuarioActual } from '../lib/sesion';
import { useTema } from '../lib/tema';
import { useWf } from '../lib/wf';
import AvisarAlumnos from './AvisarAlumnos';
import EvaluacionesDocente from './EvaluacionesDocente';
import HeaderMapa from './HeaderMapa';
import { makeStyles } from './InicioAlumno';
import NotificacionesScreen from './NotificacionesScreen';

const FOTO_CAMPUS = require('../../assets/images/campus-foto.jpg');
const URL_UNM = 'https://www.unm.edu.ar/';
const IC = {
  campana: require('../../assets/icons/campana.png'),
  clase: require('../../assets/icons/clase.png'),
  novedades: require('../../assets/icons/novedades.png'),
  pin: require('../../assets/icons/pin.png'),
  reloj: require('../../assets/icons/reloj.png'),
  calendario: require('../../assets/icons/materias.png'),
};
const ICONO_TIPO = { aula: IC.pin, evento: IC.calendario, aviso: IC.campana };

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const sin0 = (h: string) => h.replace(/^0/, '');
const ANCHO_WEB = 900;

const Mini = ({ src }: { src: number }) => (
  <Image source={src} style={{ width: 12, height: 12 }} resizeMode="contain" />
);

/* ---- nombres: sin tildes, sin mayúsculas y sin importar el orden ---- */
const tokens = (t: string) =>
  t
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .split(/[\s,.]+/)
    .filter((x) => x && x !== 'prof');

const mismoNombre = (a: string, b: string) => {
  const ta = tokens(a);
  const tb = tokens(b);
  if (!ta.length || !tb.length) return false;
  const [corto, largo] = ta.length <= tb.length ? [ta, tb] : [tb, ta];
  return corto.every((x) => largo.includes(x));
};

const apellidoDocente = () => {
  const partes = (usuarioActual()?.nombre ?? '').trim().split(/\s+/).filter(Boolean);
  return partes.length ? partes[partes.length - 1] : 'docente';
};

export default function InicioProfesor() {
  const { C } = useTema();
  const { W } = useWf();
  const s = useMemo(() => makeStyles(W), [W]);
  const router = useRouter();
  const { width } = useWindowDimensions();
  const ancho = width >= ANCHO_WEB;

  const [clases, setClases] = useState<ClaseHoy[]>(() => clasesEjemplo());
  const [fuente, setFuente] = useState<Fuente>('ejemplo');
  const [verNotifs, setVerNotifs] = useState(false);
  const [verAvisar, setVerAvisar] = useState(false);
  const [verNotas, setVerNotas] = useState(false);
  const { lista: novedades, sinLeer, recargar: recargarNovedades } = useNovedades();
  const [, setTic] = useState(0);

  const cargar = useCallback(async () => {
    const c = await cargarClasesHoy();
    setClases(c.datos);
    setFuente(c.fuente);
  }, []);
  useEffect(() => {
    cargar();
  }, [cargar]);

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

  // las clases de hoy que dicta este docente
  const nombre = usuarioActual()?.nombre ?? '';
  const miDia = useMemo(
    () =>
      clases
        .filter((c) => mismoNombre(c.profesor, nombre))
        .sort((a, b) => aMinutos(a.desde) - aMinutos(b.desde)),
    [clases, nombre]
  );
  const proxima = proximaClase(miDia, min);
  const quedan = miDia.some((c) => aMinutos(c.hasta) > min);
  const fecha = `${DIAS[ahora.getDay()]} ${ahora.getDate()} de ${MESES[ahora.getMonth()]}`;
  const subtitulo = miDia.length && !quedan ? `Ya terminaste por hoy · ${fecha}` : `Hoy, ${fecha}`;

  // para el profesor, las novedades son solo las de la universidad (sin avisos de otros docentes)
  const novedadesUni = novedades.filter((n) => n.tipo !== 'aviso');

  return (
    <ScrollView
      style={[s.screen, { backgroundColor: C.bg }]}
      contentContainerStyle={{ paddingBottom: 140 }}
      contentInsetAdjustmentBehavior="never"
      refreshControl={
        <RefreshControl
          refreshing={false}
          onRefresh={() => {
            cargar();
            recargarNovedades();
          }}
          tintColor={C.dim}
        />
      }>
      <View style={s.pagina}>
        <HeaderMapa />

        {/* saludo + campana */}
        <View style={s.homeHead}>
          <Text style={s.h1}>{`HOLA PROF. ${apellidoDocente().toUpperCase()}!`}</Text>
          <Pressable
            style={s.plainBtn}
            accessibilityLabel={sinLeer > 0 ? `Notificaciones, ${sinLeer} sin leer` : 'Notificaciones'}
            onPress={() => setVerNotifs(true)}>
            <Image source={IC.campana} style={s.campana} resizeMode="contain" />
            {sinLeer > 0 && (
              <View style={s.badge}>
                <Text style={s.badgeTxt}>{sinLeer > 9 ? '9+' : sinLeer}</Text>
              </View>
            )}
          </Pressable>
        </View>

        <View style={ancho ? s.cols : undefined}>
          <View style={ancho ? s.colIzq : undefined}>
            {/* MI DÍA */}
            <View style={s.mdCard}>
              <Text style={s.mdTitulo}>MI DÍA</Text>
              <Text style={s.mdSub}>{subtitulo}</Text>

              {miDia.length === 0 ? (
                <Text style={s.mdNone}>Hoy no tenés clases.</Text>
              ) : (
                miDia.map((c, i) => {
                  const enCurso = aMinutos(c.desde) <= min && min < aMinutos(c.hasta);
                  const esProxima =
                    !enCurso && !!proxima && proxima.desde === c.desde && proxima.materia === c.materia;
                  const lugar = labelFor(c.aulaId) || c.aulaId;
                  return (
                    <Pressable
                      key={`${c.materia}-${c.desde}-${i}`}
                      style={({ pressed }) => [
                        s.mdItem,
                        (enCurso || esProxima) && s.mdItemAhora,
                        pressed && { transform: [{ scale: 0.99 }] },
                      ]}
                      onPress={() => router.navigate('/mapa')}>
                      <View style={s.mdIc}>
                        <Image source={IC.clase} style={s.mdIcImg} resizeMode="contain" />
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={s.mdN}>{c.materia}</Text>
                        <View style={s.mdM}>
                          <View style={s.mdMItem}>
                            <Mini src={IC.pin} />
                            <Text style={s.mdMTxt}>{lugar}</Text>
                          </View>
                          <View style={s.mdMItem}>
                            <Mini src={IC.reloj} />
                            <Text style={s.mdMTxt}>{`${sin0(c.desde)} – ${sin0(c.hasta)}`}</Text>
                          </View>
                        </View>
                        <View style={s.mdTags}>
                          {enCurso && <Text style={[s.mdTag, s.mdTagAhora]}>En curso</Text>}
                          {esProxima && <Text style={[s.mdTag, s.mdTagAhora]}>Próxima</Text>}
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
              style={({ pressed }) => [s.hero, ancho && { height: 220 }, pressed && { opacity: 0.9 }]}>
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

          <View style={ancho ? s.colDer : undefined}>
            <Text style={[s.quickTitle, ancho && { marginTop: 0 }]}>Accesos rápidos</Text>
            <View style={[s.quick, { flexWrap: 'wrap', rowGap: 12 }, ancho && { justifyContent: 'flex-start' }]}>
              <Pressable style={s.qbtn} onPress={() => setVerNotifs(true)}>
                <Image source={IC.novedades} style={s.qIc} resizeMode="contain" />
                <Text style={s.qTxt}>Novedades</Text>
              </Pressable>
              <Pressable
                style={s.qbtn}
                onPress={() => {
                  if (usuarioActual()?.id == null) {
                    Alert.alert(
                      'Avisar a mis alumnos',
                      'No pudimos identificar tu cuenta. Cerrá sesión y volvé a entrar.'
                    );
                    return;
                  }
                  setVerAvisar(true);
                }}>
                {/* CAMBIO: icono teñido con el azul oscuro del tema */}
                <Image source={IC.campana} style={s.qIcNavy} resizeMode="contain" />
                <Text style={s.qTxt}>Avisar a mis alumnos</Text>
              </Pressable>
              <Pressable
                style={s.qbtn}
                onPress={() => {
                  if (usuarioActual()?.id == null) {
                    Alert.alert(
                      'Evaluaciones y notas',
                      'No pudimos identificar tu cuenta. Cerrá sesión y volvé a entrar.'
                    );
                    return;
                  }
                  setVerNotas(true);
                }}>
                {/* CAMBIO: icono teñido con el azul oscuro del tema */}
                <Image source={IC.calendario} style={s.qIcNavy} resizeMode="contain" />
                <Text style={s.qTxt}>Evaluaciones y notas</Text>
              </Pressable>
              <Pressable
                style={s.qbtn}
                onPress={() => Alert.alert('Registrar presentes', 'Próximamente')}>
                {/* CAMBIO: icono teñido con el azul oscuro del tema */}
                <Image source={IC.clase} style={s.qIcNavy} resizeMode="contain" />
                <Text style={s.qTxt}>Registrar presentes</Text>
              </Pressable>
            </View>

            <View style={s.bloque}>
              <View style={{ flex: 1 }}>
                <Text style={s.bloqueLabel}>AULAS LIBRES AHORA</Text>
                <Text style={s.bloqueSub}>{`${libres} de ${total} aulas sin clase`}</Text>
              </View>
              <Text style={s.libresNum}>{libres}</Text>
            </View>

            <Text style={s.quickTitle}>Novedades</Text>
            {novedadesUni.length === 0 ? (
              <View style={s.bloque}>
                <Text style={s.bloqueSub}>No hay novedades por ahora.</Text>
              </View>
            ) : (
              novedadesUni.slice(0, 5).map((n) => (
                <View key={n.id} style={s.bloque}>
                  <Image source={ICONO_TIPO[n.tipo]} style={s.avisoIc} resizeMode="contain" />
                  <View style={{ flex: 1 }}>
                    <Text style={s.avisoTitulo}>{n.titulo}</Text>
                    {!!n.texto && <Text style={s.bloqueSub}>{n.texto}</Text>}
                  </View>
                </View>
              ))
            )}
          </View>
        </View>

        {__DEV__ && fuente === 'ejemplo' && (
          <Text style={s.dev}>Mostrando datos de ejemplo: el servidor no respondió o la base está vacía.</Text>
        )}
      </View>

      <Modal visible={verNotifs} animationType="slide" statusBarTranslucent onRequestClose={() => setVerNotifs(false)}>
        <NotificacionesScreen alCerrar={() => setVerNotifs(false)} />
      </Modal>

      <Modal visible={verAvisar} animationType="slide" statusBarTranslucent onRequestClose={() => setVerAvisar(false)}>
        <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: 40 }}>
          <AvisarAlumnos usuarioId={Number(usuarioActual()?.id)} onVolver={() => setVerAvisar(false)} />
        </View>
      </Modal>

      <Modal visible={verNotas} animationType="slide" statusBarTranslucent onRequestClose={() => setVerNotas(false)}>
        <View style={{ flex: 1, backgroundColor: '#fff', paddingTop: 40 }}>
          <EvaluacionesDocente usuarioId={Number(usuarioActual()?.id)} onVolver={() => setVerNotas(false)} />
        </View>
      </Modal>
    </ScrollView>
  );
}