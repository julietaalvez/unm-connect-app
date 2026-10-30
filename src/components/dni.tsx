import { useAppTheme } from '@/context/theme-context';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { API_URL } from '../lib/api';
import { cerrarSesion, guardarUsuario, usuarioActual } from '../lib/sesion';

/** Se muestra una sola vez a los usuarios que se registraron antes de que el DNI fuera obligatorio. */
export default function DniScreen({ onListo }: { onListo?: () => void }) {
  const { theme } = useAppTheme();
  const isDark = theme === 'dark';

  const [dni, setDni] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const colors = {
    background: isDark ? '#0b1424' : '#ffffff',
    text: isDark ? '#ffffff' : '#1c2733',
    card: isDark ? '#16213a' : '#f2f4f7',
    placeholder: isDark ? '#8a93a6' : '#9aa3b2',
    navy: isDark ? '#9cc2ff' : '#1c3d6e',
    onNavy: '#ffffff',
  };

  const guardar = async () => {
    const u = usuarioActual();
    if (!u?.id) {
      setError('No hay una sesión iniciada.');
      return;
    }
    if (!/^\d{7,8}$/.test(dni)) {
      setError('Ingresá tu DNI: 7 u 8 números, sin puntos.');
      return;
    }
    setError('');
    setCargando(true);
    try {
      const res = await fetch(`${API_URL}/usuarios/${u.id}/dni`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dni }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'No se pudo guardar.');
        return;
      }
      guardarUsuario({ ...u, ...data.usuario });
      onListo?.();
    } catch {
      setError('No hay conexión con el servidor. Probá de nuevo.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>Completá tu DNI</Text>
      <Text style={[styles.ayuda, { color: colors.text }]}>
        Lo usamos para que las notas que cargue tu docente lleguen a tu cuenta. No lo ve ningún otro
        usuario y, una vez guardado, no se puede cambiar desde la app.
      </Text>

      <TextInput
        style={[styles.input, { backgroundColor: colors.card, color: colors.text }]}
        placeholder="DNI (sin puntos)"
        placeholderTextColor={colors.placeholder}
        keyboardType="number-pad"
        maxLength={8}
        value={dni}
        onChangeText={(t) => setDni(t.replace(/\D/g, ''))}
      />

      {!!error && <Text style={styles.error}>{error}</Text>}

      <Pressable
        style={[styles.button, { backgroundColor: colors.navy, opacity: cargando ? 0.6 : 1 }]}
        disabled={cargando}
        onPress={guardar}>
        <Text style={[styles.buttonText, { color: colors.onNavy }]}>
          {cargando ? 'Guardando…' : 'Guardar y continuar'}
        </Text>
      </Pressable>

      <Pressable onPress={cerrarSesion}>
        <Text style={[styles.link, { color: colors.text }]}>Cerrar sesión</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', paddingHorizontal: 26 },
  title: { fontSize: 20, fontWeight: '700', textAlign: 'center', marginBottom: 12 },
  ayuda: { fontSize: 13.5, textAlign: 'center', marginBottom: 22, marginHorizontal: 4 },
  input: { borderRadius: 10, fontSize: 16, padding: 14, marginBottom: 16 },
  error: { color: '#c0392b', fontSize: 12.5, marginTop: -6, marginBottom: 8, marginHorizontal: 2 },
  button: { borderRadius: 999, padding: 12, alignItems: 'center' },
  buttonText: { fontWeight: '600', fontSize: 15 },
  link: { textAlign: 'center', marginTop: 18, fontSize: 13.5, fontWeight: '500' },
});