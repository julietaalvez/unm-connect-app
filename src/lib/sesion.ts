import AsyncStorage from '@react-native-async-storage/async-storage';
import { cancelarRecordatorios } from './recordatorios';
export type Rol = 'alumno' | 'profesor';
export type Usuario = {
  id: number;
  nombre: string;
  email: string;
  rol: string;
  foto?: string | null;
  dni?: string | null;
};

let actual: Usuario | null = null;
let alCerrar: (() => void) | null = null;

const CLAVE_SESION = 'unm-connect-sesion';
export const guardarUsuario = (u: Usuario | null) => {
  actual = u;
  if (u) AsyncStorage.setItem(CLAVE_SESION, JSON.stringify(u)).catch(() => {});
  else AsyncStorage.removeItem(CLAVE_SESION).catch(() => {});
};

/** Al abrir la app: recupera la sesión guardada (también sirve sin internet) */
export async function restaurarSesion(): Promise<Usuario | null> {
  try {
    const raw = await AsyncStorage.getItem(CLAVE_SESION);
    const u = raw ? (JSON.parse(raw) as Usuario) : null;
    if (u && typeof u.id === 'number') { actual = u; return u; }
  } catch {}
  return null;
}
export const usuarioActual = () => actual;
export const esProfesor = () => actual?.rol === 'profesor';

// _layout.tsx registra qué hacer cuando se cierra la sesión (volver al login)
export const registrarCierre = (fn: (() => void) | null) => { alCerrar = fn; };

export function cerrarSesion() {
   guardarUsuario(null);
  cancelarRecordatorios();
  alCerrar?.();
}