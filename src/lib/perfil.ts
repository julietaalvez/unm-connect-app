import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import { API_URL } from './api';
import { guardarUsuario, usuarioActual } from './sesion';

/** Abre la galería, deja recortar en cuadrado, achica la foto a 400 px y la devuelve como texto
 *  ("data:image/jpeg;base64,...") para guardarla en la base. Devuelve null si cancelás. */
export async function elegirFoto(): Promise<string | null> {
  const r = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 1,
  });
  if (r.canceled || !r.assets?.[0]) return null;

  const ctx = ImageManipulator.manipulate(r.assets[0].uri);
  ctx.resize({ width: 400 });
  const img = await ctx.renderAsync();
  const out = await img.saveAsync({ format: SaveFormat.JPEG, compress: 0.6, base64: true });
  return out.base64 ? `data:image/jpeg;base64,${out.base64}` : null;
}

/** Guarda nombre y/o foto en el servidor y actualiza la sesión. foto: null = quitarla. */
export async function guardarPerfil(cambios: { nombre?: string; email?: string; foto?: string | null }) {
  const u = usuarioActual();
  if (!u?.id) throw new Error('No hay una sesión iniciada.');

  const res = await fetch(`${API_URL}/usuarios/${u.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cambios),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'No se pudo guardar.');
  guardarUsuario(data.usuario);
}