import { useAppTheme } from '@/context/theme-context';
import { useState } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import BotonTema from '../components/BotonTema';
import { API_URL } from '../lib/api';
import { guardarUsuario } from '../lib/sesion';

export default function LoginScreen({
  onLoginSuccess,
  onGoToRegister,
}: {
  onLoginSuccess?: () => void;
  onGoToRegister?: () => void;
}) {
  const { theme } = useAppTheme();
  const isDark = theme === 'dark';

  const [usuario, setUsuario] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [error, setError] = useState('');
    const [modo, setModo] = useState<'login' | 'pedir' | 'codigo'>('login');
  const [codigo, setCodigo] = useState('');
  const [nueva, setNueva] = useState('');
  const [info, setInfo] = useState('');
  const [cargando, setCargando] = useState(false);

  const colors = {
    background: isDark ? '#0b1424' : '#ffffff',
    text: isDark ? '#ffffff' : '#1c2733',
    card: isDark ? '#16213a' : '#f2f4f7',
    placeholder: isDark ? '#8a93a6' : '#9aa3b2',
    navy: isDark ? '#9cc2ff' : '#1c3d6e',
    onNavy: '#ffffff',
    link: isDark ? '#6fa3f7' : '#1c3d6e',
  };

  const handleLogin = async () => {
    if (!usuario || !contrasena) {
      setError('Completá email y contraseña.');
      return;
    }
    setError('');
    try {
      const res = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: usuario.trim(), contrasena }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'No se pudo iniciar sesión.');
        return;
      }
      // Si el servidor todavía no manda el rol, se toma como alumno
      guardarUsuario({ ...data.usuario, rol: data.usuario?.rol ?? 'alumno' });
      onLoginSuccess?.();
    } catch {
      setError('No hay conexión con el servidor. Probá de nuevo.');
    }
  };

   const volver = () => {
    setModo('login');
    setCodigo('');
    setNueva('');
    setError('');
    setInfo('');
  };

  const pedirCodigo = async () => {
    if (!usuario.trim()) {
      setError('Ingresá tu email.');
      return;
    }
    setError('');
    setCargando(true);
    try {
      const res = await fetch(`${API_URL}/olvide-contrasena`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: usuario.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'No se pudo enviar el código.');
        return;
      }
      setInfo('Si el email está registrado, te mandamos un código de 6 dígitos. Revisá también la carpeta de spam.');
      setModo('codigo');
    } catch {
      setError('No hay conexión con el servidor. Probá de nuevo.');
    } finally {
      setCargando(false);
    }
  };

  const restablecer = async () => {
    if (codigo.length !== 6 || nueva.length < 6) {
      setError('Ingresá el código de 6 dígitos y una contraseña de al menos 6 caracteres.');
      return;
    }
    setError('');
    setCargando(true);
    try {
      const res = await fetch(`${API_URL}/restablecer-contrasena`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: usuario.trim(), codigo, contrasena: nueva }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'No se pudo cambiar la contraseña.');
        return;
      }
      setContrasena('');
      setCodigo('');
      setNueva('');
      setInfo('Listo: ya podés iniciar sesión con tu contraseña nueva.');
      setModo('login');
    } catch {
      setError('No hay conexión con el servidor. Probá de nuevo.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <BotonTema style={styles.themeBtn} />

      <Image
        source={require('@/assets/images/logo.png')}
        style={styles.logo}
        resizeMode="contain"
      />

      <TextInput
        style={[styles.input, { backgroundColor: colors.card, color: colors.text }]}
        placeholder="Email"
        placeholderTextColor={colors.placeholder}
        autoCapitalize="none"
        value={usuario}
        onChangeText={setUsuario}
      />
            {modo === 'login' && (
        <>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, color: colors.text }]}
            placeholder="Contraseña"
            placeholderTextColor={colors.placeholder}
            secureTextEntry
            value={contrasena}
            onChangeText={setContrasena}
          />

          {!!info && <Text style={styles.ok}>{info}</Text>}
          {!!error && <Text style={styles.error}>{error}</Text>}

          <Pressable
            style={[styles.button, { backgroundColor: colors.navy }]}
            onPress={handleLogin}>
            <Text style={[styles.buttonText, { color: colors.onNavy }]}>
              Iniciar sesión
            </Text>
          </Pressable>

          <Pressable
            onPress={() => {
              setError('');
              setInfo('');
              setModo('pedir');
            }}>
            <Text style={[styles.link, { color: colors.text }]}>
              ¿Olvidaste tu contraseña?
            </Text>
          </Pressable>
        </>
      )}

      {modo === 'pedir' && (
        <>
          <Text style={[styles.ayuda, { color: colors.text }]}>
            Ingresá tu email y te mandamos un código para crear una contraseña nueva.
          </Text>
          {!!error && <Text style={styles.error}>{error}</Text>}
          <Pressable
            style={[styles.button, { backgroundColor: colors.navy, opacity: cargando ? 0.6 : 1 }]}
            disabled={cargando}
            onPress={pedirCodigo}>
            <Text style={[styles.buttonText, { color: colors.onNavy }]}>
              {cargando ? 'Enviando…' : 'Enviar código'}
            </Text>
          </Pressable>
          <Pressable onPress={volver}>
            <Text style={[styles.link, { color: colors.text }]}>Volver</Text>
          </Pressable>
        </>
      )}

      {modo === 'codigo' && (
        <>
          {!!info && <Text style={styles.ok}>{info}</Text>}
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, color: colors.text }]}
            placeholder="Código de 6 dígitos"
            placeholderTextColor={colors.placeholder}
            keyboardType="number-pad"
            maxLength={6}
            value={codigo}
            onChangeText={(t) => setCodigo(t.replace(/\D/g, ''))}
          />
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, color: colors.text }]}
            placeholder="Contraseña nueva (mínimo 6 caracteres)"
            placeholderTextColor={colors.placeholder}
            secureTextEntry
            value={nueva}
            onChangeText={setNueva}
          />
          {!!error && <Text style={styles.error}>{error}</Text>}
          <Pressable
            style={[styles.button, { backgroundColor: colors.navy, opacity: cargando ? 0.6 : 1 }]}
            disabled={cargando}
            onPress={restablecer}>
            <Text style={[styles.buttonText, { color: colors.onNavy }]}>
              {cargando ? 'Guardando…' : 'Cambiar contraseña'}
            </Text>
          </Pressable>
          <Pressable onPress={pedirCodigo} disabled={cargando}>
            <Text style={[styles.link, { color: colors.text }]}>Reenviar código</Text>
          </Pressable>
          <Pressable onPress={volver}>
            <Text style={[styles.link, { color: colors.text }]}>Volver</Text>
          </Pressable>
        </>
      )}

      <Pressable
        style={[styles.newAccount, { backgroundColor: colors.card }]}
        onPress={onGoToRegister}>
        <Text style={[styles.newAccountText, { color: colors.link }]}>
          Crear cuenta nueva
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 26,
  },
  themeBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
  },
  logo: {
    width: 132,
    height: 132,
    alignSelf: 'center',
    marginTop: 40,
    marginBottom: 46,
  },
  input: {
    borderRadius: 10,
    fontSize: 16,
    padding: 14,
    marginBottom: 16,
  },
  error: {
    color: '#c0392b',
    fontSize: 12.5,
    minHeight: 16,
    marginTop: -6,
    marginBottom: 8,
    marginHorizontal: 2,
  },
    ok: {
    color: '#2e8b57',
    fontSize: 12.5,
    marginTop: -6,
    marginBottom: 10,
    marginHorizontal: 2,
  },
  ayuda: {
    fontSize: 13.5,
    marginBottom: 14,
    marginHorizontal: 2,
  },
  button: {
    borderRadius: 999,
    padding: 12,
    alignItems: 'center',
  },
  buttonText: {
    fontWeight: '600',
    fontSize: 15,
  },
  link: {
    textAlign: 'center',
    marginTop: 12,
    fontSize: 13.5,
    fontWeight: '500',
  },
  newAccount: {
    borderRadius: 999,
    padding: 11,
    alignItems: 'center',
    marginTop: 56,
    marginBottom: 40,
  },
  newAccountText: {
    fontWeight: '600',
    fontSize: 13.5,
  },
});