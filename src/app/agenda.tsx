import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import HeaderMapa from '../components/HeaderMapa';
import type { Cursada } from '../lib/inscripciones';
import { FERIADOS, armarCursadas, useCatalogo, useInscripciones } from '../lib/inscripciones';
import { useTema } from '../lib/tema';
import { useWf } from '../lib/wf';

// ── TUS ICONOS PNG ── si algún archivo se llama distinto, cambiá solo el nombre entre comillas
const ICONOS = {
  atras: require('../../assets/icons/atras.png'),
  adelante: require('../../assets/icons/adelante.png'),
  campana: require('../../assets/icons/campana.png'),
  calendario: require('../../assets/icons/materias.png'),
  video: require('../../assets/icons/video.png'),
  pin: require('../../assets/icons/pin.png'),
  reloj: require('../../assets/icons/reloj.png'),
  papelera: require('../../assets/icons/papelera.png'),
  mas: require('../../assets/icons/mas.png'),
};

// Un icono PNG con tamaño fijo. Si le pasás "tint", lo pinta de ese color.
const Icono = ({ src, size = 20, tint }: { src: number; size?: number; tint?: string }) => (
  <Image source={src} style={[{ width: size, height: size }, tint ? { tintColor: tint } : null]} resizeMode="contain" />
);

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
  color?: string;
};

const STORAGE_KEY = 'unm-conect-agenda-eventos';
const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const SHORT_MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const WEEKDAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const BUILDINGS = ['Daract I', 'Daract II', 'Dorrego I', 'Dorrego II', 'Edificio Histórico', 'Laboratorios', 'Comedor', 'Carpa / Pabellón', 'ESPUM', 'Mantenimiento'];

const PALETA_EVENTOS = [
  { nombre: 'Azul', color: '#3978E5' },
  { nombre: 'Verde', color: '#27966A' },
  { nombre: 'Rosa', color: '#E65C91' },
  { nombre: 'Naranja', color: '#E88A32' },
  { nombre: 'Violeta', color: '#8B62CC' },
  { nombre: 'Rojo', color: '#DB4D4D' },
  { nombre: 'Turquesa', color: '#20A5A5' },
  { nombre: 'Amarillo', color: '#D9AD27' },
];

function colorDelEvento(ev: AgendaEvent): string {
  if (ev.color) return ev.color;
  if (ev.type === 'aviso') return '#E88A32';
  return ev.modo === 'virtual' ? '#8B62CC' : '#3978E5';
}

const F = { h1: 'Montserrat_800ExtraBold', bold: 'Montserrat_700Bold', semi: 'Montserrat_600SemiBold', body: 'Roboto_400Regular', bodyMed: 'Roboto_500Medium', bodyBold: 'Roboto_700Bold' };

const pad = (n: number) => String(n).padStart(2, '0');
const keyOf = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const parseKey = (key: string) => {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const FERIADOS_EVENTS: AgendaEvent[] = Object.entries(FERIADOS).map(([date, title]) => ({ id: `f-${date}`, date, type: 'aviso', title }));

// Eventos de las materias en las que el usuario está inscripto, repetidos cada semana del cuatrimestre
function eventosDeCursadas(cursadas: Cursada[]): AgendaEvent[] {
  const events: AgendaEvent[] = [];
  const inicio = new Date(2026, 7, 3);
  const fin = new Date(2026, 11, 4);
  for (const c of cursadas) {
    c.franjas.forEach((f, i) => {
      for (const d = new Date(inicio); d <= fin; d.setDate(d.getDate() + 1)) {
        const key = keyOf(d);
        if (FERIADOS[key] || !f.dias.includes(d.getDay())) continue;
        // "semana por medio": una semana sí y otra no
        if (f.alterna && Math.floor((d.getTime() - inicio.getTime()) / 604800000) % 2 !== 0) continue;
        const virtual = f.modo === 'virtual';
        events.push({
          id: `m-${c.clave}-${i}-${key}`, date: key, type: 'materia', title: c.materia,
          start: f.desde, end: f.hasta, modo: virtual ? 'virtual' : 'presencial',
          ...(virtual ? {} : { aula: f.aula ?? undefined, edificio: f.edificio || undefined, place: f.lugar }),
        });
      }
    });
  }
  return events;
}

export default function AgendaScreen() {
  const router = useRouter();
  const { C } = useTema();
  const { W, oscuro } = useWf();

  // colores del estilo "wireframe" de la prueba HTML
  const K = {
    headBg: oscuro ? '#1d3152' : '#1a3399',
    weekBg: W.sq,
    weekTx: oscuro ? '#04101f' : '#ffffff',
    dayTx: oscuro ? '#eef3fb' : '#0b1220',
    dayOut: '#7f9ccf',
    ring: oscuro ? '#4f8ef7' : '#1a3399',
    sel: oscuro ? '#4f8ef7' : '#1a3399',
    link: oscuro ? '#7fb0ff' : '#1a3399',
    chip: oscuro ? '#1d3152' : 'rgba(255,255,255,0.6)',
    evIcoTx: oscuro ? '#04101f' : '#ffffff',
    primary: oscuro ? '#4f8ef7' : '#1a3399',
    primaryTx: oscuro ? '#04101f' : '#ffffff',
  };
  const s = useMemo(() => makeStyles(), []);

  const todayKey = keyOf(new Date());
  const [customEvents, setCustomEvents] = useState<AgendaEvent[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [month, setMonth] = useState(new Date().getMonth());
  const [year, setYear] = useState(new Date().getFullYear());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [abiertoId, setAbiertoId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(todayKey);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [eventType, setEventType] = useState<EventType>('materia');
  const [building, setBuilding] = useState('');
  const [classroom, setClassroom] = useState('');
  const [eventColor, setEventColor] = useState(PALETA_EVENTOS[3].color);

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

  const catalogo = useCatalogo();
  const { claves } = useInscripciones();
  const eventosMaterias = useMemo(
    () => eventosDeCursadas(armarCursadas(catalogo).filter((c) => claves.has(c.clave))),
    [catalogo, claves]
  );
  const allEvents = useMemo(
    () => [...FERIADOS_EVENTS, ...eventosMaterias, ...customEvents].sort((a, b) => `${a.date}${a.start || ''}`.localeCompare(`${b.date}${b.start || ''}`)),
    [eventosMaterias, customEvents]
  );
  const eventDates = useMemo(() => new Set(allEvents.map((e) => e.date)), [allEvents]);
  const eventColorsByDate = useMemo(() => {
    const result = new Map<string, string[]>();
    for (const ev of allEvents) {
      const colors = result.get(ev.date) ?? [];
      const color = colorDelEvento(ev);
      if (!colors.includes(color) && colors.length < 4) colors.push(color);
      result.set(ev.date, colors);
    }
    return result;
  }, [allEvents]);

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
    if (selectedDate) return allEvents.filter((e) => e.date === selectedDate);
    const upcoming = allEvents.filter((e) => e.date >= todayKey);
    return showAll ? upcoming : upcoming.slice(0, 3);
  }, [allEvents, selectedDate, showAll, todayKey]);

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
    setEventColor(PALETA_EVENTOS[3].color);
    setModalOpen(true);
  };

  const saveEvent = () => {
    const cleanTitle = title.trim();
    if (!cleanTitle) return Alert.alert('Falta el título', 'Escribí un título para el evento.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(parseKey(date).getTime()) || keyOf(parseKey(date)) !== date) {
      return Alert.alert('Fecha inválida', 'Usá el formato AAAA-MM-DD, por ejemplo 2026-10-17.');
    }
    if (startTime && endTime && endTime <= startTime) {
      return Alert.alert('Horario inválido', 'La hora de fin tiene que ser posterior a la de inicio.');
    }
    const cleanClassroom = classroom.trim().replace(/^aula\s*/i, '');
    const place = [cleanClassroom ? (/^\d+$/.test(cleanClassroom) ? `Aula ${cleanClassroom}` : cleanClassroom) : '', building].filter(Boolean).join(' · ');
    const event: AgendaEvent = {
      id: `c${Date.now()}`, custom: true, type: eventType, title: cleanTitle, date, color: eventColor,
      ...(startTime ? { start: startTime } : {}),
      ...(endTime ? { end: endTime } : {}),
      ...(eventType === 'materia'
        ? { ...(building ? { edificio: building } : {}), ...(cleanClassroom ? { aula: cleanClassroom } : {}), ...(place ? { place } : {}) }
        : {}),
    };
    setCustomEvents((prev) => [...prev, event]);
    const chosen = parseKey(date);
    setYear(chosen.getFullYear());
    setMonth(chosen.getMonth());
    setSelectedDate(date);
    setShowAll(false);
    setModalOpen(false);
  };

  const borrar = (ev: AgendaEvent) =>
    Alert.alert('Eliminar evento', `¿Querés eliminar "${ev.title}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => setCustomEvents((prev) => prev.filter((i) => i.id !== ev.id)) },
    ]);

  const inputStyle = [s.input, { color: C.text, backgroundColor: C.panel2, borderColor: C.border }];

  return (
    <View style={[s.screen, { backgroundColor: C.bg }]}>
      <HeaderMapa />
      <Text style={[s.h1, { color: W.ink }]}>AGENDA</Text>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 140 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {/* calendario */}
        <View style={[s.cal, { backgroundColor: W.card }]}>
          <View style={[s.calHead, { backgroundColor: K.headBg }]}>
            <Pressable accessibilityLabel="Mes anterior" onPress={() => changeMonth(-1)} style={s.arrow}>
              <Icono src={ICONOS.atras} size={22} tint="#fff" />
            </Pressable>
            <View style={{ alignItems: 'center' }}>
              <Text style={s.month}>{MONTHS[month].toUpperCase()}</Text>
              <Text style={s.year}>{year}</Text>
            </View>
            <Pressable accessibilityLabel="Mes siguiente" onPress={() => changeMonth(1)} style={s.arrow}>
              <Icono src={ICONOS.adelante} size={22} tint="#fff" />
            </Pressable>
          </View>

          <View style={[s.weekRow, { backgroundColor: K.weekBg }]}>
            {WEEKDAYS.map((d) => (
              <Text key={d} style={[s.weekday, { color: K.weekTx }]}>{d.toUpperCase()}</Text>
            ))}
          </View>

          <View style={s.grid}>
            {calendarDays.map((day) => {
              const isSelected = selectedDate === day.date;
              const isToday = todayKey === day.date;
              const dayColors = eventColorsByDate.get(day.date) ?? [];
              const hasEvent = eventDates.has(day.date);
              return (
                <Pressable
                  key={day.date}
                  style={s.dayCell}
                  onPress={() => {
                    if (selectedDate === day.date) setSelectedDate(null);
                    else {
                      setSelectedDate(day.date);
                      const chosen = parseKey(day.date);
                      setYear(chosen.getFullYear());
                      setMonth(chosen.getMonth());
                    }
                  }}
                >
                  <View style={[s.dayNum, isToday && { borderColor: K.ring }, isSelected && { backgroundColor: K.sel, borderColor: K.sel }]}>
                    <Text style={[s.dayTxt, { color: isSelected ? '#fff' : day.inMonth ? K.dayTx : K.dayOut }]}>{day.day}</Text>
                  </View>
                  {hasEvent && (
                    <View style={s.marksRow}>
                      {dayColors.map((color, index) => (
                        <View key={`${day.date}-${color}-${index}`} style={[s.markDot, { backgroundColor: isSelected ? '#fff' : color }]} />
                      ))}
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* lista */}
        <View style={s.sectionHead}>
          <Text style={[s.sectionTitle, { color: W.ink }]}>
            {selectedDate ? `Eventos del ${parseKey(selectedDate).getDate()} de ${MONTHS[parseKey(selectedDate).getMonth()].toLowerCase()}` : 'Eventos próximos'}
          </Text>
          <Pressable onPress={() => (selectedDate ? setSelectedDate(null) : setShowAll((v) => !v))}>
            <Text style={[s.link, { color: K.link }]}>{selectedDate ? 'VER PRÓXIMOS' : showAll ? 'VER MENOS' : 'VER TODOS'}</Text>
          </Pressable>
        </View>

        <View style={{ gap: 10 }}>
          {visibleEvents.length ? (
            visibleEvents.map((ev) => {
              const abierto = abiertoId === ev.id;
              const d = parseKey(ev.date);
              const fechaLarga = `${WEEKDAYS[d.getDay()]} ${d.getDate()} de ${MONTHS[d.getMonth()].toLowerCase()} de ${d.getFullYear()}`;
              const hayLugar = !!ev.place && ev.modo !== 'virtual';
              const colorEvento = colorDelEvento(ev);
              return (
                <View key={ev.id} style={[s.eventCard, { backgroundColor: W.card, borderLeftColor: colorEvento, borderLeftWidth: 5 }]}>
                  <Pressable style={s.event} onPress={() => setAbiertoId(abierto ? null : ev.id)}>
                    <View style={[s.evIco, { backgroundColor: `${colorEvento}20` }]}>
                      <Icono src={ev.type === 'aviso' ? ICONOS.campana : ICONOS.calendario} size={20} tint={colorEvento} />
                    </View>

                    <View style={{ flex: 1, gap: 3 }}>
                      <Text style={[s.evName, { color: W.ink }]}>{ev.title}</Text>
                      <View style={s.meta}>
                        {ev.type === 'materia' && ev.modo === 'virtual' && (
                          <View style={s.metaItem}>
                            <Icono src={ICONOS.video} size={12} />
                            <Text style={[s.metaTxt, { color: W.meta }]}>Virtual</Text>
                          </View>
                        )}
                        {hayLugar && (
                          <View style={[s.loc, { backgroundColor: K.chip }]}>
                            <Icono src={ICONOS.pin} size={12} />
                            <Text style={[s.locTxt, { color: K.link }]}>{ev.place}</Text>
                          </View>
                        )}
                        {(ev.start || ev.end) && (
                          <View style={s.metaItem}>
                            <Icono src={ICONOS.reloj} size={12} />
                            <Text style={[s.metaTxt, { color: W.meta }]}>{[ev.start, ev.end].filter(Boolean).join(' - ')}</Text>
                          </View>
                        )}
                      </View>
                    </View>

                    {!selectedDate && (
                      <Text style={[s.when, { backgroundColor: K.chip, color: K.link }]}>
                        {d.getDate()} {SHORT_MONTHS[d.getMonth()]}
                      </Text>
                    )}
                  </Pressable>

                  {abierto && (
                    <View style={[s.detalle, { borderTopColor: K.chip }]}>
                      <View style={s.detRow}>
                        <Text style={[s.detLbl, { color: W.meta }]}>Fecha</Text>
                        <Text style={[s.detVal, { color: W.ink }]}>{fechaLarga}</Text>
                      </View>
                      {(ev.start || ev.end) && (
                        <View style={s.detRow}>
                          <Text style={[s.detLbl, { color: W.meta }]}>Horario</Text>
                          <Text style={[s.detVal, { color: W.ink }]}>{[ev.start, ev.end].filter(Boolean).join(' a ')} hs</Text>
                        </View>
                      )}
                      {ev.type === 'materia' && (
                        <View style={s.detRow}>
                          <Text style={[s.detLbl, { color: W.meta }]}>Modalidad</Text>
                          <Text style={[s.detVal, { color: W.ink }]}>{ev.modo === 'virtual' ? 'Virtual' : 'Presencial'}</Text>
                        </View>
                      )}
                      {hayLugar && (
                        <View style={s.detRow}>
                          <Text style={[s.detLbl, { color: W.meta }]}>Lugar</Text>
                          <Text style={[s.detVal, { color: W.ink }]}>{ev.place}</Text>
                        </View>
                      )}
                      <View style={s.detBtns}>
                        {hayLugar && (
                          <Pressable style={[s.detBtn, { backgroundColor: K.primary }]} onPress={() => router.navigate('/mapa')}>
                            <Icono src={ICONOS.pin} size={14} tint={K.primaryTx} />
                            <Text style={[s.detBtnTxt, { color: K.primaryTx }]}>Ver en el mapa</Text>
                          </Pressable>
                        )}
                        {ev.custom && (
                          <Pressable style={[s.detBtn, { backgroundColor: K.chip }]} onPress={() => borrar(ev)}>
                            <Icono src={ICONOS.papelera} size={14} tint={K.link} />
                            <Text style={[s.detBtnTxt, { color: K.link }]}>Eliminar</Text>
                          </Pressable>
                        )}
                      </View>
                    </View>
                  )}
                </View>
              );
            })
          ) : (
            <View style={[s.empty, { borderColor: W.card }]}>
              <Text style={{ fontFamily: F.body, color: W.meta, textAlign: 'center', fontSize: 13.5 }}>No hay eventos para esta fecha.</Text>
              <Pressable onPress={() => openForm(selectedDate || todayKey)}>
                <Text style={[s.link, { color: K.link, textAlign: 'center', marginTop: 8 }]}>AGREGAR UN EVENTO</Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* evento nuevo */}
        <View style={s.newRow}>
          <Text style={[s.sectionTitle, { color: W.ink }]}>Evento nuevo</Text>
          <Pressable accessibilityLabel="Crear evento nuevo" onPress={() => openForm()} style={[s.plus, { backgroundColor: W.sq }]}>
            <Icono src={ICONOS.mas} size={20} tint={K.evIcoTx} />
          </Pressable>
        </View>
      </ScrollView>

      {/* hoja: evento nuevo */}
      <Modal visible={modalOpen} animationType="slide" transparent onRequestClose={() => setModalOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.backdrop}>
          <View style={[s.sheet, { backgroundColor: C.bg, borderColor: C.border }]}>
            <View style={[s.grab, { backgroundColor: C.elevated }]} />
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={[s.sheetTitle, { color: C.text }]}>Evento nuevo</Text>

              <Text style={[s.label, { color: C.dim }]}>Título</Text>
              <TextInput value={title} onChangeText={setTitle} maxLength={80} placeholder="Ej: Entrega de trabajo" placeholderTextColor={C.dim} style={inputStyle} />

              <Text style={[s.label, { color: C.dim }]}>Tipo</Text>
              <View style={s.types}>
                {([{ value: 'materia', label: 'Materia' }, { value: 'aviso', label: 'Recordatorio' }] as const).map((o) => {
                  const act = eventType === o.value;
                  const col = act ? K.primaryTx : C.text;
                  return (
                    <Pressable key={o.value} onPress={() => setEventType(o.value)} style={[s.typeOpt, { backgroundColor: act ? K.primary : C.bg, borderColor: act ? K.primary : C.border }]}>
                      <Icono src={o.value === 'materia' ? ICONOS.calendario : ICONOS.campana} size={16} tint={col} />
                      <Text style={{ fontFamily: F.bodyBold, fontSize: 12.5, color: col }}>{o.label}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={[s.label, { color: C.dim }]}>Fecha (AAAA-MM-DD)</Text>
              <TextInput value={date} onChangeText={setDate} placeholder="2026-10-17" placeholderTextColor={C.dim} autoCapitalize="none" style={inputStyle} />

              <Text style={[s.label, { color: C.dim }]}>Color del evento</Text>
              <View style={s.colorPalette}>
                {PALETA_EVENTOS.map((item) => {
                  const selected = eventColor === item.color;
                  return (
                    <Pressable
                      key={item.color}
                      accessibilityLabel={`Elegir color ${item.nombre}`}
                      accessibilityRole="button"
                      onPress={() => setEventColor(item.color)}
                      style={[s.colorOption, { backgroundColor: item.color, borderColor: selected ? C.text : 'transparent', borderWidth: selected ? 3 : 1 }]}
                    >
                      {selected && <Text style={s.colorCheck}>✓</Text>}
                    </Pressable>
                  );
                })}
              </View>
              <Text style={[s.colorName, { color: C.dim }]}>{PALETA_EVENTOS.find((item) => item.color === eventColor)?.nombre ?? 'Personalizado'}</Text>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={[s.label, { color: C.dim }]}>Desde (HH:MM)</Text>
                  <TextInput value={startTime} onChangeText={setStartTime} placeholder="13:30" placeholderTextColor={C.dim} style={inputStyle} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.label, { color: C.dim }]}>Hasta (HH:MM)</Text>
                  <TextInput value={endTime} onChangeText={setEndTime} placeholder="15:00" placeholderTextColor={C.dim} style={inputStyle} />
                </View>
              </View>

              {eventType === 'materia' && (
                <>
                  <Text style={[s.label, { color: C.dim }]}>Edificio (opcional)</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 7, paddingBottom: 4 }}>
                    {['', ...BUILDINGS].map((b) => {
                      const act = building === b;
                      return (
                        <Pressable key={b || 'ninguno'} onPress={() => setBuilding(b)} style={[s.chipB, { backgroundColor: act ? K.primary : C.panel2, borderColor: act ? K.primary : C.border }]}>
                          <Text style={{ fontFamily: F.bodyMed, color: act ? K.primaryTx : C.text }}>{b || 'Sin edificio'}</Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                  <Text style={[s.label, { color: C.dim }]}>Aula (opcional)</Text>
                  <TextInput value={classroom} onChangeText={setClassroom} maxLength={20} placeholder="Ej: 5" placeholderTextColor={C.dim} style={inputStyle} />
                </>
              )}

              <View style={s.actions}>
                <Pressable onPress={() => setModalOpen(false)} style={[s.btn, { backgroundColor: C.panel2, flex: 1 }]}>
                  <Text style={{ fontFamily: F.bold, fontSize: 15, color: C.text }}>Cancelar</Text>
                </Pressable>
                <Pressable onPress={saveEvent} style={[s.btn, { backgroundColor: K.primary, flex: 1.4 }]}>
                  <Text style={{ fontFamily: F.bold, fontSize: 15, color: K.primaryTx }}>Guardar evento</Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function makeStyles() {
  return StyleSheet.create({
    screen: { flex: 1 },
    h1: { fontFamily: F.h1, fontSize: 22, letterSpacing: 0.3, paddingTop: 16, paddingHorizontal: 18, paddingBottom: 14 },

    cal: { borderRadius: 16, overflow: 'hidden' },
    calHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10, paddingVertical: 6 },
    arrow: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
    month: { fontFamily: F.h1, fontSize: 20, letterSpacing: 0.5, color: '#fff' },
    year: { fontFamily: F.body, fontSize: 10.5, color: 'rgba(255,255,255,0.75)', marginTop: 1 },
    weekRow: { flexDirection: 'row', paddingHorizontal: 8, paddingVertical: 5 },
    weekday: { width: `${100 / 7}%`, textAlign: 'center', fontFamily: F.bold, fontSize: 11.5 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 8, paddingTop: 6, paddingBottom: 12 },
    dayCell: { width: `${100 / 7}%`, height: 40, alignItems: 'center', justifyContent: 'center' },
    dayNum: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'transparent' },
    dayTxt: { fontFamily: F.bodyMed, fontSize: 13.5 },
    marksRow: { position: 'absolute', bottom: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 2, maxWidth: '90%' },
    markDot: { width: 5, height: 5, borderRadius: 3 },

    sectionHead: { marginHorizontal: 2, marginTop: 20, marginBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    sectionTitle: { fontFamily: F.bold, fontSize: 15, flexShrink: 1 },
    link: { fontFamily: F.bold, fontSize: 11 },

    event: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 10 },
    eventCard: { borderRadius: 12, overflow: 'hidden' },
    detalle: { borderTopWidth: 1, marginHorizontal: 10, paddingVertical: 10, gap: 6 },
    detRow: { flexDirection: 'row', gap: 10 },
    detLbl: { width: 78, fontFamily: F.semi, fontSize: 11.5 },
    detVal: { flex: 1, fontFamily: F.body, fontSize: 12.5 },
    detBtns: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
    detBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, paddingVertical: 7, paddingHorizontal: 12 },
    detBtnTxt: { fontFamily: F.bodyBold, fontSize: 11.5 },
    evIco: { width: 36, height: 36, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
    evName: { fontFamily: F.semi, fontSize: 12.5, lineHeight: 17 },
    meta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 12, rowGap: 3 },
    metaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    metaTxt: { fontFamily: F.body, fontSize: 11 },
    loc: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 999, paddingVertical: 2, paddingLeft: 7, paddingRight: 9 },
    locTxt: { fontFamily: F.bodyBold, fontSize: 11 },
    when: { fontFamily: F.bold, fontSize: 10, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, overflow: 'hidden' },
    empty: { padding: 22, borderWidth: 1, borderStyle: 'dashed', borderRadius: 14 },

    newRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 28, marginHorizontal: 2 },
    plus: { width: 26, height: 26, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },

    backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(11,20,36,0.55)' },
    sheet: { maxHeight: '92%', borderTopLeftRadius: 22, borderTopRightRadius: 22, borderWidth: 1, borderBottomWidth: 0, paddingHorizontal: 18, paddingTop: 8, paddingBottom: 24 },
    grab: { alignSelf: 'center', width: 38, height: 4, borderRadius: 2, marginBottom: 12, marginTop: 1 },
    sheetTitle: { fontFamily: F.h1, fontSize: 18, marginBottom: 14 },
    label: { fontFamily: F.semi, fontSize: 13, marginBottom: 6, marginTop: 10 },
    input: { minHeight: 46, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9, fontFamily: F.bodyMed, fontSize: 14 },
    types: { flexDirection: 'row', gap: 8 },
    typeOpt: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
    chipB: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 8 },
    colorPalette: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingVertical: 5 },
    colorOption: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
    colorCheck: { color: '#FFFFFF', fontFamily: F.bodyBold, fontSize: 16, textShadowColor: 'rgba(0,0,0,0.35)', textShadowRadius: 2 },
    colorName: { fontFamily: F.body, fontSize: 12, marginTop: 1 },
    actions: { flexDirection: 'row', gap: 10, marginTop: 22, marginBottom: 8 },
    btn: { alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 14 },
  });
}