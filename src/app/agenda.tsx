import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '@/context/theme-context';

type EventType = 'materia' | 'aviso';
type AgendaEvent = {
  id: string;
  date: string; // YYYY-MM-DD
  type: EventType;
  title: string;
  start?: string;
  end?: string;
  modo?: 'presencial' | 'virtual';
  aula?: string;
  edificio?: string;
  place?: string;
  custom?: boolean;
};

const STORAGE_KEY = 'unm-conect-agenda-eventos';
const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const SHORT_MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const WEEKDAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const BUILDINGS = ['Daract I', 'Daract II', 'Dorrego I', 'Dorrego II', 'Edificio Histórico', 'Laboratorios', 'Comedor', 'Carpa / Pabellón', 'ESPUM', 'Mantenimiento'];

const pad = (n: number) => String(n).padStart(2, '0');
const keyOf = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const parseKey = (key: string) => {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
};
const todayKey = keyOf(new Date());

function createBaseEvents(): AgendaEvent[] {
  const events: AgendaEvent[] = [];
  const holidays: Record<string, string> = {
    '2026-10-12': 'Feriado: Día del Respeto a la Diversidad Cultural',
    '2026-11-23': 'Feriado: Día de la Soberanía Nacional (trasladado)',
    '2026-12-07': 'Día no laborable con fines turísticos',
    '2026-12-08': 'Feriado: Inmaculada Concepción de María',
    '2026-12-25': 'Feriado: Navidad',
  };
  const start = new Date(2026, 7, 3);
  const end = new Date(2026, 11, 4);
  for (const date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
    const key = keyOf(date);
    if (holidays[key]) continue;
    // Taller de Diseño Multimedial IV: lunes presencial y miércoles virtual.
    if (date.getDay() === 1) {
      events.push({
        id: `b-${key}-1`, date: key, type: 'materia',
        title: 'Taller de Diseño Multimedial IV', start: '13:30', end: '17:30',
        modo: 'presencial', aula: 'I001', place: 'I001',
      });
    }
    if (date.getDay() === 3) {
      events.push({
        id: `b-${key}-3`, date: key, type: 'materia',
        title: 'Taller de Diseño Multimedial IV', start: '10:30', end: '12:30',
        modo: 'virtual',
      });
    }
  }
  Object.entries(holidays).forEach(([date, title]) => {
    events.push({ id: `f-${date}`, date, type: 'aviso', title });
  });
  return events;
}
const BASE_EVENTS = createBaseEvents();

export default function AgendaScreen() {
  const { theme, toggleTheme } = useAppTheme();
  const dark = theme === 'dark';
  const colors = dark
    ? { bg: '#0b1424', panel: '#0b1424', panel2: '#14233d', card: '#1d3152', border: '#263b5e', text: '#e8eefb', muted: '#93a4c4', accent: '#3b6fe0', cyan: '#3ec6ef', busy: '#f0a050', danger: '#ff8a7a' }
    : { bg: '#ffffff', panel: '#ffffff', panel2: '#e0edff', card: '#b7d6ff', border: '#e3edfb', text: '#12213c', muted: '#737a83', accent: '#153396', cyan: '#3ec6ef', busy: '#d68a3c', danger: '#c0392b' };

  const [customEvents, setCustomEvents] = useState<AgendaEvent[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [month, setMonth] = useState(new Date().getMonth());
  const [year, setYear] = useState(new Date().getFullYear());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(todayKey);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [eventType, setEventType] = useState<EventType>('materia');
  const [building, setBuilding] = useState('');
  const [classroom, setClassroom] = useState('');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw: string | null) => {
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) setCustomEvents(parsed);
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    if (loaded) AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(customEvents)).catch(() => {});
  }, [customEvents, loaded]);

  const allEvents = useMemo(() => [...BASE_EVENTS, ...customEvents].sort((a, b) =>
    `${a.date}${a.start || ''}`.localeCompare(`${b.date}${b.start || ''}`)), [customEvents]);

  const eventDates = useMemo(() => new Set(allEvents.map((event) => event.date)), [allEvents]);
  const calendarDays = useMemo(() => {
    const first = new Date(year, month, 1);
    const startDay = first.getDay();
    const count = new Date(year, month + 1, 0).getDate();
    const total = Math.ceil((startDay + count) / 7) * 7;
    return Array.from({ length: total }, (_, i) => {
      const d = new Date(year, month, 1 - startDay + i);
      return { date: keyOf(d), day: d.getDate(), inMonth: d.getMonth() === month };
    });
  }, [year, month]);

  const visibleEvents = useMemo(() => {
    if (selectedDate) return allEvents.filter((event) => event.date === selectedDate);
    const upcoming = allEvents.filter((event) => event.date >= todayKey);
    return showAll ? upcoming : upcoming.slice(0, 3);
  }, [allEvents, selectedDate, showAll]);

  const changeMonth = (delta: number) => {
    const next = new Date(year, month + delta, 1);
    setYear(next.getFullYear());
    setMonth(next.getMonth());
  };

  const openForm = (initialDate = selectedDate || todayKey) => {
    setTitle('');
    setDate(initialDate);
    setStartTime('');
    setEndTime('');
    setEventType('materia');
    setBuilding('');
    setClassroom('');
    setModalOpen(true);
  };

  const saveEvent = () => {
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      Alert.alert('Falta el título', 'Escribí un título para el evento.');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(parseKey(date).getTime())) {
      Alert.alert('Fecha inválida', 'Usá el formato AAAA-MM-DD, por ejemplo 2026-10-17.');
      return;
    }
    if (startTime && endTime && endTime <= startTime) {
      Alert.alert('Horario inválido', 'La hora de fin tiene que ser posterior a la de inicio.');
      return;
    }
    const cleanClassroom = classroom.trim().replace(/^aula\s*/i, '');
    const place = [cleanClassroom ? (/^\d+$/.test(cleanClassroom) ? `Aula ${cleanClassroom}` : cleanClassroom) : '', building].filter(Boolean).join(' · ');
    const event: AgendaEvent = {
      id: `c${Date.now()}`, custom: true, type: eventType, title: cleanTitle, date,
      ...(startTime ? { start: startTime } : {}),
      ...(endTime ? { end: endTime } : {}),
      ...(eventType === 'materia' ? {
        ...(building ? { edificio: building } : {}),
        ...(cleanClassroom ? { aula: cleanClassroom } : {}),
        ...(place ? { place } : {}),
      } : {}),
    };
    setCustomEvents((previous) => [...previous, event]);
    const chosen = parseKey(date);
    setYear(chosen.getFullYear());
    setMonth(chosen.getMonth());
    setSelectedDate(date);
    setShowAll(false);
    setModalOpen(false);
  };

  const styles = makeStyles(colors);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <View style={styles.topbar}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.eyebrow, { color: colors.muted }]}>UNM CONNECT</Text>
          <Text style={[styles.heading, { color: colors.text }]}>Agenda</Text>
        </View>
        <Pressable onPress={toggleTheme} style={[styles.themeButton, { backgroundColor: colors.panel2, borderColor: colors.border }]}>
          <Text style={{ color: colors.text, fontSize: 18 }}>{dark ? '☀' : '☾'}</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={[styles.calendar, { backgroundColor: colors.panel2, borderColor: colors.border }]}>
          <View style={styles.monthRow}>
            <Pressable accessibilityLabel="Mes anterior" onPress={() => changeMonth(-1)} style={[styles.arrow, { backgroundColor: colors.panel, borderColor: colors.border }]}>
              <Text style={[styles.arrowText, { color: colors.accent }]}>‹</Text>
            </Pressable>
            <View style={{ alignItems: 'center' }}>
              <Text style={[styles.monthTitle, { color: colors.text }]}>{MONTHS[month]}</Text>
              <Text style={[styles.yearTitle, { color: colors.muted }]}>{year}</Text>
            </View>
            <Pressable accessibilityLabel="Mes siguiente" onPress={() => changeMonth(1)} style={[styles.arrow, { backgroundColor: colors.panel, borderColor: colors.border }]}>
              <Text style={[styles.arrowText, { color: colors.accent }]}>›</Text>
            </Pressable>
          </View>
          <View style={styles.weekRow}>
            {WEEKDAYS.map((day) => <Text key={day} style={[styles.weekday, { color: colors.muted }]}>{day}</Text>)}
          </View>
          <View style={styles.grid}>
            {calendarDays.map((day) => {
              const isSelected = selectedDate === day.date;
              const isToday = todayKey === day.date;
              const hasEvent = eventDates.has(day.date);
              return (
                <Pressable key={day.date} onPress={() => {
                  if (selectedDate === day.date) setSelectedDate(null);
                  else {
                    setSelectedDate(day.date);
                    const chosen = parseKey(day.date);
                    setYear(chosen.getFullYear());
                    setMonth(chosen.getMonth());
                  }
                }} style={styles.dayCell}>
                  <View style={[
                    styles.dayNumber,
                    !day.inMonth && { opacity: 0.4 },
                    isToday && { borderWidth: 2, borderColor: colors.cyan },
                    isSelected && { backgroundColor: colors.accent, borderColor: colors.accent },
                  ]}>
                    <Text style={[styles.dayText, { color: isSelected ? '#fff' : colors.text }]}>{day.day}</Text>
                  </View>
                  {hasEvent && <View style={[styles.dot, { backgroundColor: isSelected ? '#fff' : colors.cyan }]} />}
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{selectedDate ? `Eventos del ${parseKey(selectedDate).getDate()} de ${MONTHS[parseKey(selectedDate).getMonth()].toLowerCase()}` : 'Eventos próximos'}</Text>
          <Pressable onPress={() => selectedDate ? setSelectedDate(null) : setShowAll((v) => !v)}>
            <Text style={[styles.link, { color: colors.accent }]}>{selectedDate ? 'Ver próximos' : showAll ? 'Ver menos' : 'Ver todos'}</Text>
          </Pressable>
        </View>

        <View style={{ gap: 9 }}>
          {visibleEvents.length ? visibleEvents.map((event) => (
            <View key={event.id} style={[styles.eventCard, { backgroundColor: colors.panel2, borderColor: colors.border }]}>
              <View style={[styles.eventIcon, { backgroundColor: event.type === 'aviso' ? (dark ? '#392b20' : '#faf3ea') : colors.card }]}>
                <Text style={{ fontSize: 20, color: event.type === 'aviso' ? colors.busy : colors.accent }}>{event.type === 'aviso' ? '♢' : '▦'}</Text>
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={[styles.eventTitle, { color: colors.text }]}>{event.title}</Text>
                {event.type === 'materia' && event.modo === 'virtual' && <Text style={[styles.meta, { color: colors.muted }]}>▣ Virtual</Text>}
                {event.place && <Text style={[styles.meta, { color: colors.accent }]}>⌖ {event.place}</Text>}
                {(event.start || event.end) && <Text style={[styles.meta, { color: colors.muted }]}>◷ {[event.start, event.end].filter(Boolean).join(' - ')}</Text>}
              </View>
              {!selectedDate && <Text style={[styles.dateBadge, { color: colors.muted, backgroundColor: colors.panel, borderColor: colors.border }]}>{parseKey(event.date).getDate()} {SHORT_MONTHS[parseKey(event.date).getMonth()]}</Text>}
              {event.custom && <Pressable accessibilityLabel="Eliminar evento" onPress={() => Alert.alert('Eliminar evento', `¿Querés eliminar "${event.title}"?`, [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Eliminar', style: 'destructive', onPress: () => setCustomEvents((prev) => prev.filter((item) => item.id !== event.id)) },
              ])} style={styles.deleteButton}><Text style={{ color: colors.muted, fontSize: 18 }}>×</Text></Pressable>}
            </View>
          )) : (
            <View style={[styles.empty, { borderColor: colors.border }]}>
              <Text style={{ color: colors.muted, textAlign: 'center' }}>No hay eventos para esta fecha.</Text>
              <Pressable onPress={() => openForm(selectedDate || todayKey)}><Text style={[styles.link, { color: colors.accent, textAlign: 'center', marginTop: 8 }]}>Agregar un evento</Text></Pressable>
            </View>
          )}
        </View>

        <View style={styles.newEventRow}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Evento nuevo</Text>
          <Pressable onPress={() => openForm()} style={[styles.addButton, { backgroundColor: colors.accent }]}><Text style={{ color: '#fff', fontSize: 26, lineHeight: 30 }}>+</Text></Pressable>
        </View>
      </ScrollView>

      <Modal visible={modalOpen} animationType="slide" transparent onRequestClose={() => setModalOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.panel, borderColor: colors.border }]}>
            <View style={styles.grab} />
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={[styles.modalTitle, { color: colors.text }]}>Evento nuevo</Text>
              <Text style={[styles.label, { color: colors.muted }]}>Título</Text>
              <TextInput value={title} onChangeText={setTitle} maxLength={80} placeholder="Ej: Entrega de trabajo" placeholderTextColor={colors.muted} style={[styles.input, { color: colors.text, backgroundColor: colors.panel2, borderColor: colors.border }]} />
              <Text style={[styles.label, { color: colors.muted }]}>Tipo</Text>
              <View style={styles.typeRow}>
                {([{ value: 'materia', label: 'Materia' }, { value: 'aviso', label: 'Recordatorio' }] as const).map((option) => (
                  <Pressable key={option.value} onPress={() => setEventType(option.value)} style={[styles.typeOption, { backgroundColor: eventType === option.value ? colors.accent : colors.panel2, borderColor: colors.border }]}>
                    <Text style={{ color: eventType === option.value ? '#fff' : colors.text, fontWeight: '600' }}>{option.label}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={[styles.label, { color: colors.muted }]}>Fecha (AAAA-MM-DD)</Text>
              <TextInput value={date} onChangeText={setDate} placeholder="2026-10-17" placeholderTextColor={colors.muted} autoCapitalize="none" style={[styles.input, { color: colors.text, backgroundColor: colors.panel2, borderColor: colors.border }]} />
              <View style={styles.twoColumns}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.label, { color: colors.muted }]}>Desde (HH:MM)</Text>
                  <TextInput value={startTime} onChangeText={setStartTime} placeholder="13:30" placeholderTextColor={colors.muted} style={[styles.input, { color: colors.text, backgroundColor: colors.panel2, borderColor: colors.border }]} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.label, { color: colors.muted }]}>Hasta (HH:MM)</Text>
                  <TextInput value={endTime} onChangeText={setEndTime} placeholder="15:00" placeholderTextColor={colors.muted} style={[styles.input, { color: colors.text, backgroundColor: colors.panel2, borderColor: colors.border }]} />
                </View>
              </View>
              {eventType === 'materia' && <>
                <Text style={[styles.label, { color: colors.muted }]}>Edificio (opcional)</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 7, paddingBottom: 4 }}>
                  <Pressable onPress={() => setBuilding('')} style={[styles.buildingChip, { backgroundColor: building === '' ? colors.accent : colors.panel2, borderColor: colors.border }]}><Text style={{ color: building === '' ? '#fff' : colors.text }}>Sin edificio</Text></Pressable>
                  {BUILDINGS.map((item) => <Pressable key={item} onPress={() => setBuilding(item)} style={[styles.buildingChip, { backgroundColor: building === item ? colors.accent : colors.panel2, borderColor: colors.border }]}><Text style={{ color: building === item ? '#fff' : colors.text }}>{item}</Text></Pressable>)}
                </ScrollView>
                <Text style={[styles.label, { color: colors.muted }]}>Aula (opcional)</Text>
                <TextInput value={classroom} onChangeText={setClassroom} maxLength={20} placeholder="Ej: 5" placeholderTextColor={colors.muted} style={[styles.input, { color: colors.text, backgroundColor: colors.panel2, borderColor: colors.border }]} />
              </>}
              <View style={styles.actions}>
                <Pressable onPress={() => setModalOpen(false)} style={[styles.actionButton, { backgroundColor: colors.panel2 }]}><Text style={{ color: colors.text, fontWeight: '600' }}>Cancelar</Text></Pressable>
                <Pressable onPress={saveEvent} style={[styles.actionButton, { backgroundColor: colors.accent }]}><Text style={{ color: '#fff', fontWeight: '700' }}>Guardar evento</Text></Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function makeStyles(c: Record<string, string>) {
  return StyleSheet.create({
    safe: { flex: 1 },
    topbar: { paddingHorizontal: 18, paddingTop: 8, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
    eyebrow: { fontSize: 10, letterSpacing: 1.5, fontWeight: '700' },
    heading: { fontSize: 25, fontWeight: '800', marginTop: 2 },
    themeButton: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
    scroll: { paddingHorizontal: 16, paddingBottom: 28 },
    calendar: { borderWidth: 1, borderRadius: 18, overflow: 'hidden' },
    monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10, paddingTop: 10, paddingBottom: 2 },
    arrow: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
    arrowText: { fontSize: 30, lineHeight: 32, marginTop: -3 },
    monthTitle: { fontSize: 19, fontWeight: '700' },
    yearTitle: { fontSize: 12, marginTop: 2 },
    weekRow: { flexDirection: 'row', paddingHorizontal: 8, paddingTop: 8 },
    weekday: { width: `${100 / 7}%`, textAlign: 'center', fontSize: 11, fontWeight: '600' },
    grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 8, paddingTop: 4, paddingBottom: 10 },
    dayCell: { width: `${100 / 7}%`, height: 42, alignItems: 'center', justifyContent: 'center' },
    dayNumber: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'transparent' },
    dayText: { fontSize: 14, fontWeight: '500' },
    dot: { position: 'absolute', bottom: 1, width: 5, height: 5, borderRadius: 3 },
    sectionHeader: { marginHorizontal: 2, marginTop: 20, marginBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    sectionTitle: { fontSize: 16, fontWeight: '700', flexShrink: 1 },
    link: { fontSize: 12, fontWeight: '700' },
    eventCard: { borderWidth: 1, borderRadius: 14, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 10 },
    eventIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
    eventTitle: { fontSize: 13.5, lineHeight: 19, fontWeight: '600' },
    meta: { fontSize: 11.5 },
    dateBadge: { borderWidth: 1, borderRadius: 10, overflow: 'hidden', paddingHorizontal: 7, paddingVertical: 4, fontSize: 10.5, fontWeight: '600' },
    deleteButton: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
    empty: { padding: 22, borderWidth: 1, borderStyle: 'dashed', borderRadius: 14 },
    newEventRow: { marginTop: 24, marginHorizontal: 2, marginBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    addButton: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
    modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(11,20,36,0.55)' },
    modalCard: { maxHeight: '92%', borderTopLeftRadius: 22, borderTopRightRadius: 22, borderWidth: 1, paddingHorizontal: 18, paddingTop: 8, paddingBottom: 28 },
    grab: { alignSelf: 'center', width: 38, height: 4, borderRadius: 2, backgroundColor: c.card, marginBottom: 12 },
    modalTitle: { fontSize: 20, fontWeight: '800', marginBottom: 14 },
    label: { fontSize: 12, fontWeight: '600', marginBottom: 6, marginTop: 10 },
    input: { minHeight: 44, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, fontSize: 14 },
    typeRow: { flexDirection: 'row', gap: 8 },
    typeOption: { flex: 1, borderWidth: 1, borderRadius: 10, padding: 11, alignItems: 'center' },
    twoColumns: { flexDirection: 'row', gap: 10 },
    buildingChip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 8 },
    actions: { flexDirection: 'row', gap: 10, marginTop: 22, marginBottom: 8 },
    actionButton: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 13, borderRadius: 12 },
  });
  }
