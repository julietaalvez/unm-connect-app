import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert, StyleSheet,
} from 'react-native';
import { ComisionDocente, claveDe, obtenerComisiones, enviarAviso } from '../lib/avisos';

type Props = {
  usuarioId: number;
  onVolver?: () => void;
};

export default function AvisarAlumnos({ usuarioId, onVolver }: Props) {
  const [comisiones, setComisiones] = useState<ComisionDocente[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [elegidas, setElegidas] = useState<Set<string>>(new Set());
  const [titulo, setTitulo] = useState('');
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    obtenerComisiones(usuarioId)
      .then(setComisiones)
      .catch((e) => setError(e.message))
      .finally(() => setCargando(false));
  }, [usuarioId]);

  const alternar = (clave: string) => {
    setElegidas((prev) => {
      const nuevo = new Set(prev);
      nuevo.has(clave) ? nuevo.delete(clave) : nuevo.add(clave);
      return nuevo;
    });
  };

  const totalAlumnos = comisiones
    .filter((c) => elegidas.has(claveDe(c)))
    .reduce((s, c) => s + c.alumnos, 0);

  const puedeEnviar = elegidas.size > 0 && titulo.trim().length > 0 && texto.trim().length > 0 && !enviando;

  const confirmar = () => {
    Alert.alert(
      'Enviar aviso',
      `Lo van a recibir ${totalAlumnos} alumno${totalAlumnos === 1 ? '' : 's'} en ${elegidas.size} comisión${elegidas.size === 1 ? '' : 'es'}. No se puede borrar desde la app.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Enviar', onPress: enviar },
      ]
    );
  };

  const enviar = async () => {
    setEnviando(true);
    try {
      await enviarAviso(usuarioId, [...elegidas], titulo.trim(), texto.trim());
      Alert.alert('Aviso enviado', 'Tus alumnos ya pueden verlo en Novedades.');
      setTitulo('');
      setTexto('');
      setElegidas(new Set());
      onVolver?.();
    } catch (e: any) {
      Alert.alert('No se pudo enviar', e.message);
    } finally {
      setEnviando(false);
    }
  };

  if (cargando) return <ActivityIndicator style={{ marginTop: 40 }} />;
  if (error) return <Text style={s.error}>{error}</Text>;

  return (
    <ScrollView contentContainerStyle={s.cont} keyboardShouldPersistTaps="handled">
      {onVolver && (
        <TouchableOpacity onPress={onVolver}>
          <Text style={s.volver}>‹ Volver</Text>
        </TouchableOpacity>
      )}
      <Text style={s.h1}>Avisar a mis alumnos</Text>

      <Text style={s.label}>¿A quién va?</Text>
      {comisiones.length === 0 && (
        <Text style={s.vacio}>Todavía no tenés comisiones cargadas a tu nombre.</Text>
      )}
      {comisiones.map((c) => {
        const clave = claveDe(c);
        const activa = elegidas.has(clave);
        return (
          <TouchableOpacity
            key={clave}
            style={[s.chip, activa && s.chipActivo]}
            onPress={() => alternar(clave)}
          >
            <Text style={[s.chipTitulo, activa && s.chipTextoActivo]}>
              {c.materia}{c.comision ? ` · Comisión ${c.comision}` : ''}
            </Text>
            <Text style={[s.chipSub, activa && s.chipTextoActivo]}>
              {c.alumnos} alumno{c.alumnos === 1 ? '' : 's'} en la app
            </Text>
          </TouchableOpacity>
        );
      })}

      <Text style={s.label}>Título</Text>
      <TextInput
        style={s.input}
        value={titulo}
        onChangeText={setTitulo}
        maxLength={60}
        placeholder="Ej: Cambio de aula"
      />
      <Text style={s.contador}>{titulo.length}/60</Text>

      <Text style={s.label}>Mensaje</Text>
      <TextInput
        style={[s.input, { height: 120, textAlignVertical: 'top' }]}
        value={texto}
        onChangeText={setTexto}
        maxLength={300}
        multiline
        placeholder="Escribí el aviso para tus alumnos"
      />
      <Text style={s.contador}>{texto.length}/300</Text>

      <TouchableOpacity
        style={[s.boton, !puedeEnviar && s.botonOff]}
        disabled={!puedeEnviar}
        onPress={confirmar}
      >
        {enviando ? <ActivityIndicator color="#fff" /> : <Text style={s.botonTxt}>Enviar aviso</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  cont: { padding: 20, paddingBottom: 60 },
  volver: { fontSize: 16, color: '#1e5aa8', marginBottom: 8 },
  h1: { fontSize: 22, fontWeight: '700', marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', marginTop: 16, marginBottom: 6 },
  vacio: { color: '#666' },
  chip: { borderWidth: 1, borderColor: '#ccc', borderRadius: 10, padding: 12, marginBottom: 8 },
  chipActivo: { backgroundColor: '#1e5aa8', borderColor: '#1e5aa8' },
  chipTitulo: { fontSize: 15, fontWeight: '600' },
  chipSub: { fontSize: 12, color: '#666', marginTop: 2 },
  chipTextoActivo: { color: '#fff' },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 10, padding: 12, fontSize: 15 },
  contador: { alignSelf: 'flex-end', fontSize: 12, color: '#888', marginTop: 4 },
  boton: { backgroundColor: '#1e5aa8', borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 24 },
  botonOff: { opacity: 0.4 },
  botonTxt: { color: '#fff', fontWeight: '700', fontSize: 16 },
  error: { margin: 20, color: '#b00020' },
});