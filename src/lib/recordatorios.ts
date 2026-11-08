import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/** Cuánto antes de cada clase o evento suena el recordatorio */
export const MINUTOS_ANTES = 30;
const DIAS_ADELANTE = 21; // se programan las próximas 3 semanas
const MAXIMO = 60; // el sistema limita cuántas se pueden dejar programadas

type Ev = { id: string; date: string; type: string; title: string; start?: string; modo?: string; place?: string; aula?: string; edificio?: string };

async function permiso() {
  let { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') status = (await Notifications.requestPermissionsAsync()).status;
  return status === 'granted';
}

async function borrarProgramadas() {
  const previas = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    previas.filter((n) => n.content.data?.tipo === 'agenda').map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
}

/** Saca todos los recordatorios (al cerrar sesión) */
export async function cancelarRecordatorios() {
  try {
    await borrarProgramadas();
  } catch {}
}

/** Programa en el celular un recordatorio por cada clase o evento próximo. Funciona sin internet. */
export async function programarRecordatorios(eventos: Ev[]) {
  try {
    if (!(await permiso())) return;
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Avisos',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
      });
    }
    await borrarProgramadas();

    const ahora = Date.now();
    const limite = ahora + DIAS_ADELANTE * 86400000;
    const items: { cuando: Date; title: string; body: string }[] = [];
    for (const ev of eventos) {
      const [y, m, d] = ev.date.split('-').map(Number);
      let cuando: Date;
      let title = ev.title;
      let body: string;
      if (ev.start && /^\d{1,2}:\d{2}$/.test(ev.start)) {
        const [hh, mm] = ev.start.split(':').map(Number);
        cuando = new Date(y, m - 1, d, hh, mm - MINUTOS_ANTES);
        const donde = ev.modo === 'virtual' ? 'Virtual' : ev.place || [ev.aula ? `Aula ${ev.aula}` : '', ev.edificio].filter(Boolean).join(' · ');
        title = `${ev.title} · en ${MINUTOS_ANTES} min`;
        body = `Empieza a las ${ev.start}${donde ? ' · ' + donde : ''}`;
      } else {
        cuando = new Date(y, m - 1, d, 8, 0); // sin horario: a la mañana del mismo día
        body = 'Es hoy';
      }
      if (cuando.getTime() <= ahora || cuando.getTime() > limite) continue;
      items.push({ cuando, title, body });
    }
    items.sort((a, b) => a.cuando.getTime() - b.cuando.getTime());
    for (const it of items.slice(0, MAXIMO)) {
      await Notifications.scheduleNotificationAsync({
        content: { title: it.title, body: it.body, sound: true, data: { tipo: 'agenda' } },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: it.cuando, channelId: 'default' },
      });
    }
  } catch {
    // sin permiso o error del sistema: la agenda sigue funcionando igual
  }
}
