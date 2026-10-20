import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

import { usuarioActual } from './sesion';

/* Progreso de la carrera: qué materias aprobó o está cursando cada usuario.
   Por ahora se guarda en el celu (AsyncStorage). Una materia "pendiente" simplemente no tiene registro. */

export type Estado = 'cursando' | 'aprobada';
export type Registro = { estado: Estado; nota?: number };
export type Progreso = Record<string, Registro>; // clave = nombre de la materia

/** "7", "7,5" o "7.5" -> número entre 1 y 10; cualquier otra cosa -> undefined */
export function parsearNota(texto: string): number | undefined {
  const n = parseFloat(texto.replace(',', '.'));
  if (!isFinite(n) || n < 1 || n > 10) return undefined;
  return Math.round(n * 10) / 10;
}

export function useProgreso() {
  const id = usuarioActual()?.id;
  const clave = `unm-progreso-${id ?? 'anon'}`;
  const [datos, setDatos] = useState<Progreso>({});
  const [listo, setListo] = useState(false);

  useEffect(() => {
    let vivo = true;
    AsyncStorage.getItem(clave)
      .then((v) => {
        if (vivo && v) setDatos(JSON.parse(v));
      })
      .catch(() => {})
      .finally(() => {
        if (vivo) setListo(true);
      });
    return () => {
      vivo = false;
    };
  }, [clave]);

  const guardar = useCallback(
    (nuevo: Progreso) => {
      setDatos(nuevo);
      AsyncStorage.setItem(clave, JSON.stringify(nuevo)).catch(() => {});
    },
    [clave]
  );

  /** Pendiente -> En curso -> Aprobada -> Pendiente */
  const ciclar = useCallback(
    (materia: string) => {
      const nuevo = { ...datos };
      const actual = datos[materia]?.estado;
      if (!actual) nuevo[materia] = { estado: 'cursando' };
      else if (actual === 'cursando') nuevo[materia] = { estado: 'aprobada' };
      else delete nuevo[materia];
      guardar(nuevo);
    },
    [datos, guardar]
  );

  const ponerNota = useCallback(
    (materia: string, texto: string) => {
      const reg = datos[materia];
      if (!reg || reg.estado !== 'aprobada') return;
      guardar({ ...datos, [materia]: { estado: 'aprobada', nota: parsearNota(texto) } });
    },
    [datos, guardar]
  );

  return { datos, listo, ciclar, ponerNota };
}