import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { AppThemeProvider, useAppTheme } from '@/context/theme-context';
import { Montserrat_600SemiBold, Montserrat_700Bold, Montserrat_800ExtraBold } from '@expo-google-fonts/montserrat';
import { Roboto_400Regular, Roboto_500Medium, Roboto_700Bold } from '@expo-google-fonts/roboto';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import DniScreen from '../components/dni';
import ElegirMaterias from '../components/ElegirMaterias';
import { registrarCierre, usuarioActual } from '../lib/sesion';
import LoginScreen from './login';
import RegisterScreen from './register';

SplashScreen.preventAutoHideAsync();

type Vista = 'login' | 'registro' | 'dni' | 'materias' | 'app';

function Layout() {
  const { theme } = useAppTheme();
  const [vista, setVista] = useState<Vista>('login');
  // Se marca al crear una cuenta; el próximo alumno que inicie sesión pasa por "¿Qué materias cursás?"
  const [recienRegistrado, setRecienRegistrado] = useState(false);

  // Al cerrar sesión desde Perfil (o desde la pantalla del DNI), vuelve al login
  useEffect(() => {
    registrarCierre(() => setVista('login'));
    return () => registrarCierre(null);
  }, []);

  // Después del DNI (o si no hace falta): un alumno recién registrado elige sus materias; el resto entra a la app
  const seguirDespuesDelDni = () => {
    if (recienRegistrado) {
      setRecienRegistrado(false);
      setVista('materias');
    } else {
      setVista('app');
    }
  };

  // Tras iniciar sesión: si es alumno y todavía no cargó el DNI, se lo pedimos antes de entrar
  const alIngresar = () => {
    const u = usuarioActual();
    const esAlumno = !!u && u.rol !== 'profesor';
    if (esAlumno && !u.dni) {
      setVista('dni');
      return;
    }
    if (esAlumno) {
      seguirDespuesDelDni();
      return;
    }
    setRecienRegistrado(false); // un profesor no pasa por la pantalla de materias
    setVista('app');
  };

  // Tipografías de la app (las usa la pantalla de Inicio)
  const [fontsOk, fontError] = useFonts({
    Montserrat_600SemiBold,
    Montserrat_700Bold,
    Montserrat_800ExtraBold,
    Roboto_400Regular,
    Roboto_500Medium,
    Roboto_700Bold,
  });

  // Espera a que carguen; si alguna falla, sigue igual con la fuente del sistema
  if (!fontsOk && !fontError) return null;

  return (
    <ThemeProvider value={theme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      {vista === 'app' && <AppTabs />}
      {vista === 'dni' && <DniScreen onListo={seguirDespuesDelDni} />}
      {vista === 'materias' && <ElegirMaterias alCerrar={() => setVista('app')} />}
      {vista === 'login' && (
        <LoginScreen
          onLoginSuccess={alIngresar}
          onGoToRegister={() => setVista('registro')}
        />
      )}
      {vista === 'registro' && (
        <RegisterScreen
          onRegisterSuccess={() => {
            setRecienRegistrado(true);
            setVista('login');
          }}
          onGoToLogin={() => setVista('login')}
        />
      )}
    </ThemeProvider>
  );
}

export default function TabLayout() {
  return (
    <AppThemeProvider>
      <Layout />
    </AppThemeProvider>
  );
}