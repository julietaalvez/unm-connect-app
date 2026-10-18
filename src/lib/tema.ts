import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

export type Colores = {
  bg: string; panel2: string; elevated: string; border: string;
  text: string; dim: string; accent: string; onAccent: string;
  mapBg: string; mapBorder: string; mapAccent: string; route: string;
  aulaFill: string; aulaStroke: string; aulaSel: string; aulaSelStroke: string;
  banoFill: string; banoStroke: string; banoSel: string; banoSelStroke: string;
  servFill: string; servStroke: string; servSel: string; servSelStroke: string;
  mutedFill: string; mutedStroke: string;
  busy: string; busyBg: string; free: string; freeBg: string;
  label: string; halo: string; icon: string; floorLabel: string; placeholder: string;
  btnBg: string; btnBorder: string; toastBg: string; toastText: string;
  pillTypeBg: string; pillTypeText: string;
  field: string; paths: string; bldgFill: string; bldgStroke: string; bldgSel: string; bldgSelStroke: string;
  door: string;
};

const CLARO: Colores = {
  bg: '#ffffff', panel2: '#e0edff', elevated: '#b7d6ff', border: '#e3edfb',
  text: '#12213c', dim: '#737a83', accent: '#153396', onAccent: '#ffffff',
  mapBg: '#e0edff', mapBorder: '#c7d9f5', mapAccent: '#2f6fe0', route: '#2f6fe0',
  aulaFill: '#ffffff', aulaStroke: '#a9c4ef', aulaSel: '#4f8ef7', aulaSelStroke: '#2f6fe0',
  banoFill: '#d8f3ec', banoStroke: '#4fae95', banoSel: '#1f5a4f', banoSelStroke: '#2fa36b',
  servFill: '#fbeccb', servStroke: '#c99a3f', servSel: '#5a4420', servSelStroke: '#d68a3c',
  mutedFill: '#d3e3fb', mutedStroke: '#b9cdf0',
  busy: '#d68a3c', busyBg: '#faf3ea', free: '#2fa36b', freeBg: '#eaf7f1',
  label: '#12213c', halo: 'rgba(255,255,255,.9)', icon: 'rgba(18,33,60,.55)',
  floorLabel: 'rgba(18,33,60,.55)', placeholder: '#737a83',
  btnBg: '#ffffff', btnBorder: '#c7d9f5', toastBg: '#ffffff', toastText: '#153396',
  pillTypeBg: 'rgba(21,51,150,.1)', pillTypeText: '#153396',
  field: '#5fae7a', paths: '#b9cdf0', bldgFill: '#ffffff', bldgStroke: '#a9c4ef', bldgSel: '#4f8ef7', bldgSelStroke: '#2f6fe0',
  door: '#3a4d70',
};

const OSCURO: Colores = {
  bg: '#0b1424', panel2: '#14233d', elevated: '#1d3152', border: '#263b5e',
  text: '#e8eefb', dim: '#93a4c4', accent: '#3b6fe0', onAccent: '#ffffff',
  mapBg: '#0f1c33', mapBorder: '#263b5e', mapAccent: '#5aa0ff', route: '#7db4ff',
  aulaFill: '#1b2d4d', aulaStroke: '#3d5a8c', aulaSel: '#4f8ef7', aulaSelStroke: '#5aa0ff',
  banoFill: '#12403a', banoStroke: '#3fae95', banoSel: '#2f8f7c', banoSelStroke: '#4fd18a',
  servFill: '#4a3a17', servStroke: '#c99a3f', servSel: '#8a6a2c', servSelStroke: '#f0a050',
  mutedFill: '#14233f', mutedStroke: '#22355a',
  busy: '#f0a050', busyBg: 'rgba(240,160,80,.16)', free: '#4fd18a', freeBg: 'rgba(79,209,138,.16)',
  label: '#eef3ff', halo: 'rgba(6,12,24,.92)', icon: 'rgba(232,238,251,.6)',
  floorLabel: 'rgba(232,238,251,.65)', placeholder: '#7f93b8',
  btnBg: '#14233d', btnBorder: '#2c4270', toastBg: '#1d3152', toastText: '#e8eefb',
  pillTypeBg: 'rgba(90,160,255,.18)', pillTypeText: '#a9ccff',
  field: '#2e6a49', paths: '#2b4575', bldgFill: '#34568f', bldgStroke: '#86a9e6', bldgSel: '#4f8ef7', bldgSelStroke: '#cfe0ff',
  door: '#dbe8ff',
};

/* Estado compartido entre las pantallas del mapa (campus e interior) */
const CLAVE = 'unm-theme';
let modoActual: 'light' | 'dark' = 'light';
const oyentes = new Set<() => void>();

function suscribir(fn: () => void) {
  oyentes.add(fn);
  return () => {
    oyentes.delete(fn);
  };
}

// al abrir la app, recuperar el modo que se eligió la última vez
AsyncStorage.getItem(CLAVE)
  .then((v) => {
    if (v === 'dark' && modoActual !== 'dark') {
      modoActual = 'dark';
      oyentes.forEach((f) => f());
    }
  })
  .catch(() => {});

export function alternarTema() {
  modoActual = modoActual === 'light' ? 'dark' : 'light';
  AsyncStorage.setItem(CLAVE, modoActual).catch(() => {});
  oyentes.forEach((f) => f());
}

export function useTema() {
  const modo = useSyncExternalStore(suscribir, () => modoActual);
  return { modo, C: modo === 'dark' ? OSCURO : CLARO, alternar: alternarTema };
}
export function fijarTema(m: 'light' | 'dark') {
  if (m === modoActual) return;
  modoActual = m;
  oyentes.forEach((f) => f());
}