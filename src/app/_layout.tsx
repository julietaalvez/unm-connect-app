import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { AppThemeProvider, useAppTheme } from '@/context/theme-context';
import { Montserrat_600SemiBold, Montserrat_700Bold, Montserrat_800ExtraBold } from '@expo-google-fonts/montserrat';
import { Roboto_400Regular, Roboto_500Medium, Roboto_700Bold } from '@expo-google-fonts/roboto';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useState } from 'react';
import LoginScreen from './login';
import RegisterScreen from './register';

SplashScreen.preventAutoHideAsync();

function Layout() {
  const { theme } = useAppTheme();
  const [vista, setVista] = useState<'login' | 'registro' | 'app'>('login');

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
      {vista === 'login' && (
        <LoginScreen
          onLoginSuccess={() => setVista('app')}
          onGoToRegister={() => setVista('registro')}
        />
      )}
      {vista === 'registro' && (
        <RegisterScreen
          onRegisterSuccess={() => setVista('login')}
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