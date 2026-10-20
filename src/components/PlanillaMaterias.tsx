import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCarreras, useMateriaCarreras, useMisCarreras } from '../lib/carreras';
import { useCatalogo } from '../lib/inscripciones';
import { Registro, useProgreso } from '../lib/progreso';
import { Colores, useTema } from '../lib/tema';

const AZUL = '#4f8ef7'; // color de "en curso"

type Item = { nombre: string; anio: number; cuatri: number };

// Campo de la nota: se arma solo cuando la materia está aprobada
function NotaInput({ inicial, onGuardar, s, C }: { inicial?: number; onGuardar: (t: string) => void; s: any; C: Colores }) {
  const [txt, setTxt] = useState(inicial != null ? String(inicial) : '');
  return (
    <View style={s.notaBox}>
      <Text style={s.notaLabel}>Nota</Text>
      <TextInput
        value={txt}
        onChangeText={(t) => setTxt(t.replace(/[^0-9.,]/g, '').slice(0, 4))}
        onEndEditing={() => onGuardar(txt)}
        onBlur={() => onGuardar(txt)}
        keyboardType="decimal-pad"
        placeholder="–"
        placeholderTextColor={C.placeholder}
        maxLength={4}
        style={s.notaInput}
      />
    </View>
  );
}

function Fila({ item, reg, onToque, onNota, s, C }: { item: Item; reg?: Registro; onToque: () => void; onNota: (t: string) => void; s: any; C: Colores }) {
  const aprobada = reg?.estado === 'aprobada';
  const cursando = reg?.estado === 'cursando';
  return (
    <View style={[s.fila, cursando && s.filaCursando, aprobada && s.filaAprobada]}>
      <Pressable style={[s.filaTap, aprobada && { opacity: 0.5 }]} onPress={onToque}>
        <View style={[s.check, cursando && s.checkCursando, aprobada && s.checkAprobada]}>
          <Text style={[s.checkTxt, aprobada && { color: C.onAccent }]}>{aprobada ? '✓' : cursando ? '●' : ''}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[s.nombre, aprobada && s.tachado]}>{item.nombre}</Text>
          {item.cuatri > 0 && <Text style={s.sub}>{`${item.cuatri}.º cuatrimestre`}</Text>}
        </View>
        {cursando && <Text style={s.tagCursando}>En curso</Text>}
      </Pressable>
      {aprobada && <NotaInput inicial={reg?.nota} onGuardar={onNota} s={s} C={C} />}
    </View>
  );
}

export default function PlanillaMaterias({ alCerrar }: { alCerrar: () => void }) {
  const { C } = useTema();
  const s = useMemo(() => makeStyles(C), [C]);
  const insets = useSafeAreaInsets();

  const { carreras } = useCarreras();
  const { ids, listo: carrerasListas } = useMisCarreras();
  const mapa = useMateriaCarreras();
  const catalogo = useCatalogo();
  const { datos, ciclar, ponerNota } = useProgreso();

  const [sel, setSel] = useState<number | null>(null);
  const activa = sel ?? ids[0] ?? null;

  // año y cuatrimestre de cada materia, sacados de los horarios cargados
  const info = useMemo(() => {
    const m = new Map<string, { anio: number; cuatri: number }>();
    for (const p of catalogo) {
      for (const f of p.franjas as any[]) {
        if (!f.materia) continue;
        const prev = m.get(f.materia);
        if (!prev || (!prev.anio && f.anio)) m.set(f.materia, { anio: Number(f.anio) || 0, cuatri: Number(f.cuatrimestre) || 0 });
      }
    }
    return m;
  }, [catalogo]);

  const items: Item[] = useMemo(() => {
    if (activa == null) return [];
    return Object.keys(mapa)
      .filter((n) => mapa[n].includes(activa))
      .map((n) => ({ nombre: n, ...(info.get(n) ?? { anio: 0, cuatri: 0 }) }));
  }, [mapa, activa, info]);

  const porAnio = useMemo(() => {
    const g = new Map<number, Item[]>();
    for (const it of items) g.set(it.anio, [...(g.get(it.anio) ?? []), it]);
    const anios = [...g.keys()].sort((a, b) => (a === 0 ? 1 : b === 0 ? -1 : a - b));
    return anios.map((a) => ({
      anio: a,
      materias: g.get(a)!.sort((x, y) => x.cuatri - y.cuatri || x.nombre.localeCompare(y.nombre, 'es')),
    }));
  }, [items]);

  // resumen
  const delPlan = items.map((i) => datos[i.nombre]).filter(Boolean) as Registro[];
  const aprobadas = delPlan.filter((r) => r.estado === 'aprobada');
  const cursando = delPlan.filter((r) => r.estado === 'cursando').length;
  const notas = aprobadas.map((r) => r.nota).filter((n): n is number => n != null);
  const promedio = notas.length ? (notas.reduce((a, b) => a + b, 0) / notas.length).toFixed(2) : '–';
  const pct = items.length ? Math.round((aprobadas.length / items.length) * 100) : 0;

  const nombreCarrera = carreras.find((c) => c.id === activa)?.nombre ?? 'Mi carrera';

  return (
    <View style={[s.screen, { paddingTop: insets.top + 8 }]}>
      <View style={s.head}>
        <Text style={s.titulo}>Mis materias</Text>
        <Pressable onPress={alCerrar} hitSlop={10} style={s.cerrar}>
          <Text style={{ color: C.text, fontSize: 14, fontWeight: '700' }}>✕</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 60 }}>
        {carrerasListas && ids.length === 0 ? (
          <View style={s.vacio}>
            <Text style={s.vacioTxt}>Todavía no elegiste tu carrera. Elegila en tu perfil para ver la planilla de materias.</Text>
          </View>
        ) : (
          <>
            {ids.length > 1 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
                {ids.map((id) => (
                  <Pressable key={id} onPress={() => setSel(id)} style={[s.chip, id === activa && s.chipOn]}>
                    <Text style={[s.chipTxt, id === activa && { color: C.onAccent }]}>{carreras.find((c) => c.id === id)?.nombre ?? `Carrera ${id}`}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            )}

            <View style={s.resumen}>
              <Text style={s.carrera}>{nombreCarrera}</Text>
              <View style={s.barra}>
                <View style={[s.barraFill, { width: `${pct}%` }]} />
              </View>
              <View style={s.stats}>
                <View style={s.stat}>
                  <Text style={s.statN}>{`${aprobadas.length}/${items.length}`}</Text>
                  <Text style={s.statL}>aprobadas</Text>
                </View>
                <View style={s.stat}>
                  <Text style={s.statN}>{cursando}</Text>
                  <Text style={s.statL}>en curso</Text>
                </View>
                <View style={s.stat}>
                  <Text style={s.statN}>{promedio}</Text>
                  <Text style={s.statL}>promedio</Text>
                </View>
                <View style={s.stat}>
                  <Text style={s.statN}>{`${pct}%`}</Text>
                  <Text style={s.statL}>avance</Text>
                </View>
              </View>
            </View>

            <Text style={s.ayuda}>Tocá una materia para cambiar su estado: pendiente, en curso o aprobada. Al aprobarla podés poner la nota.</Text>

            {items.length === 0 ? (
              <View style={s.vacio}>
                <Text style={s.vacioTxt}>No encontramos materias para esta carrera. Revisá tu conexión e intentá de nuevo.</Text>
              </View>
            ) : (
              porAnio.map((g) => (
                <View key={g.anio}>
                  <Text style={s.anio}>{g.anio === 0 ? 'Otras materias' : `${g.anio}.º año`}</Text>
                  {g.materias.map((it) => (
                    <Fila key={it.nombre} item={it} reg={datos[it.nombre]} onToque={() => ciclar(it.nombre)} onNota={(t) => ponerNota(it.nombre, t)} s={s} C={C} />
                  ))}
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const makeStyles = (C: Colores) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: C.bg },
    head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingBottom: 10 },
    titulo: { fontSize: 20, fontWeight: '800', color: C.text },
    cerrar: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: C.elevated },

    chips: { paddingHorizontal: 18, gap: 8, paddingBottom: 10 },
    chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: C.elevated, borderWidth: 1, borderColor: C.border },
    chipOn: { backgroundColor: C.accent, borderColor: C.accent },
    chipTxt: { fontSize: 12, fontWeight: '700', color: C.text },

    resumen: { marginHorizontal: 18, padding: 14, borderRadius: 16, backgroundColor: C.panel2, borderWidth: 1, borderColor: C.border },
    carrera: { fontSize: 14, fontWeight: '700', color: C.text, marginBottom: 10 },
    barra: { height: 8, borderRadius: 4, backgroundColor: C.elevated, overflow: 'hidden' },
    barraFill: { height: 8, borderRadius: 4, backgroundColor: C.accent },
    stats: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
    stat: { alignItems: 'center', flex: 1 },
    statN: { fontSize: 17, fontWeight: '800', color: C.text },
    statL: { fontSize: 10.5, color: C.dim, marginTop: 2 },

    ayuda: { marginHorizontal: 18, marginTop: 12, marginBottom: 4, fontSize: 11.5, color: C.dim },
    anio: { marginHorizontal: 18, marginTop: 14, marginBottom: 6, fontSize: 13, fontWeight: '800', color: C.text },

    fila: { marginHorizontal: 18, marginBottom: 6, borderRadius: 12, backgroundColor: C.panel2, borderWidth: 1, borderColor: C.border, flexDirection: 'row', alignItems: 'center', paddingRight: 10 },
    filaCursando: { backgroundColor: 'rgba(79,142,247,0.16)', borderColor: AZUL },
    filaAprobada: { backgroundColor: C.elevated },
    filaTap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 11 },
    check: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
    checkCursando: { borderColor: AZUL },
    checkAprobada: { backgroundColor: C.accent, borderColor: C.accent },
    checkTxt: { fontSize: 12, fontWeight: '800', color: AZUL },
    nombre: { fontSize: 13, fontWeight: '600', color: C.text },
    tachado: { textDecorationLine: 'line-through' },
    sub: { fontSize: 10.5, color: C.dim, marginTop: 1 },
    tagCursando: { fontSize: 10, fontWeight: '700', color: AZUL },

    notaBox: { alignItems: 'center', marginLeft: 4 },
    notaLabel: { fontSize: 9.5, color: C.dim },
    notaInput: { width: 46, height: 30, textAlign: 'center', fontSize: 14, fontWeight: '700', color: C.text, borderWidth: 1, borderColor: C.border, borderRadius: 8, backgroundColor: C.bg, padding: 0 },

    vacio: { marginHorizontal: 18, marginTop: 20, padding: 16, borderRadius: 14, backgroundColor: C.panel2, borderWidth: 1, borderColor: C.border },
    vacioTxt: { fontSize: 13, color: C.dim },
  });