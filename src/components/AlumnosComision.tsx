import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ComisionConAlumnos, obtenerAlumnosPorComision } from '../lib/avisos';
import { useTema } from '../lib/tema';
import { Wf, useWf } from '../lib/wf';
import { F } from './InicioAlumno';

type Props = {
  usuarioId: number;
  alCerrar: () => void;
};

const claveDe = (c: ComisionConAlumnos) => `${c.materia}|${c.comision}`;

const fechaCorta = (v: string | null) => {
  if (!v) return '';
  const d = new Date(v);
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('es-AR', { day: 'numeric', month: 'numeric' });
};

export default function AlumnosComision({ usuarioId, alCerrar }: Props) {
  const { C } = useTema();
  const { W } = useWf();
  const s = useMemo(() => makeStyles(W), [W]);

  const [datos, setDatos] = useState<ComisionConAlumnos[]>([]);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [error, setError] = useState('');
  const [abiertas, setAbiertas] = useState<Set<string>>(new Set());

  const cargar = useCallback(async () => {
    try {
      setError('');
      setDatos(await obtenerAlumnosPorComision(usuarioId));
    } catch (e: any) {
      setError(e?.message || 'No pudimos cargar tus alumnos.');
    } finally {
      setCargando(false);
      setRefrescando(false);
    }
  }, [usuarioId]);

  // se carga cada vez que se abre la pantalla
  useEffect(() => {
    cargar();
  }, [cargar]);

  const alternar = (clave: string) =>
    setAbiertas((prev) => {
      const nuevo = new Set(prev);
      nuevo.has(clave) ? nuevo.delete(clave) : nuevo.add(clave);
      return nuevo;
    });

  // alumnos distintos (uno puede estar en más de una comisión)
  const total = useMemo(() => new Set(datos.flatMap((c) => c.alumnos.map((a) => a.id))).size, [datos]);

  return (
    <View style={[s.screen, { backgroundColor: C.bg }]}>
      <Pressable onPress={alCerrar} accessibilityLabel="Volver" style={s.volverBtn}>
        <Text style={s.volver}>‹ Volver</Text>
      </Pressable>
      <Text style={s.h1}>Alumnos de mis comisiones</Text>
      {!cargando && !error && (
        <Text style={s.sub}>{`${total} alumno${total === 1 ? '' : 's'} en la app`}</Text>
      )}

      {cargando ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={W.navy} />
      ) : error ? (
        <View style={s.card}>
          <Text style={s.error}>{error}</Text>
          <Pressable style={s.reintentar} onPress={() => { setCargando(true); cargar(); }}>
            <Text style={s.reintentarTxt}>Reintentar</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 60, gap: 10 }}
          refreshControl={
            <RefreshControl
              refreshing={refrescando}
              onRefresh={() => { setRefrescando(true); cargar(); }}
              tintColor={C.dim}
            />
          }
        >
          {datos.length === 0 && (
            <View style={s.card}>
              <Text style={s.vacio}>Todavía no tenés comisiones cargadas a tu nombre.</Text>
            </View>
          )}

          {datos.map((c) => {
            const clave = claveDe(c);
            const abierta = abiertas.has(clave);
            return (
              <View key={clave} style={s.card}>
                <Pressable style={s.cabeza} onPress={() => alternar(clave)}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.materia}>{c.materia}</Text>
                    {!!c.comision && <Text style={s.comision}>{`Comisión ${c.comision}`}</Text>}
                  </View>
                  <Text style={s.cuenta}>{c.alumnos.length}</Text>
                  <Text style={s.flecha}>{abierta ? '▾' : '▸'}</Text>
                </Pressable>

                {abierta &&
                  (c.alumnos.length === 0 ? (
                    <Text style={s.vacio}>Todavía no se anotó ningún alumno.</Text>
                  ) : (
                    c.alumnos.map((a) => (
                      <View key={a.id} style={s.alumno}>
                        <Text style={s.alumnoNombre}>{a.nombre}</Text>
                        {!!fechaCorta(a.desde) && <Text style={s.alumnoFecha}>{`Se anotó el ${fechaCorta(a.desde)}`}</Text>}
                      </View>
                    ))
                  ))}
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const makeStyles = (W: Wf) =>
  StyleSheet.create({
    screen: { flex: 1 },
    volverBtn: { paddingHorizontal: 18, paddingVertical: 8, alignSelf: 'flex-start' },
    volver: { fontFamily: F.bodyMed, fontSize: 15, color: W.navy },
    h1: { fontFamily: F.h1, fontSize: 20, color: W.ink, paddingHorizontal: 18 },
    sub: { fontFamily: F.body, fontSize: 12.5, color: W.meta, paddingHorizontal: 18, marginTop: 2, marginBottom: 12 },

    card: { backgroundColor: W.card, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 12, marginHorizontal: 0 },
    cabeza: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    materia: { fontFamily: F.bold, fontSize: 13, color: W.ink },
    comision: { fontFamily: F.body, fontSize: 11.5, color: W.meta, marginTop: 2 },
    cuenta: { fontFamily: F.bodyBold, fontSize: 11.5, color: W.tagInk, backgroundColor: W.tagBg, paddingVertical: 2, paddingHorizontal: 9, borderRadius: 999, overflow: 'hidden' },
    flecha: { fontFamily: F.bodyBold, fontSize: 14, color: W.meta, width: 14, textAlign: 'center' },

    alumno: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, backgroundColor: W.item, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 10, marginTop: 8 },
    alumnoNombre: { flex: 1, fontFamily: F.bodyMed, fontSize: 12.5, color: W.ink },
    alumnoFecha: { fontFamily: F.body, fontSize: 10.5, color: W.meta },

    vacio: { fontFamily: F.body, fontSize: 12.5, color: W.meta, paddingTop: 8 },
    error: { fontFamily: F.body, fontSize: 13, color: '#b00020' },
    reintentar: { alignSelf: 'flex-start', marginTop: 10, backgroundColor: W.tagBg, borderRadius: 999, paddingVertical: 7, paddingHorizontal: 14 },
    reintentarTxt: { fontFamily: F.bodyBold, fontSize: 11.5, color: W.tagInk },
  });