import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { MiNota, obtenerMisNotas } from '../lib/notas';

type Props = { usuarioId: number; alCerrar?: () => void };

export default function MisNotas({ usuarioId, alCerrar }: Props) {
  const [notas, setNotas] = useState<MiNota[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    try {
      setError('');
      setNotas(await obtenerMisNotas(usuarioId));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  }, [usuarioId]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  return (
    <View style={s.raiz}>
      <ScrollView
        contentContainerStyle={s.cont}
        refreshControl={<RefreshControl refreshing={false} onRefresh={cargar} />}>
        {alCerrar && (
          <TouchableOpacity onPress={alCerrar}>
            <Text style={s.volver}>‹ Volver</Text>
          </TouchableOpacity>
        )}
        <Text style={s.h1}>Mis notas</Text>

        {cargando && <ActivityIndicator style={{ marginTop: 30 }} />}
        {!!error && <Text style={s.error}>{error}</Text>}
        {!cargando && !error && notas.length === 0 && (
          <Text style={s.vacio}>Todavía no tenés notas publicadas.</Text>
        )}

        {notas.map((n) => (
          <View key={n.evaluacion_id} style={s.tarjeta}>
            <View style={{ flex: 1 }}>
              <Text style={s.titulo}>{n.evaluacion}</Text>
              <Text style={s.sub}>{n.carrera}</Text>
            </View>
            <Text style={s.nota}>{n.nota}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  raiz: { flex: 1, backgroundColor: '#fff' },
  cont: { padding: 20, paddingBottom: 60 },
  volver: { fontSize: 16, color: '#1e5aa8', marginBottom: 8 },
  h1: { fontSize: 22, fontWeight: '700', marginBottom: 12, color: '#111' },
  vacio: { color: '#666', marginTop: 8 },
  error: { color: '#b00020', marginTop: 12 },
  tarjeta: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1, borderColor: '#ddd', borderRadius: 12, padding: 14, marginTop: 10,
  },
  titulo: { fontSize: 15, fontWeight: '600', color: '#111' },
  sub: { fontSize: 12.5, color: '#666', marginTop: 2 },
  nota: { fontSize: 22, fontWeight: '800', color: '#1e5aa8', maxWidth: 140, textAlign: 'right' },
});