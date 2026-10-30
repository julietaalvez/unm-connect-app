import { useAppTheme } from '@/context/theme-context';
import { useCarreras } from '@/lib/carreras';
import { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

const API_URL = 'https://unm-backend-production.up.railway.app';

type Rol = 'alumno' | 'profesor';

export default function RegisterScreen({
  onRegisterSuccess,
  onGoToLogin,
}: {
  onRegisterSuccess?: () => void;
  onGoToLogin?: () => void;
}) {
  const { theme } = useAppTheme();
  const isDark = theme === 'dark';

  const [rol, setRol] = useState<Rol>('alumno');
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [dni, setDni] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const [elegidas, setElegidas] = useState<number[]>([]);
  const [abierto, setAbierto] = useState(false);
  const { carreras, error: errCarreras, recargar } = useCarreras();

  const alternarCarrera = (id: number) =>
    setElegidas((a) => (a.includes(id) ? a.filter((x) => x !== id) : [...a, id]));

  const resumen = carreras
    .filter((c) => elegidas.includes(c.id))
    .map((c) => c.nombre)
    .join(', ');

  const textoVacio =
    rol === 'alumno' ? 'Elegí tu carrera' : 'Elegí las carreras en las que dictás';

  const colors = {
    background: isDark ? '#0b1424' : '#ffffff',
    text: isDark ? '#ffffff' : '#1c2733',
    card: isDark ? '#16213a' : '#f2f4f7',
    placeholder: isDark ? '#8a93a6' : '#9aa3b2',
    navy: isDark ? '#9cc2ff' : '#1c3d6e',
    onNavy: '#ffffff',
    link: isDark ? '#6fa3f7' : '#1c3d6e',
  };

  const cambiarRol = (nuevo: Rol) => {
    setRol(nuevo);
    setError('');
  };

  const handleRegister = async () => {
    if (!nombre || !email || !contrasena || !confirmar) {
      setError('Completá todos los campos.');
      return;
    }
    if (rol === 'alumno' && !/^\d{7,8}$/.test(dni)) {
      setError('Ingresá tu DNI: 7 u 8 números, sin puntos.');
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
        body: JSON.stringify({
          nombre,
          email,
          contrasena,
          carreras: elegidas,
          rol,
          ...(rol === 'alumno' ? { dni } : {}),
        }),
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

      <View style={[styles.selector, { backgroundColor: colors.card }]}>
        {(['alumno', 'profesor'] as Rol[]).map((r) => {
          const on = rol === r;
          return (
            <Pressable
              key={r}
              onPress={() => cambiarRol(r)}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              style={[styles.opcion, { backgroundColor: on ? colors.navy : 'transparent' }]}>
              <Text style={[styles.opcionTxt, { color: on ? colors.onNavy : colors.text }]}>
                {r === 'alumno' ? 'Soy alumno' : 'Soy profesor'}
              </Text>
            </Pressable>
          );
        })}
      </View>

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
      {rol === 'alumno' && (
        <TextInput
          style={[styles.input, { backgroundColor: colors.card, color: colors.text }]}
          placeholder="DNI (sin puntos)"
          placeholderTextColor={colors.placeholder}
          keyboardType="number-pad"
          maxLength={8}
          value={dni}
          onChangeText={(t) => setDni(t.replace(/\D/g, ''))}
        />
      )}
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

      <Pressable
        onPress={() => setAbierto(true)}
        accessibilityRole="button"
        style={[styles.input, styles.selectorCarrera, { backgroundColor: colors.card }]}>
        <Text
          numberOfLines={2}
          style={{ flex: 1, fontSize: 16, color: resumen ? colors.text : colors.placeholder }}>
          {resumen || textoVacio}
        </Text>
        <Text style={{ color: colors.placeholder, fontSize: 14, marginLeft: 8 }}>▾</Text>
      </Pressable>

      <Modal
        visible={abierto}
        transparent
        animationType="slide"
        onRequestClose={() => setAbierto(false)}>
        <Pressable style={styles.fondo} onPress={() => setAbierto(false)} />
        <View style={[styles.hoja, { backgroundColor: colors.background }]}>
          <Text style={[styles.hojaTitulo, { color: colors.text }]}>
            {rol === 'alumno' ? '¿Qué carrera cursás?' : '¿En qué carrera(s) dictás?'}
          </Text>
          <Text style={{ color: colors.placeholder, fontSize: 12.5, marginBottom: 8 }}>
            Podés elegir más de una
          </Text>

          <ScrollView style={{ flexGrow: 0 }}>
            {carreras.map((c) => {
              const on = elegidas.includes(c.id);
              return (
                <Pressable
                  key={c.id}
                  onPress={() => alternarCarrera(c.id)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on }}
                  style={styles.fila}>
                  <View
                    style={[
                      styles.casilla,
                      { borderColor: colors.navy, backgroundColor: on ? colors.navy : 'transparent' },
                    ]}>
                    {on && <Text style={{ color: colors.onNavy, fontSize: 13 }}>✓</Text>}
                  </View>
                  <Text style={{ color: colors.text, fontSize: 15, flex: 1 }}>{c.nombre}</Text>
                </Pressable>
              );
            })}
            {carreras.length === 0 && (
              <Pressable onPress={recargar}>
                <Text style={{ color: colors.placeholder, fontSize: 13, paddingVertical: 12 }}>
                  {errCarreras
                    ? 'No se pudieron cargar las carreras. Tocá para reintentar.'
                    : 'Cargando carreras…'}
                </Text>
              </Pressable>
            )}
          </ScrollView>

          <Pressable
            style={[styles.button, { backgroundColor: colors.navy, marginTop: 14 }]}
            onPress={() => setAbierto(false)}>
            <Text style={[styles.buttonText, { color: colors.onNavy }]}>Listo</Text>
          </Pressable>
        </View>
      </Modal>

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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 26, paddingVertical: 40 },
  title: { fontSize: 20, fontWeight: '700', textAlign: 'center', marginBottom: 20 },
  selector: { flexDirection: 'row', borderRadius: 999, padding: 4, marginBottom: 20 },
  opcion: { flex: 1, borderRadius: 999, paddingVertical: 11, alignItems: 'center' },
  opcionTxt: { fontSize: 14.5, fontWeight: '600' },
  input: { borderRadius: 10, fontSize: 16, padding: 14, marginBottom: 16 },
  selectorCarrera: { flexDirection: 'row', alignItems: 'center' },
  error: { color: '#c0392b', fontSize: 12.5, minHeight: 16, marginTop: -6, marginBottom: 8, marginHorizontal: 2 },
  button: { borderRadius: 999, padding: 12, alignItems: 'center' },
  buttonText: { fontWeight: '600', fontSize: 15 },
  link: { textAlign: 'center', marginTop: 18, fontSize: 13.5, fontWeight: '500' },
  fondo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  hoja: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 30,
    maxHeight: '75%',
  },
  hojaTitulo: { fontSize: 17, fontWeight: '700', marginBottom: 2 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13 },
  casilla: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});