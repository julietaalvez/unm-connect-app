import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { AppThemeProvider, useAppTheme } from '@/context/theme-context';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useState } from 'react';
import LoginScreen from './login';
import RegisterScreen from './register';

SplashScreen.preventAutoHideAsync();

function Layout() {
  const { theme } = useAppTheme();
  const [vista, setVista] = useState<'login' | 'registro' | 'app'>('login');

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