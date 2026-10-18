export type Usuario = { id: number; nombre: string; email: string; rol: string; foto?: string | null };

let actual: Usuario | null = null;

export const guardarUsuario = (u: Usuario | null) => { actual = u; };
export const usuarioActual = () => actual;