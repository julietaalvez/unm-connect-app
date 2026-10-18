import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';

import { alternarTema, fijarTema, useTema } from '../lib/tema';

type Theme = 'light' | 'dark';

const ThemeContext = createContext<{
  theme: Theme;
  toggleTheme: () => void;
}>({ theme: 'light', toggleTheme: () => {} });

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useSystemColorScheme();
  const { modo } = useTema();
  const [cargado, setCargado] = useState(false);

  // al abrir la app: usa el tema guardado (o el del sistema la primera vez)
  useEffect(() => {
    AsyncStorage.getItem('unm-theme')
      .then((saved) => {
        if (saved === 'dark' || saved === 'light') fijarTema(saved);
        else if (systemScheme === 'dark') fijarTema('dark');
      })
      .catch(() => {})
      .finally(() => setCargado(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // cada vez que cambia el modo, se guarda
  useEffect(() => {
    if (cargado) AsyncStorage.setItem('unm-theme', modo).catch(() => {});
  }, [modo, cargado]);

  return <ThemeContext.Provider value={{ theme: modo, toggleTheme: alternarTema }}>{children}</ThemeContext.Provider>;
}

export const useAppTheme = () => useContext(ThemeContext);