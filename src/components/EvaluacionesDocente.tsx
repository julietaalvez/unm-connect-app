import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  AlumnoNota,
  Carrera,
  ESTADOS,
  Estado,
  Evaluacion,
  actualizarEvaluacion,
  aIsoUtc,
  borrarEvaluacion,
  crearEvaluacion,
  fechaAR,
  fechaARInput,
  guardarNota,
  obtenerAlumnos,
  obtenerCarrerasDocente,
  obtenerEvaluaciones,
} from '../lib/notas';

type Props = { usuarioId: number; onVolver?: () => void };
type Vista = { t: 'lista' } | { t: 'nueva' } | { t: 'detalle'; id: number };

const etiquetaEstado = (e: Estado) => ESTADOS.find((x) => x.valor === e)?.label ?? e;

/* ============================================================
   Pantalla principal: lista → nueva / detalle
   ============================================================ */
export default function EvaluacionesDocente({ usuarioId, onVolver }: Props) {
  const [vista, setVista] = useState<Vista>({ t: 'lista' });
  const [evals, setEvals] = useState<Evaluacion[]>([]);
  const [carreras, setCarreras] = useState<Carrera[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const recargar = useCallback(async () => {
    try {
      setError('');
      const [e, c] = await Promise.all([obtenerEvaluaciones(usuarioId), obtenerCarrerasDocente(usuarioId)]);
      setEvals(e);
      setCarreras(c);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  }, [usuarioId]);

  useEffect(() => {
    recargar();
  }, [recargar]);

  const nombreCarrera = (id: number) => carreras.find((c) => c.id === id)?.nombre ?? 'Carrera';

  if (cargando) return <View style={s.raiz}><ActivityIndicator style={{ marginTop: 40 }} /></View>;

  if (vista.t === 'nueva') {
    return (
      <View style={s.raiz}>
        <NuevaEvaluacion
          usuarioId={usuarioId}
          carreras={carreras}
          onVolver={() => setVista({ t: 'lista' })}
          onCreada={async (id) => {
            await recargar();
            setVista({ t: 'detalle', id });
          }}
        />
      </View>
    );
  }

  if (vista.t === 'detalle') {
    const ev = evals.find((e) => e.id === vista.id);
    if (ev) {
      return (
        <View style={s.raiz}>
          <Detalle
            key={ev.id}
            usuarioId={usuarioId}
            ev={ev}
            carrera={nombreCarrera(ev.carrera_id)}
            onVolver={async () => {
              await recargar();
              setVista({ t: 'lista' });
            }}
          />
        </View>
      );
    }
  }

  return (
    <View style={s.raiz}>
      <ScrollView contentContainerStyle={s.cont}>
        {onVolver && (
          <TouchableOpacity onPress={onVolver}>
            <Text style={s.volver}>‹ Volver</Text>
          </TouchableOpacity>
        )}
        <Text style={s.h1}>Evaluaciones y notas</Text>

        {!!error && <Text style={s.error}>{error}</Text>}

        {!error && carreras.length === 0 && (
          <Text style={s.vacio}>
            Tu cuenta no tiene carreras asociadas. Editá tu perfil para elegir en cuáles dictás.
          </Text>
        )}

        <TouchableOpacity
          style={[s.boton, carreras.length === 0 && s.botonOff]}
          disabled={carreras.length === 0}
          onPress={() => setVista({ t: 'nueva' })}>
          <Text style={s.botonTxt}>+ Nueva evaluación</Text>
        </TouchableOpacity>

        {evals.length === 0 && !error && carreras.length > 0 && (
          <Text style={[s.vacio, { marginTop: 20 }]}>Todavía no creaste ninguna evaluación.</Text>
        )}

        {evals.map((e) => (
          <TouchableOpacity key={e.id} style={s.tarjeta} onPress={() => setVista({ t: 'detalle', id: e.id })}>
            <Text style={s.chipTitulo}>{e.nombre}</Text>
            <Text style={s.chipSub}>{nombreCarrera(e.carrera_id)}</Text>
            <View style={s.fila}>
              <Text style={[s.etiqueta, e.estado === 'publicada' && s.etiquetaOk]}>{etiquetaEstado(e.estado)}</Text>
              {e.estado === 'programada' && !!e.publicar_en && (
                <Text style={s.chipSub}>{fechaAR(e.publicar_en)}</Text>
              )}
              <Text style={[s.chipSub, { marginLeft: 'auto' }]}>
                {e.cargadas} nota{e.cargadas === 1 ? '' : 's'}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

/* ============================================================
   Selector de estado (+ fecha si es programada)
   ============================================================ */
function SelectorEstado({
  estado,
  setEstado,
  fecha,
  setFecha,
}: {
  estado: Estado;
  setEstado: (e: Estado) => void;
  fecha: string;
  setFecha: (t: string) => void;
}) {
  return (
    <>
      <Text style={s.label}>Estado</Text>
      <View style={s.fila}>
        {ESTADOS.map((e) => (
          <TouchableOpacity
            key={e.valor}
            style={[s.pill, estado === e.valor && s.pillActivo]}
            onPress={() => setEstado(e.valor)}>
            <Text style={[s.pillTxt, estado === e.valor && s.textoActivo]}>{e.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={s.ayuda}>{ESTADOS.find((e) => e.valor === estado)?.ayuda}</Text>

      {estado === 'programada' && (
        <>
          <Text style={s.label}>Fecha y hora de publicación</Text>
          <TextInput
            style={s.input}
            value={fecha}
            onChangeText={setFecha}
            placeholder="AAAA-MM-DD HH:MM  (ej: 2026-11-20 18:00)"
            autoCapitalize="none"
            keyboardType="numbers-and-punctuation"
            maxLength={16}
          />
          <Text style={s.ayuda}>Hora de Argentina.</Text>
        </>
      )}
    </>
  );
}

/** Valida y devuelve el ISO UTC (o null si no es programada). Lanza Error con el mensaje para mostrar. */
function fechaParaEstado(estado: Estado, texto: string): string | null {
  if (estado !== 'programada') return null;
  const iso = aIsoUtc(texto);
  if (!iso) throw new Error('La fecha tiene que ser AAAA-MM-DD HH:MM, por ejemplo 2026-11-20 18:00.');
  if (new Date(iso).getTime() <= Date.now()) throw new Error('La fecha de publicación tiene que ser futura.');
  return iso;
}

/* ============================================================
   Nueva evaluación
   ============================================================ */
function NuevaEvaluacion({
  usuarioId,
  carreras,
  onVolver,
  onCreada,
}: {
  usuarioId: number;
  carreras: Carrera[];
  onVolver: () => void;
  onCreada: (id: number) => void;
}) {
  const [nombre, setNombre] = useState('');
  const [carreraId, setCarreraId] = useState<number | null>(carreras.length === 1 ? carreras[0].id : null);
  const [estado, setEstado] = useState<Estado>('borrador');
  const [fecha, setFecha] = useState('');
  const [creando, setCreando] = useState(false);

  const puede = nombre.trim().length > 0 && carreraId != null && !creando;

  const crear = async () => {
    try {
      const publicarEn = fechaParaEstado(estado, fecha);
      setCreando(true);
      const id = await crearEvaluacion(usuarioId, carreraId!, nombre.trim(), estado, publicarEn);
      onCreada(id);
    } catch (e: any) {
      Alert.alert('No se pudo crear', e.message);
      setCreando(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={s.cont} keyboardShouldPersistTaps="handled">
      <TouchableOpacity onPress={onVolver}>
        <Text style={s.volver}>‹ Volver</Text>
      </TouchableOpacity>
      <Text style={s.h1}>Nueva evaluación</Text>

      <Text style={s.label}>Nombre</Text>
      <TextInput
        style={s.input}
        value={nombre}
        onChangeText={setNombre}
        maxLength={120}
        placeholder="Ej: Primer parcial"
      />

      <Text style={s.label}>Carrera</Text>
      {carreras.map((c) => (
        <TouchableOpacity
          key={c.id}
          style={[s.chip, carreraId === c.id && s.chipActivo]}
          onPress={() => setCarreraId(c.id)}>
          <Text style={[s.chipTitulo, carreraId === c.id && s.textoActivo]}>{c.nombre}</Text>
        </TouchableOpacity>
      ))}

      <SelectorEstado estado={estado} setEstado={setEstado} fecha={fecha} setFecha={setFecha} />

      <TouchableOpacity style={[s.boton, !puede && s.botonOff]} disabled={!puede} onPress={crear}>
        {creando ? <ActivityIndicator color="#fff" /> : <Text style={s.botonTxt}>Crear y cargar notas</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

/* ============================================================
   Detalle: configuración + notas alumno por alumno
   ============================================================ */
function Detalle({
  usuarioId,
  ev,
  carrera,
  onVolver,
}: {
  usuarioId: number;
  ev: Evaluacion;
  carrera: string;
  onVolver: () => void;
}) {
  const [nombre, setNombre] = useState(ev.nombre);
  const [estado, setEstado] = useState<Estado>(ev.estado);
  const [fecha, setFecha] = useState(fechaARInput(ev.publicar_en));
  const [guardando, setGuardando] = useState(false);
  const [guardadoOk, setGuardadoOk] = useState(false);
  const [estadoGuardado, setEstadoGuardado] = useState<Estado>(ev.estado);

  const [q, setQ] = useState('');
  const [alumnos, setAlumnos] = useState<AlumnoNota[]>([]);
  const [cargandoAlumnos, setCargandoAlumnos] = useState(true);
  const [errorAlumnos, setErrorAlumnos] = useState('');
  const pedido = useRef(0);

  // búsqueda con una pequeña espera para no pedir en cada letra
  useEffect(() => {
    const n = ++pedido.current;
    const t = setTimeout(async () => {
      try {
        setErrorAlumnos('');
        const lista = await obtenerAlumnos(usuarioId, ev.id, q.trim());
        if (n === pedido.current) setAlumnos(lista);
      } catch (e: any) {
        if (n === pedido.current) setErrorAlumnos(e.message);
      } finally {
        if (n === pedido.current) setCargandoAlumnos(false);
      }
    }, q ? 300 : 0);
    return () => clearTimeout(t);
  }, [q, usuarioId, ev.id]);

  const guardarConfig = async () => {
    try {
      const publicarEn = fechaParaEstado(estado, fecha);
      if (!nombre.trim()) throw new Error('Poné un nombre.');
      setGuardando(true);
      await actualizarEvaluacion(usuarioId, ev.id, {
        nombre: nombre.trim(),
        estado,
        publicar_en: publicarEn,
      });
      setEstadoGuardado(estado);
      setGuardadoOk(true);
      setTimeout(() => setGuardadoOk(false), 2000);
    } catch (e: any) {
      Alert.alert('No se pudo guardar', e.message);
    } finally {
      setGuardando(false);
    }
  };

  const confirmarGuardar = () => {
    if (estado === 'publicada' && estadoGuardado !== 'publicada') {
      Alert.alert(
        'Publicar notas',
        'Los alumnos van a poder ver sus notas ahora mismo. ¿Publicar?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Publicar', onPress: guardarConfig },
        ]
      );
    } else {
      guardarConfig();
    }
  };

  const eliminar = () => {
    Alert.alert('Eliminar evaluación', 'Se borran también todas las notas cargadas. No se puede deshacer.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await borrarEvaluacion(usuarioId, ev.id);
            onVolver();
          } catch (e: any) {
            Alert.alert('No se pudo eliminar', e.message);
          }
        },
      },
    ]);
  };

  const guardarUna = async (alumnoId: number, valor: string) => {
    await guardarNota(usuarioId, ev.id, alumnoId, valor);
    setAlumnos((prev) => prev.map((a) => (a.id === alumnoId ? { ...a, nota: valor || null } : a)));
  };

  return (
    <ScrollView contentContainerStyle={s.cont} keyboardShouldPersistTaps="handled">
      <TouchableOpacity onPress={onVolver}>
        <Text style={s.volver}>‹ Volver</Text>
      </TouchableOpacity>
      <Text style={s.h1}>{ev.nombre}</Text>
      <Text style={s.chipSub}>{carrera}</Text>

      <Text style={s.label}>Nombre</Text>
      <TextInput style={s.input} value={nombre} onChangeText={setNombre} maxLength={120} />

      <SelectorEstado estado={estado} setEstado={setEstado} fecha={fecha} setFecha={setFecha} />

      <TouchableOpacity style={[s.botonChico, guardando && s.botonOff]} disabled={guardando} onPress={confirmarGuardar}>
        {guardando ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={s.botonTxt}>{guardadoOk ? '✓ Guardado' : 'Guardar cambios'}</Text>
        )}
      </TouchableOpacity>

      <Text style={[s.label, { marginTop: 28 }]}>Notas</Text>
      <Text style={s.ayuda}>
        Escribí la nota (por ejemplo 8, Ausente o Abandono) y salí del campo para guardarla. Si lo dejás vacío, se borra.
      </Text>

      <TextInput
        style={[s.input, { marginTop: 10 }]}
        value={q}
        onChangeText={setQ}
        placeholder="Buscar alumno por nombre"
        autoCorrect={false}
      />

      {cargandoAlumnos && <ActivityIndicator style={{ marginTop: 20 }} />}
      {!!errorAlumnos && <Text style={s.error}>{errorAlumnos}</Text>}
      {!cargandoAlumnos && !errorAlumnos && alumnos.length === 0 && (
        <Text style={[s.vacio, { marginTop: 14 }]}>
          {q ? 'No hay alumnos con ese nombre en esta carrera.' : 'Todavía no hay alumnos registrados en esta carrera.'}
        </Text>
      )}
      {alumnos.length >= 50 && <Text style={s.ayuda}>Se muestran los primeros 50. Usá el buscador para encontrar a otros.</Text>}

      {alumnos.map((a) => (
        <FilaAlumno key={a.id} alumno={a} onGuardar={guardarUna} />
      ))}

      <TouchableOpacity style={s.eliminar} onPress={eliminar}>
        <Text style={s.eliminarTxt}>Eliminar evaluación</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function FilaAlumno({
  alumno,
  onGuardar,
}: {
  alumno: AlumnoNota;
  onGuardar: (id: number, valor: string) => Promise<void>;
}) {
  const [valor, setValor] = useState(alumno.nota ?? '');
  const guardada = useRef(alumno.nota ?? '');
  const [estado, setEstado] = useState<'' | 'guardando' | 'ok'>('');

  const alSalir = async () => {
    const nuevo = valor.trim();
    if (nuevo === guardada.current) return;
    setEstado('guardando');
    try {
      await onGuardar(alumno.id, nuevo);
      guardada.current = nuevo;
      setValor(nuevo);
      setEstado('ok');
      setTimeout(() => setEstado(''), 1500);
    } catch (e: any) {
      setValor(guardada.current);
      setEstado('');
      Alert.alert('No se pudo guardar', e.message);
    }
  };

  return (
    <View style={s.filaAlumno}>
      <Text style={s.nombreAlumno} numberOfLines={2}>{alumno.nombre}</Text>
      <Text style={s.estadoFila}>{estado === 'guardando' ? '…' : estado === 'ok' ? '✓' : ''}</Text>
      <TextInput
        style={s.inputNota}
        value={valor}
        onChangeText={setValor}
        onBlur={alSalir}
        onSubmitEditing={alSalir}
        placeholder="Nota"
        maxLength={40}
        returnKeyType="done"
      />
    </View>
  );
}

const s = StyleSheet.create({
  raiz: { flex: 1, backgroundColor: '#fff' },
  cont: { padding: 20, paddingBottom: 60 },
  volver: { fontSize: 16, color: '#1e5aa8', marginBottom: 8 },
  h1: { fontSize: 22, fontWeight: '700', marginBottom: 8, color: '#111' },
  label: { fontSize: 14, fontWeight: '600', marginTop: 16, marginBottom: 6, color: '#111' },
  ayuda: { fontSize: 12.5, color: '#666', marginTop: 6 },
  vacio: { color: '#666' },
  error: { marginVertical: 12, color: '#b00020' },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  chip: { borderWidth: 1, borderColor: '#ccc', borderRadius: 10, padding: 12, marginBottom: 8 },
  chipActivo: { backgroundColor: '#1e5aa8', borderColor: '#1e5aa8' },
  chipTitulo: { fontSize: 15, fontWeight: '600', color: '#111' },
  chipSub: { fontSize: 12.5, color: '#666', marginTop: 2 },
  textoActivo: { color: '#fff' },
  tarjeta: { borderWidth: 1, borderColor: '#ddd', borderRadius: 12, padding: 14, marginTop: 12 },
  etiqueta: {
    fontSize: 11.5, fontWeight: '700', color: '#555', backgroundColor: '#eee',
    paddingVertical: 3, paddingHorizontal: 9, borderRadius: 999, overflow: 'hidden', marginTop: 6,
  },
  etiquetaOk: { color: '#1b6b2f', backgroundColor: '#dff3e4' },
  pill: { borderWidth: 1, borderColor: '#ccc', borderRadius: 999, paddingVertical: 8, paddingHorizontal: 14 },
  pillActivo: { backgroundColor: '#1e5aa8', borderColor: '#1e5aa8' },
  pillTxt: { fontSize: 13.5, fontWeight: '600', color: '#111' },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 10, padding: 12, fontSize: 15, color: '#111' },
  boton: { backgroundColor: '#1e5aa8', borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 20 },
  botonChico: { backgroundColor: '#1e5aa8', borderRadius: 10, padding: 12, alignItems: 'center', marginTop: 16 },
  botonOff: { opacity: 0.4 },
  botonTxt: { color: '#fff', fontWeight: '700', fontSize: 15 },
  filaAlumno: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderBottomWidth: 1, borderBottomColor: '#eee', paddingVertical: 10,
  },
  nombreAlumno: { flex: 1, fontSize: 15, color: '#111' },
  estadoFila: { width: 16, textAlign: 'center', color: '#1b6b2f', fontWeight: '700' },
  inputNota: {
    width: 110, borderWidth: 1, borderColor: '#ccc', borderRadius: 8,
    paddingVertical: 8, paddingHorizontal: 10, fontSize: 15, color: '#111', textAlign: 'center',
  },
  eliminar: { marginTop: 36, alignItems: 'center', padding: 12 },
  eliminarTxt: { color: '#b00020', fontWeight: '600', fontSize: 14 },
});