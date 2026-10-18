export type Usuario = { id: number; nombre: string; email: string; rol: string; foto?: string | null };

let actual: Usuario | null = null;
let alCerrar: (() => void) | null = null;

export const guardarUsuario = (u: Usuario | null) => { actual = u; };
export const usuarioActual = () => actual;

// _layout.tsx registra qué hacer cuando se cierra la sesión (volver al login)
export const registrarCierre = (fn: (() => void) | null) => { alCerrar = fn; };

export function cerrarSesion() {
  actual = null;
  alCerrar?.();
}