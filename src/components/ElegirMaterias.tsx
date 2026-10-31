import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { materiaDeMisCarreras, useMateriaCarreras, useMisCarreras } from '../lib/carreras';
import { armarCursadas, useCatalogo, useInscripciones } from '../lib/inscripciones';
import { useTema } from '../lib/tema';
import { Wf, useWf } from '../lib/wf';
import BotonTema from './BotonTema';

const F = {
  h2: 'Montserrat_800ExtraBold',
  semi: 'Montserrat_600SemiBold',
  body: 'Roboto_400Regular',
  bodyMed: 'Roboto_500Medium',
};

const norm = (t: string) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export default function ElegirMaterias({ alCerrar }: { alCerrar: () => void }) {
  const { C } = useTema();
  const { W, oscuro } = useWf();
  const s = useMemo(() => makeStyles(W, oscuro), [W, oscuro]);

  const [busqueda, setBusqueda] = useState('');
  const catalogo = useCatalogo();
  const { claves, inscribir, quitar } = useInscripciones();
  const { ids: misCarreras } = useMisCarreras();
  const materiaCarreras = useMateriaCarreras();
  const todas = useMemo(() => armarCursadas(catalogo), [catalogo]);

  const elegidas = useMemo(() => todas.filter((c) => claves.has(c.clave)), [todas, claves]);
  const resultados = useMemo(() => {
    const q = norm(busqueda.trim());
    return todas
      .filter(
        (c) =>
          !claves.has(c.clave) &&
          materiaDeMisCarreras(c.materia, materiaCarreras, misCarreras) &&
          (!q ||
            norm(c.materia).includes(q) ||
            norm(c.comision).includes(q) ||
            c.profes.some((p) => norm(p).includes(q)))
      )
      .slice(0, 40);
  }, [todas, claves, busqueda, materiaCarreras, misCarreras]);

  return (
    <View style={[s.screen, { backgroundColor: C.bg }]}>
      {/* CAMBIO: título + botón de modo claro/oscuro */}
      <View style={s.cabeza}>
        <Text style={s.titulo}>¿Qué materias cursás?</Text>
        <BotonTema />
      </View>
      <Text style={s.sub}>
        Elegí tus comisiones para recibir sus novedades y ver tus horarios. Podés cambiarlas cuando quieras
        desde Perfil → Mis materias.
      </Text>

      <TextInput
        value={busqueda}
        onChangeText={setBusqueda}
        placeholder="Buscar materia, comisión o docente"
        placeholderTextColor={W.meta}
        style={s.buscador}
      />

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 8, paddingBottom: 20 }} keyboardShouldPersistTaps="handled">
        {elegidas.map((c) => (
          <View key={c.clave} style={[s.fila, { borderColor: W.navy, borderWidth: 1.5 }]}>
            <View style={{ flex: 1 }}>
              <Text style={s.matB}>{c.materia}</Text>
              <Text style={s.matC}>{`Comisión ${c.comision}${c.profes.length ? ` · ${c.profes.join(', ')}` : ''}`}</Text>
            </View>
            <Pressable style={s.miniBtn} onPress={() => quitar(c.clave)}>
              <Text style={s.miniBtnTxt}>Quitar</Text>
            </Pressable>
          </View>
        ))}

        {resultados.length === 0 ? (
          <View style={s.fila}>
            <Text style={s.matC}>No hay materias que coincidan.</Text>
          </View>
        ) : (
          resultados.map((c) => (
            <View key={c.clave} style={s.fila}>
              <View style={{ flex: 1 }}>
                <Text style={s.matB}>{c.materia}</Text>
                <Text style={s.matC}>{`Comisión ${c.comision}${c.profes.length ? ` · ${c.profes.join(', ')}` : ''}`}</Text>
              </View>
              <Pressable style={s.miniBtn} onPress={() => inscribir(c.clave)}>
                <Text style={s.miniBtnTxt}>Agregar</Text>
              </Pressable>
            </View>
          ))
        )}
      </ScrollView>

      <Pressable style={s.boton} onPress={alCerrar}>
        <Text style={s.botonTxt}>{elegidas.length > 0 ? 'Listo' : 'Saltar por ahora'}</Text>
      </Pressable>
    </View>
  );
}

const makeStyles = (W: Wf, oscuro: boolean) =>
  StyleSheet.create({
    screen: { flex: 1, paddingTop: 56, paddingHorizontal: 24, paddingBottom: 28 },
    cabeza: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }, // CAMBIO
    titulo: { flex: 1, fontFamily: F.h2, fontSize: 20, color: W.ink },
    sub: { fontFamily: F.body, fontSize: 12.5, lineHeight: 18, color: W.meta, marginTop: 6, marginBottom: 14 },
    buscador: { backgroundColor: W.soft, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontFamily: F.body, fontSize: 13, color: W.ink, marginBottom: 12 },
    fila: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: W.soft, borderRadius: 10, paddingVertical: 9, paddingHorizontal: 12 },
    matB: { fontFamily: F.semi, fontSize: 12.5, color: W.ink },
    matC: { fontFamily: F.body, fontSize: 11, color: W.meta, marginTop: 2 },
    miniBtn: { borderRadius: 999, paddingVertical: 5, paddingHorizontal: 12, backgroundColor: W.tile },
    miniBtnTxt: { fontFamily: F.bodyMed, fontSize: 11.5, color: W.ink },
    boton: { backgroundColor: W.navy, borderRadius: 999, paddingVertical: 12, alignItems: 'center', marginTop: 10 },
    botonTxt: { fontFamily: F.semi, fontSize: 14, color: oscuro ? '#04101f' : '#ffffff' },
  });