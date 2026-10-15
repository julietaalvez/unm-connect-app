import { useTema } from './tema';

/** Paleta "wireframes" del HTML (--wf-*). Mismos valores, claro y oscuro. */
export type Wf = {
  ink: string; navy: string; blue: string; sq: string;
  card: string; item: string; soft: string; tile: string; meta: string;
  pin: string; pinIn: string;
  busy: string; busyBg: string; virt: string; virtBg: string;
  tagBg: string; tagInk: string; icInk: string; quickIc: string; h2: string;
};

export const WF_CLARO: Wf = {
  ink: '#0f1a3a', navy: '#1a3399', blue: '#3a7be8', sq: '#4b8cf2',
  card: '#b9d4ff', item: '#c8dcff', soft: '#dce9ff', tile: '#a9c8ff', meta: '#1b2c55',
  pin: '#4b8cf2', pinIn: '#ffffff',
  busy: '#d68a3c', busyBg: '#faf3ea', virt: '#6f5bd0', virtBg: '#efecfb',
  tagBg: 'rgba(255,255,255,0.6)', tagInk: '#1a3399', icInk: '#ffffff', quickIc: '#1a3399', h2: '#1a3399',
};

export const WF_OSCURO: Wf = {
  ink: '#eef3fb', navy: '#4f8ef7', blue: '#6fa3f7', sq: '#4f8ef7',
  card: '#14233d', item: '#1d3152', soft: '#14233d', tile: '#1d3152', meta: '#93a4c4',
  pin: '#4f8ef7', pinIn: '#14233d',
  busy: '#f0a050', busyBg: 'rgba(240,160,80,0.16)', virt: '#a99bf0', virtBg: 'rgba(169,155,240,0.16)',
  tagBg: '#14233d', tagInk: '#7fb0ff', icInk: '#04101f', quickIc: '#7fb0ff', h2: '#eef3fb',
};

/**
 * Elige la paleta según el tema de la app.
 * Detecta el oscuro por el fondo (#0b1424 en oscuro, #ffffff en claro).
 * Si tu useTema ya expone un flag (oscuro / dark), usalo acá en lugar de comparar el color.
 */
export function useWf() {
  const { C } = useTema();
  const oscuro = String(C.bg).toLowerCase() !== '#ffffff';
  return { W: oscuro ? WF_OSCURO : WF_CLARO, oscuro };
}