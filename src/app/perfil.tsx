import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import AlumnosComision from '../components/AlumnosComision';
import EditarPerfil from '../components/EditarPerfil';
import HeaderMapa from '../components/HeaderMapa';
import PlanillaMaterias from '../components/PlanillaMaterias';
import { FUENTE } from '../data/profes';
import { materiaDeMisCarreras, useCarreras, useMateriaCarreras, useMisCarreras } from '../lib/carreras';
import type { Cursada } from '../lib/inscripciones';
import { armarCursadas, useCatalogo, useInscripciones } from '../lib/inscripciones';
import { usePush } from '../lib/novedades';
import { DIAS_CORTO } from '../lib/profes';
import { cerrarSesion, usuarioActual } from '../lib/sesion';
import { useTema } from '../lib/tema';
import { Wf, useWf } from '../lib/wf';

// ── TUS ICONOS PNG ── si algún archivo se llama distinto, cambiá solo el nombre entre comillas
const ICONOS = {
  perfil: require('../../assets/icons/perfil.png'),
  materias: require('../../assets/icons/materias.png'),
  profesores: require('../../assets/icons/profesores.png'),
  notificaciones: require('../../assets/icons/notificaciones.png'),
  ajustes: require('../../assets/icons/ajustes.png'),
  cerrarSesion: require('../../assets/icons/cerrar-sesion.png'),
  editar: require('../../assets/icons/editar.png'),
  atras: require('../../assets/icons/atras.png'),
  adelante: require('../../assets/icons/adelante.png'),
  mas: require('../../assets/icons/mas.png'),
};

const F = {
  h2: 'Montserrat_800ExtraBold',
  semi: 'Montserrat_600SemiBold',
  body: 'Roboto_400Regular',
  bodyMed: 'Roboto_500Medium',
};

const sin0 = (h: string) => h.replace(/^0/, '');

const iniciales = (nombre: string) => {
  const p = nombre.trim().split(/\s+/);
  return ((p[0]?.[0] ?? '') + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase() || '?';
};

const norm = (t: string) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

const lineaFranja = (f: Cursada['franjas'][number]) =>
  `${f.dias.map((d) => DIAS_CORTO[d]).join(', ')} ${sin0(f.desde)}–${sin0(f.hasta)} · ${f.modo === 'virtual' ? 'Virtual' : f.lugar}${f.alterna ? ' · sem. por medio' : ''}`;

const ROL: Record<string, string> = {
  estudiante: 'Estudiante de Multimedial',
  profesor: 'Docente',
  docente: 'Docente',
  admin: 'Administración',
};

// Un icono PNG con tamaño fijo
const Icono = ({ src, size = 22 }: { src: number; size?: number }) => (
  <Image source={src} style={{ width: size, height: size }} resizeMode="contain" />
);

export default function PerfilScreen() {
  const router = useRouter();
  const { C, modo, alternar } = useTema();
  const { W, oscuro } = useWf();
  const s = useMemo(() => makeStyles(W, oscuro), [W, oscuro]);

  const [abMaterias, setAbMaterias] = useState(false);
  const [abAjustes, setAbAjustes] = useState(false);
  const [agregando, setAgregando] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [verPlanilla, setVerPlanilla] = useState(false);
  const [verAlumnos, setVerAlumnos] = useState(false);
  const [editando, setEditando] = useState(false);
  const [, refrescar] = useState(0);
  const [abNotif, setAbNotif] = useState(false);
  const { activo: pushActivo, cambiar: cambiarPush } = usePush();

  const u = usuarioActual();
  const nombre = u?.nombre ?? 'Invitado';
  const esProfesor = u?.rol === 'profesor';
  const catalogo = useCatalogo();
  const { claves, inscribir, quitar } = useInscripciones();
  const { carreras } = useCarreras();
  const { ids: misCarreras, guardar: guardarCarreras } = useMisCarreras();
  const materiaCarreras = useMateriaCarreras();
  const todas = useMemo(() => armarCursadas(catalogo), [catalogo]);
  const misCursadas = useMemo(() => todas.filter((c) => claves.has(c.clave)), [todas, claves]);
  const resultados = useMemo(() => {
    const q = norm(busqueda.trim());
    return todas
      .filter((c) =>
        !claves.has(c.clave) &&
        materiaDeMisCarreras(c.materia, materiaCarreras, misCarreras) &&
        (!q || norm(c.materia).includes(q) || norm(c.comision).includes(q) || c.profes.some((p) => norm(p).includes(q)))
      )
      .slice(0, 25);
  }, [todas, claves, busqueda, materiaCarreras, misCarreras]);

  const salir = () =>
    Alert.alert('Cerrar sesión', '¿Querés salir de tu cuenta?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Salir', style: 'destructive', onPress: cerrarSesion },
    ]);

  const abrirAlumnos = () => {
    if (u?.id == null) {
      Alert.alert('Alumnos de mis comisiones', 'No pudimos identificar tu cuenta. Cerrá sesión y volvé a entrar.');
      return;
    }
    setVerAlumnos(true);
  };

  const Fila = ({ icono, texto, onPress, abierto }: { icono: number; texto: string; onPress: () => void; abierto?: boolean }) => (
    <Pressable style={({ pressed }) => [s.fila, pressed && { transform: [{ scale: 0.99 }] }]} onPress={onPress}>
      <View style={s.filaIco}>
        <Icono src={icono} />
      </View>
      <Text style={s.filaTxt}>{texto}</Text>
      <View style={abierto ? { transform: [{ rotate: '90deg' }] } : undefined}>
        <Icono src={ICONOS.adelante} size={20} />
      </View>
    </Pressable>
  );

  return (
    <ScrollView
      style={[s.screen, { backgroundColor: C.bg }]}
      contentContainerStyle={{ paddingBottom: 140 }}
      contentInsetAdjustmentBehavior="never"
    >
      <HeaderMapa />

      {/* volver + editar */}
      <View style={s.cfgHead}>
        <Pressable style={s.plainBtn} accessibilityLabel="Volver al inicio" onPress={() => router.navigate('/')}>
          <Icono src={ICONOS.atras} size={26} />
        </Pressable>
        <Pressable style={s.plainBtn} accessibilityLabel="Editar perfil" onPress={() => setEditando(true)}>
          <Icono src={ICONOS.editar} size={24} />
        </Pressable>
      </View>

      {/* foto + nombre */}
      <View style={s.profile}>
        <View style={s.avatar}>
          {u?.foto ? (
            <Image source={{ uri: u.foto }} style={s.avatarImg} />
          ) : (
            <Text style={s.avatarTxt}>{iniciales(nombre)}</Text>
          )}
        </View>
        <Text style={s.nombre}>{nombre}</Text>
        <Text style={s.rol}>{ROL[u?.rol ?? 'estudiante'] ?? u?.rol}</Text>
        {!!u?.email && <Text style={s.email}>{u.email}</Text>}
      </View>

      {/* lista */}
      <View style={s.lista}>
        <Fila icono={ICONOS.perfil} texto="Mi perfil" onPress={() => setEditando(true)} />

        <Fila icono={ICONOS.materias} texto="Mis materias" abierto={abMaterias} onPress={() => setAbMaterias((v) => !v)} />
        {abMaterias && (
          <View style={s.sub}>
            <View style={s.matCard}>
              <Text style={s.matB}>Mis carreras</Text>
              <Text style={s.matC}>Al buscar materias solo vas a ver las de las carreras que elijas.</Text>
              <View style={s.chips}>
                {carreras.map((c) => {
                  const on = misCarreras.includes(c.id);
                  return (
                    <Pressable
                      key={c.id}
                      style={[s.chip, on && { backgroundColor: W.navy }]}
                      onPress={() => guardarCarreras(on ? misCarreras.filter((x) => x !== c.id) : [...misCarreras, c.id])}
                    >
                      <Text style={[s.chipTxt, on && { color: '#ffffff' }]}>{c.nombre}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {misCursadas.length === 0 ? (
              <View style={s.matCard}>
                <Text style={s.matC}>Todavía no agregaste materias. Tocá "Agregar materias" para elegir las que cursás.</Text>
              </View>
            ) : (
              misCursadas.map((c) => (
                <View key={c.clave} style={s.matCard}>
                  <Text style={s.matB}>{c.materia}</Text>
                  <Text style={s.matC}>{`Comisión ${c.comision}${c.profes.length ? ` · Prof. ${c.profes.join(', ')}` : ''}`}</Text>
                  {c.franjas.map((f, i) => (
                    <Text key={i} style={s.matH}>{lineaFranja(f)}</Text>
                  ))}
                  <Pressable style={s.miniBtn} onPress={() => quitar(c.clave)}>
                    <Text style={s.miniBtnTxt}>Quitar</Text>
                  </Pressable>
                </View>
              ))
            )}

            <Pressable style={s.btnAgregar} onPress={() => setAgregando((v) => !v)}>
              <Image source={ICONOS.mas} style={{ width: 16, height: 16, tintColor: oscuro ? '#04101f' : '#ffffff' }} resizeMode="contain" />
              <Text style={s.btnAgregarTxt}>{agregando ? 'Cerrar búsqueda' : 'Agregar materias'}</Text>
            </Pressable>

            {agregando && (
              <>
                <TextInput
                  value={busqueda}
                  onChangeText={setBusqueda}
                  placeholder="Buscar materia, comisión o docente"
                  placeholderTextColor={W.meta}
                  style={s.buscador}
                />
                {resultados.length === 0 ? (
                  <View style={s.matCard}>
                    <Text style={s.matC}>No hay materias que coincidan.</Text>
                  </View>
                ) : (
                  resultados.map((c) => (
                    <View key={c.clave} style={s.resFila}>
                      <View style={{ flex: 1 }}>
                        <Text style={s.matB}>{c.materia}</Text>
                        <Text style={s.matC}>{`Comisión ${c.comision}${c.profes.length ? ` · ${c.profes.join(', ')}` : ''}`}</Text>
                      </View>
                      <Pressable style={s.miniBtn} onPress={() => inscribir(c.clave)}>
                        <Text style={s.miniBtnTxt}>Agregar</Text>
                      </Pressable>
                    </View>
                  ))
                )}
              </>
            )}
          </View>
        )}

        {/* alumnos: la planilla de progreso es para estudiantes; el docente ve quién se anotó en sus comisiones */}
        {esProfesor ? (
          <Fila icono={ICONOS.profesores} texto="Alumnos de mis comisiones" onPress={abrirAlumnos} />
        ) : (
          <Fila icono={ICONOS.materias} texto="Planilla de mi carrera" onPress={() => setVerPlanilla(true)} />
        )}

        <Fila icono={ICONOS.notificaciones} texto="Notificaciones" abierto={abNotif} onPress={() => setAbNotif((v) => !v)} />
        {abNotif && (
          <View style={s.sub}>
            <Pressable style={s.subFila} onPress={cambiarPush} accessibilityRole="switch" accessibilityState={{ checked: pushActivo }}>
              <Text style={s.subTxt}>Recibir avisos en el celular</Text>
              <View style={[s.switchTrack, pushActivo && { backgroundColor: W.navy }]}>
                <View style={[s.switchThumb, pushActivo && { left: 23 }]} />
              </View>
            </Pressable>
            <Text style={s.matC}>Cambios de aula y eventos importantes. Igual los ves siempre en la campanita de Inicio.</Text>
          </View>
        )}

        <Fila icono={ICONOS.ajustes} texto="Configuración" abierto={abAjustes} onPress={() => setAbAjustes((v) => !v)} />
        {abAjustes && (
          <View style={s.sub}>
            <Pressable style={s.subFila} onPress={alternar} accessibilityRole="switch" accessibilityState={{ checked: modo === 'dark' }}>
              <Text style={s.subTxt}>Modo oscuro</Text>
              <View style={[s.switchTrack, modo === 'dark' && { backgroundColor: W.navy }]}>
                <View style={[s.switchThumb, modo === 'dark' && { left: 23 }]} />
              </View>
            </Pressable>
          </View>
        )}

        <Fila icono={ICONOS.cerrarSesion} texto="Cerrar sesión" onPress={salir} />
      </View>

      <Text style={s.version}>{`UNM Connect · ${FUENTE}`}</Text>

      {esProfesor ? (
        <Modal visible={verAlumnos} animationType="slide" statusBarTranslucent onRequestClose={() => setVerAlumnos(false)}>
          <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: 40 }}>
            <AlumnosComision usuarioId={Number(u?.id)} alCerrar={() => setVerAlumnos(false)} />
          </View>
        </Modal>
      ) : (
        <Modal visible={verPlanilla} animationType="slide" statusBarTranslucent onRequestClose={() => setVerPlanilla(false)}>
          <PlanillaMaterias alCerrar={() => setVerPlanilla(false)} />
        </Modal>
      )}
      <Modal visible={editando} animationType="slide" onRequestClose={() => setEditando(false)}>
        <EditarPerfil alCerrar={() => setEditando(false)} alGuardar={() => refrescar((n) => n + 1)} />
      </Modal>
    </ScrollView>
  );
}

const makeStyles = (W: Wf, oscuro: boolean) =>
  StyleSheet.create({
    screen: { flex: 1 },

    cfgHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, paddingHorizontal: 18 },
    plainBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },

    profile: { alignItems: 'center', paddingHorizontal: 18, paddingBottom: 16 },
    avatar: { width: 108, height: 108, borderRadius: 54, backgroundColor: W.card, alignItems: 'center', justifyContent: 'center', marginBottom: 12, overflow: 'hidden' },
    avatarImg: { width: 108, height: 108, borderRadius: 54 },
    avatarTxt: { fontFamily: F.h2, fontSize: 34, color: oscuro ? W.ink : W.navy },
    nombre: { fontFamily: F.h2, fontSize: 19, color: W.ink, textAlign: 'center' },
    rol: { fontFamily: F.body, fontSize: 13, color: W.ink, marginTop: 4, textAlign: 'center' },
    email: { fontFamily: F.body, fontSize: 11.5, color: W.meta, marginTop: 2, textAlign: 'center' },

    lista: { paddingHorizontal: 30, paddingTop: 4, paddingBottom: 18, gap: 12 },
    fila: {
      flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: W.card, borderRadius: 10,
      paddingVertical: 9, paddingLeft: 14, paddingRight: 12,
      shadowColor: '#1a3399', shadowOpacity: oscuro ? 0 : 0.35, shadowRadius: 5, shadowOffset: { width: 0, height: 3 }, elevation: oscuro ? 0 : 3,
    },
    filaIco: { width: 22, height: 22, alignItems: 'center', justifyContent: 'center' },
    filaTxt: { flex: 1, fontFamily: F.bodyMed, fontSize: 13.5, color: W.ink },

    sub: { gap: 8, marginTop: -4 },
    subFila: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: W.soft, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12 },
    subTxt: { flex: 1, fontFamily: F.bodyMed, fontSize: 13, color: W.ink },

    switchTrack: { width: 44, height: 24, borderRadius: 12, backgroundColor: W.tile, justifyContent: 'center' },
    switchThumb: { position: 'absolute', top: 3, left: 3, width: 18, height: 18, borderRadius: 9, backgroundColor: '#ffffff', elevation: 2 },

    matCard: { backgroundColor: W.soft, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
    chip: { backgroundColor: W.card, borderRadius: 999, paddingVertical: 7, paddingHorizontal: 12 },
    chipTxt: { fontFamily: F.bodyMed, fontSize: 12, color: W.ink },
    matB: { fontFamily: F.semi, fontSize: 12.5, color: W.ink },
    matC: { fontFamily: F.body, fontSize: 11, color: W.meta, marginTop: 2, marginBottom: 4 },
    matH: { fontFamily: F.body, fontSize: 12, lineHeight: 18, color: W.ink },
    miniBtn: { alignSelf: 'flex-start', marginTop: 8, borderRadius: 999, paddingVertical: 5, paddingHorizontal: 12, backgroundColor: W.tile },
    miniBtnTxt: { fontFamily: F.bodyMed, fontSize: 11.5, color: W.ink },
    btnAgregar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: W.navy, borderRadius: 10, paddingVertical: 11 },
    btnAgregarTxt: { fontFamily: F.semi, fontSize: 13, color: oscuro ? '#04101f' : '#ffffff' },
    buscador: { backgroundColor: W.soft, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontFamily: F.body, fontSize: 13, color: W.ink },
    resFila: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: W.soft, borderRadius: 10, paddingVertical: 9, paddingHorizontal: 12 },

    version: { fontFamily: F.body, fontSize: 11, color: W.meta, textAlign: 'center', paddingHorizontal: 22, paddingBottom: 22, lineHeight: 16 },
  });