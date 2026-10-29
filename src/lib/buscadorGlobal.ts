import { EDIFICIOS, NOTES } from '../data/edificios';
import { classify, labelFor } from './interior';

export type Resultado = {
  buildingId: string; // clave en EDIFICIOS (la que usa BuildingInterior)
  edificio: string;
  floor: string;
  id: string; // id del espacio
  label: string;
  tipo: string;
};

const sinTildes = (t: string) =>
  t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

// "Daract II" también se puede escribir "daract 2"
function variantes(nombre: string) {
  const n = sinTildes(nombre);
  const sinEd = n.replace(/^edificio /, '');
  const num = (t: string) => t.replace(/\bii\b/g, '2').replace(/\bi\b/g, '1');
  return Array.from(new Set([n, sinEd, num(n), num(sinEd)])).sort((a, b) => b.length - a.length);
}

/**
 * Busca en TODOS los edificios con plano interior: aulas, oficinas, baños, etc.
 * Entiende "aula 5", "5", "a101", "secretaria academica", y "aula 5 daract 2" (limita al edificio).
 */
export function buscarEnTodos(consulta: string, limite = 8): Resultado[] {
  let q = sinTildes(consulta);
  if (!q) return [];

  // un mismo edificio puede estar con varios nombres de clave (comedor/carpa -> histórico)
  const vistos = new Set<object>();
  const edificios = Object.entries(EDIFICIOS).filter(([, ed]) => {
    if (vistos.has(ed)) return false;
    vistos.add(ed);
    return true;
  });

  // ¿escribió también el nombre del edificio?
  let solo: string | null = null;
  for (const [key, ed] of edificios) {
    const v = variantes(ed.name).find((x) => q.includes(x));
    if (v) {
      solo = key;
      q = q.replace(v, ' ').replace(/\s+/g, ' ').trim();
      break;
    }
  }
  if (!q) return [];

  const alt = q.replace(/^(aula|oficina)\s+/, '');
  const numero = q.match(/^(?:aula\s*)?(\d+)$/);
  const out: (Resultado & { score: number })[] = [];

  for (const [key, ed] of edificios) {
    if (solo && key !== solo) continue;
    for (const floor of Object.keys(ed.floors)) {
      for (const forma of ed.floors[floor].shapes) {
        const tipo = classify(forma.id);
        if (tipo === 'muted') continue;
        const label = labelFor(forma.id) || forma.id;
        const l = sinTildes(label);
        const idTxt = sinTildes(forma.id);
        const nota = NOTES[forma.id] || '';
        const n = sinTildes(nota);
        let score = -1;
        if (numero && l.startsWith('aula')) {
          const nums = (l.match(/\d+/g) || []).map((n) => parseInt(n, 10));
          if (nums.includes(parseInt(numero[1], 10))) score = 0;
        } else if (l === alt || l === q) score = 0;
        else if (l.startsWith(alt) || l.startsWith(q)) score = 1;
        else if (l.includes(alt) || l.includes(q) || idTxt.includes(alt)) score = 2;
        else if (n && (n.includes(alt) || n.includes(q))) score = 3; // por el nombre de la oficina
        if (score < 0) continue;
        out.push({ buildingId: key, edificio: ed.name, floor, id: forma.id, label: nota && tipo === 'serv' ? `${label} · ${nota}` : label, tipo, score });
      }
    }
  }
  out.sort((a, b) => a.score - b.score || a.label.localeCompare(b.label, 'es', { numeric: true }));
  return out.slice(0, limite).map(({ score, ...r }) => r);
}
