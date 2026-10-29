import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';

import { API_URL } from './api';
import { usuarioActual } from './sesion';

export type Carrera = { id: number; nombre: string };
// avisa a todas las pantallas cuando cambian mis carreras
const oyentes = new Set<(ids: number[]) => void>();

async function pedir<T>(ruta: string): Promise<T> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 8000);
  try {
    const res = await fetch(`${API_URL}${ruta}`, { signal: ctl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(t);
  }
}

/** Todas las carreras disponibles (para el registro y para "Mis carreras") */
export function useCarreras() {
  const [carreras, setCarreras] = useState<Carrera[]>([]);
  const [error, setError] = useState(false);

  const recargar = useCallback(() => {
    setError(false);
    pedir<Carrera[]>('/carreras')
      .then((r) => setCarreras(Array.isArray(r) ? r : []))
      .catch(() => setError(true));
  }, []);

  useEffect(() => {
    recargar();
  }, [recargar]);

  return { carreras, error, recargar };
}

/** Las carreras del usuario que tiene la sesión iniciada */
export function useMisCarreras() {
  const id = usuarioActual()?.id;
  const clave = `unm-carreras-${id}`;
  const [ids, setIds] = useState<number[]>([]);
  const [listo, setListo] = useState(false);

  useEffect(() => {
    if (!id) {
      setListo(true);
      return;
    }
    let vivo = true;
    AsyncStorage.getItem(clave)
      .then((v) => {
        if (vivo && v) setIds(JSON.parse(v));
      })
      .catch(() => {});
    pedir<{ ids: number[] }>(`/usuarios/${id}/carreras`)
      .then((r) => {
        if (!vivo) return;
        const nuevos = r.ids ?? [];
        setIds(nuevos);
        AsyncStorage.setItem(clave, JSON.stringify(nuevos)).catch(() => {});
      })
      .catch(() => {})
      .finally(() => {
        if (vivo) setListo(true);
      });
    return () => {
      vivo = false;
    };
  }, [id, clave]);
    useEffect(() => {
    oyentes.add(setIds);
    return () => {
      oyentes.delete(setIds);
    };
  }, []);

  const guardar = useCallback(
    async (nuevos: number[]) => {
      if (!id) return;
      const antes = ids;
      setIds(nuevos);
      try {
        const res = await fetch(`${API_URL}/usuarios/${id}/carreras`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ carreras: nuevos }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
               AsyncStorage.setItem(clave, JSON.stringify(nuevos)).catch(() => {});
        oyentes.forEach((f) => f(nuevos));
      } catch {
        setIds(antes);
        Alert.alert('Carreras', 'No se pudo guardar. Revisá tu conexión.');
        throw new Error('No se pudieron guardar las carreras.');
      }

    },
    [id, ids, clave]
  );

  return { ids, listo, guardar };
}

/** Qué materia pertenece a qué carrera: { 'Nombre de la materia': [1, 2] } */
export function useMateriaCarreras() {
  const [mapa, setMapa] = useState<Record<string, number[]>>({});

  useEffect(() => {
    pedir<{ materia: string; carrera_id: number }[]>('/materias/carreras')
      .then((rows) => {
        const m: Record<string, number[]> = {};
        for (const r of rows) (m[r.materia] ??= []).push(Number(r.carrera_id));
        setMapa(m);
      })
      .catch(() => {});
  }, []);

  return mapa;
}

/** ¿Esta materia corresponde a alguna de mis carreras?
 *  Si todavía no elegí carrera, o la materia no está asignada a ninguna, se muestra igual. */
export function materiaDeMisCarreras(materia: string, mapa: Record<string, number[]>, mis: number[]) {
  if (mis.length === 0) return true;
  const de = mapa[materia];
  if (!de || de.length === 0) return true;
  return de.some((c) => mis.includes(c));
}
export type MateriaPlan = { nombre: string; anio: number; cuatri: number; electiva: boolean };

/** Plan de estudios de una carrera (de la base). null = cargando */
export function usePlan(carreraId: number | null) {
  const [plan, setPlan] = useState<MateriaPlan[] | null>(null);

  useEffect(() => {
    if (carreraId == null) {
      setPlan(null);
      return;
    }
    let vivo = true;
    setPlan(null);
    pedir<MateriaPlan[]>(`/carreras/${carreraId}/plan`)
      .then((r) => {
        if (vivo) setPlan(Array.isArray(r) ? r : []);
      })
      .catch(() => {
        if (vivo) setPlan([]);
      });
    return () => {
      vivo = false;
    };
  }, [carreraId]);

  return plan;
}