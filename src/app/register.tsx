import { useAppTheme } from '@/context/theme-context';
import { useCarreras } from '@/lib/carreras';
import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

const API_URL = 'https://unm-backend-production.up.railway.app';

export default function RegisterScreen({
  onRegisterSuccess,
  onGoToLogin,
}: {
  onRegisterSuccess?: () => void;
  onGoToLogin?: () => void;
}) {
  const { theme } = useAppTheme();
  const isDark = theme === 'dark';

  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
    const [elegidas, setElegidas] = useState<number[]>([]);
  const { carreras, error: errCarreras, recargar } = useCarreras();
  const alternarCarrera = (id: number) =>
    setElegidas((a) => (a.includes(id) ? a.filter((x) => x !== id) : [...a, id]));

  const colors = {
    background: isDark ? '#0b1424' : '#ffffff',
    text: isDark ? '#ffffff' : '#1c2733',
    card: isDark ? '#16213a' : '#f2f4f7',
    placeholder: isDark ? '#8a93a6' : '#9aa3b2',
    navy: isDark ? '#9cc2ff' : '#1c3d6e',
    onNavy: '#ffffff',
    link: isDark ? '#6fa3f7' : '#1c3d6e',
  };

  const handleRegister = async () => {
    if (!nombre || !email || !contrasena || !confirmar) {
      setError('Completá todos los campos.');
      return;
    }
    if (contrasena !== confirmar) {
      setError('Las contraseñas no coinciden.');
      return;
    }
        if (elegidas.length === 0) {
      setError('Elegí al menos una carrera.');
      return;
    }
    setError('');
    setCargando(true);
    try {
      const res = await fetch(`${API_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, email, contrasena, carreras: elegidas }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'No se pudo registrar.');
        setCargando(false);
        return;
      }
      setCargando(false);
      onRegisterSuccess?.();
    } catch (err) {
      console.log('Error de conexión:', err);
      setError('No se pudo conectar con el servidor.');
      setCargando(false);
    }
  };

  return (
        <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled">

      <Text style={[styles.title, { color: colors.text }]}>Crear cuenta</Text>

      <TextInput
        style={[styles.input, { backgroundColor: colors.card, color: colors.text }]}
        placeholder="Nombre y apellido"
        placeholderTextColor={colors.placeholder}
        value={nombre}
        onChangeText={setNombre}
      />
      <TextInput
        style={[styles.input, { backgroundColor: colors.card, color: colors.text }]}
        placeholder="Email"
        placeholderTextColor={colors.placeholder}
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={[styles.input, { backgroundColor: colors.card, color: colors.text }]}
        placeholder="Contraseña"
        placeholderTextColor={colors.placeholder}
        secureTextEntry
        value={contrasena}
        onChangeText={setContrasena}
      />
      <TextInput
        style={[styles.input, { backgroundColor: colors.card, color: colors.text }]}
        placeholder="Confirmar contraseña"
        placeholderTextColor={colors.placeholder}
        secureTextEntry
        value={confirmar}
        onChangeText={setConfirmar}
      />
      <Text style={[styles.label, { color: colors.text }]}>
        ¿Qué carrera cursás? (podés elegir más de una)
      </Text>
      <View style={styles.chips}>
        {carreras.map((c) => {
          const on = elegidas.includes(c.id);
          return (
            <Pressable
              key={c.id}
              onPress={() => alternarCarrera(c.id)}
              style={[styles.chip, { backgroundColor: on ? colors.navy : colors.card }]}>
              <Text style={[styles.chipTxt, { color: on ? colors.onNavy : colors.text }]}>
                {on ? '✓ ' : ''}
                {c.nombre}
              </Text>
            </Pressable>
          );
        })}
        {carreras.length === 0 && (
          <Pressable onPress={recargar}>
            <Text style={{ color: colors.placeholder, fontSize: 13 }}>
              {errCarreras ? 'No se pudieron cargar las carreras. Tocá para reintentar.' : 'Cargando carreras…'}
            </Text>
          </Pressable>
        )}
      </View>

      {!!error && <Text style={styles.error}>{error}</Text>}
     

      <Pressable
        style={[styles.button, { backgroundColor: colors.navy }]}
        onPress={handleRegister}
        disabled={cargando}>
        <Text style={[styles.buttonText, { color: colors.onNavy }]}>
          {cargando ? 'Creando cuenta...' : 'Crear cuenta'}
        </Text>
      </Pressable>

      <Pressable onPress={onGoToLogin}>
        <Text style={[styles.link, { color: colors.text }]}>
          Ya tengo cuenta, iniciar sesión
        </Text>
      </Pressable>
         <Pressable onPress={onGoToLogin}>
        <Text style={[styles.link, { color: colors.text }]}>
          Ya tengo cuenta, iniciar sesión
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
   container: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 26, paddingVertical: 40 },
  title: { fontSize: 20, fontWeight: '700', textAlign: 'center', marginBottom: 30 },
  input: { borderRadius: 10, fontSize: 16, padding: 14, marginBottom: 16 },
  error: { color: '#c0392b', fontSize: 12.5, minHeight: 16, marginTop: -6, marginBottom: 8, marginHorizontal: 2 },
  button: { borderRadius: 999, padding: 12, alignItems: 'center' },
  buttonText: { fontWeight: '600', fontSize: 15 },
  link: { textAlign: 'center', marginTop: 18, fontSize: 13.5, fontWeight: '500' },
    label: { fontSize: 13.5, fontWeight: '600', marginBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip: { borderRadius: 999, paddingVertical: 8, paddingHorizontal: 14 },
  chipTxt: { fontSize: 13.5, fontWeight: '500' },
});