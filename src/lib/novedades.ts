import { useEffect, useState, useSyncExternalStore } from 'react';
import { Alert } from 'react-native';

import { API_URL } from './api';
import { usuarioActual } from './sesion';

export type TipoNovedad = 'aula' | 'evento' | 'aviso';
export type NovedadUsuario = {
  id: number;
  titulo: string;
  texto: string;
  tipo: TipoNovedad;
  materia: string | null;
  fecha: string;
  leida: boolean;
};

/* ---------- almacén compartido: la campanita, la lista y Novedades ven lo mismo ---------- */
type Estado = { lista: NovedadUsuario[]; cargado: boolean };
let estado: Estado = { lista: [], cargado: false };
let idCargado: number | undefined;
const oyentes = new Set<() => void>();

const poner = (e: Estado) => {
  estado = e;
  oyentes.forEach((f) => f());
};
const suscribir = (f: () => void) => {
  oyentes.add(f);
  return () => {
    oyentes.delete(f);
  };
};

const TIPOS: TipoNovedad[] = ['aula', 'evento', 'aviso'];

export async function cargarNovedades(id: number) {
  if (idCargado !== id) {
    idCargado = id;
    poner({ lista: [], cargado: false });
  }
  try {
    const res = await fetch(`${API_URL}/usuarios/${id}/novedades`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const rows = await res.json();
    if (!Array.isArray(rows)) throw new Error('formato');
    poner({
      cargado: true,
      lista: rows.map((r: any) => ({
        id: Number(r.id),
        titulo: String(r.titulo ?? ''),
        texto: String(r.texto ?? ''),
        tipo: TIPOS.includes(r.tipo) ? r.tipo : 'aviso',
        materia: r.materia ?? null,
        fecha: String(r.fecha ?? ''),
        leida: !!r.leida,
      })),
    });
  } catch {
    poner({ ...estado, cargado: true }); // sin conexión: se queda lo que había
  }
}

async function marcarLeidas(id: number) {
  const ids = estado.lista.filter((n) => !n.leida).map((n) => n.id);
  if (ids.length === 0) return;
  poner({ ...estado, lista: estado.lista.map((n) => ({ ...n, leida: true })) });
  try {
    await fetch(`${API_URL}/usuarios/${id}/novedades/leer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    });
  } catch {
    // si falla, la próxima vez que se carguen vuelven a figurar sin leer
  }
}
async function ocultar(id: number, ids: number[]) {
  if (ids.length === 0) return;
  poner({ ...estado, lista: estado.lista.filter((n) => !ids.includes(n.id)) });
  try {
    await fetch(`${API_URL}/usuarios/${id}/novedades/ocultar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    });
  } catch {
    // si falla, vuelve a aparecer la próxima vez que se cargue la lista
  }
}
async function marcarUna(id: number, novedadId: number) {
  poner({ ...estado, lista: estado.lista.map((n) => (n.id === novedadId ? { ...n, leida: true } : n)) });
  try {
    await fetch(`${API_URL}/usuarios/${id}/novedades/leer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [novedadId] }),
    });
  } catch {
    // si falla, vuelve a aparecer la próxima vez que se cargue
  }
}

/** Novedades del usuario: lista, cantidad sin leer, y acciones */
export function useNovedades() {
  const e = useSyncExternalStore(suscribir, () => estado);
  const id = usuarioActual()?.id;

  useEffect(() => {
    if (id) cargarNovedades(id);
  }, [id]);

  return {
    lista: e.lista,
    cargado: e.cargado,
    sinLeer: e.lista.filter((n) => !n.leida).length,
    recargar: () => {
      if (id) cargarNovedades(id);
    },
        borrar: (nid: number) => {
      if (id) ocultar(id, [nid]);
    },
    borrarTodas: () => {
      if (id) ocultar(id, estado.lista.map((n) => n.id));
    },
    leerUna: (nid: number) => {
      if (id) marcarUna(id, nid);
    },
    leerTodas: () => {
      if (id) marcarLeidas(id);
    },
  };
}

/** Si el usuario quiere recibir avisos en el celular (se guarda en la base) */
export function usePush() {
  const id = usuarioActual()?.id;
  const [activo, setActivo] = useState(true);

  useEffect(() => {
    if (!id) return;
    let vivo = true;
    fetch(`${API_URL}/usuarios/${id}/notificaciones`)
      .then((r) => r.json())
      .then((d) => {
        if (vivo && typeof d.push === 'boolean') setActivo(d.push);
      })
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, [id]);

  const cambiar = async () => {
    if (!id) return;
    const nuevo = !activo;
    setActivo(nuevo);
    try {
      const res = await fetch(`${API_URL}/usuarios/${id}/notificaciones`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ push: nuevo }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch {
      setActivo(!nuevo);
      Alert.alert('Notificaciones', 'No se pudo guardar. Revisá tu conexión.');
    }
  };

  return { activo, cambiar };
}