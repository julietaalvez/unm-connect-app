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

export const guardarUsuario = (u: Usuario | null) => { actual = u; };
export const usuarioActual = () => actual;
export const esProfesor = () => actual?.rol === 'profesor';

// _layout.tsx registra qué hacer cuando se cierra la sesión (volver al login)
export const registrarCierre = (fn: (() => void) | null) => { alCerrar = fn; };

export function cerrarSesion() {
  actual = null;
  alCerrar?.();
}