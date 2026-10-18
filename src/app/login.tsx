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
import { API_URL } from '../lib/api';
import { guardarUsuario } from '../lib/sesion';

export default function LoginScreen({
  onLoginSuccess,
  onGoToRegister,
}: {
  onLoginSuccess?: () => void;
   onGoToRegister?: () => void;
}) {
  const { theme, toggleTheme } = useAppTheme();
  const isDark = theme === 'dark';

  const [usuario, setUsuario] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [error, setError] = useState('');

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
      guardarUsuario(data.usuario);
      onLoginSuccess?.();
    } catch {
      setError('No hay conexión con el servidor. Probá de nuevo.');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Pressable onPress={toggleTheme} style={styles.themeBtn}>
        <Text style={{ fontSize: 22 }}>{isDark ? '☀️' : '🌙'}</Text>
      </Pressable>

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
      <TextInput
        style={[styles.input, { backgroundColor: colors.card, color: colors.text }]}
        placeholder="Contraseña"
        placeholderTextColor={colors.placeholder}
        secureTextEntry
        value={contrasena}
        onChangeText={setContrasena}
      />

      {!!error && <Text style={styles.error}>{error}</Text>}

      <Pressable
        style={[styles.button, { backgroundColor: colors.navy }]}
        onPress={handleLogin}>
        <Text style={[styles.buttonText, { color: colors.onNavy }]}>
          Iniciar sesión
        </Text>
      </Pressable>

      <Pressable>
        <Text style={[styles.link, { color: colors.text }]}>
          ¿Olvidaste tu contraseña?
        </Text>
      </Pressable>

      <Pressable style={[styles.newAccount, { backgroundColor: colors.card }]}>
        <Text style={[styles.newAccountText, { color: colors.link }]}>
          Crear cuenta nueva
        </Text>
      </Pressable>
      <Pressable style={[styles.newAccount, { backgroundColor: colors.card }]} onPress={onGoToRegister}>
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