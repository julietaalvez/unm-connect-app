// Utilidades de color para los mapas

function aRgb(hex: string): [number, number, number] | null {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

/** Mezcla el color `a` con el `b`: t=0 → a, t=1 → b. Si alguno no es #hex, devuelve `a`. */
export function mezclar(a: string, b: string, t: number): string {
  const x = aRgb(a);
  const y = aRgb(b);
  if (!x || !y) return a;
  const c = x.map((v, i) => Math.round(v + (y[i] - v) * t));
  return '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('');
}

/** true si el color es oscuro (para saber si el tema es el oscuro) */
export function esOscuro(hex: string): boolean {
  const c = aRgb(hex);
  if (!c) return false;
  return (c[0] * 299 + c[1] * 587 + c[2] * 114) / 1000 < 128;
}
