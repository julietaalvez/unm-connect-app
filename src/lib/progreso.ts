import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

import { API_URL } from './api';
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
// Sube todo el progreso al servidor. Si falla, queda marcado como pendiente y se reintenta al abrir.
async function subir(id: number | string, datos: Progreso, clave: string) {
  try {
    const r = await fetch(`${API_URL}/usuarios/${id}/progreso`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ datos }),
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    AsyncStorage.removeItem(`${clave}-pend`).catch(() => {});
  } catch {
    AsyncStorage.setItem(`${clave}-pend`, '1').catch(() => {});
  }
}

// espera un poco para juntar varios toques seguidos en una sola subida
let timer: ReturnType<typeof setTimeout> | null = null;
function programarSubida(id: number | string, datos: Progreso, clave: string) {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => subir(id, datos, clave), 700);
}

export function useProgreso() {
  const id = usuarioActual()?.id;
  const clave = `unm-progreso-${id ?? 'anon'}`;
  const [datos, setDatos] = useState<Progreso>({});
  const [listo, setListo] = useState(false);

    useEffect(() => {
    let vivo = true;
    // 1) copia del celu: se ve enseguida y anda sin internet
    AsyncStorage.getItem(clave)
      .then((v) => {
        if (vivo && v) setDatos(JSON.parse(v));
      })
      .catch(() => {})
      .finally(() => {
        if (vivo) setListo(true);
      });
    // 2) servidor: si hay cambios pendientes o es la primera vez, sube lo del celu; si no, baja lo del servidor
    if (id != null) {
      fetch(`${API_URL}/usuarios/${id}/progreso`)
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
        .then(async (d) => {
          if (!vivo || !d?.datos) return;
          const pend = await AsyncStorage.getItem(`${clave}-pend`);
          const v = await AsyncStorage.getItem(clave);
          const local: Progreso = v ? JSON.parse(v) : {};
          const srv = d.datos as Progreso;
          if (pend || (Object.keys(srv).length === 0 && Object.keys(local).length > 0)) {
            subir(id, local, clave);
            return;
          }
          if (!vivo) return;
          setDatos(srv);
          AsyncStorage.setItem(clave, JSON.stringify(srv)).catch(() => {});
        })
        .catch(() => {});
    }
    return () => {
      vivo = false;
    };
  }, [clave, id]);

  /** Pendiente -> En curso -> Aprobada -> Pendiente */
   const guardar = useCallback(
    (nuevo: Progreso) => {
      setDatos(nuevo);
      AsyncStorage.setItem(clave, JSON.stringify(nuevo)).catch(() => {});
      if (id != null) {
        AsyncStorage.setItem(`${clave}-pend`, '1').catch(() => {});
        programarSubida(id, nuevo, clave);
      }
    },
       [clave, id]
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