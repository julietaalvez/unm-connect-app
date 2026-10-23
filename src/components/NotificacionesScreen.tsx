import { useEffect, useMemo } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useNovedades, type NovedadUsuario } from '../lib/novedades';
import { useTema } from '../lib/tema';
import { Wf, useWf } from '../lib/wf';

const ICONO = {
  aula: require('../../assets/icons/pin.png'),
  evento: require('../../assets/icons/materias.png'),
  aviso: require('../../assets/icons/campana.png'),
};
const ETIQUETA = { aula: 'Cambio de aula', evento: 'Evento', aviso: 'Aviso' };
const ATRAS = require('../../assets/icons/atras.png');

const F = {
  h2: 'Montserrat_800ExtraBold',
  semi: 'Montserrat_600SemiBold',
  body: 'Roboto_400Regular',
  bodyMed: 'Roboto_500Medium',
};

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const cuando = (iso: string) => {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '' : `${d.getDate()} ${MESES[d.getMonth()]}`;
};

export default function NotificacionesScreen({ alCerrar }: { alCerrar: () => void }) {
  const { C } = useTema();
  const { W } = useWf();
  const s = useMemo(() => makeStyles(W), [W]);
  const { lista, cargado, sinLeer, recargar, leerTodas } = useNovedades();

  // al abrir se actualiza la lista; al cerrar (por el botón o por "atrás") todo queda como leído
  useEffect(() => {
    recargar();
    return () => leerTodas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const Item = ({ n }: { n: NovedadUsuario }) => (
    <View style={[s.item, !n.leida && s.itemNuevo]}>
      <Image source={ICONO[n.tipo]} style={s.itemIco} resizeMode="contain" />
      <View style={{ flex: 1 }}>
        <View style={s.itemTop}>
          <Text style={s.tipo}>{ETIQUETA[n.tipo]}</Text>
          <Text style={s.fecha}>{cuando(n.fecha)}</Text>
        </View>
        <Text style={s.titulo}>{n.titulo}</Text>
        <Text style={s.texto}>{n.texto}</Text>
        {!!n.materia && <Text style={s.materia}>{n.materia}</Text>}
      </View>
      {!n.leida && <View style={s.punto} />}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView contentContainerStyle={s.contenido}>
        <View style={s.cab}>
          <Pressable onPress={alCerrar} hitSlop={10} accessibilityLabel="Volver">
            <Image source={ATRAS} style={{ width: 26, height: 26 }} resizeMode="contain" />
          </Pressable>
          <Text style={s.cabTitulo}>Notificaciones</Text>
          <View style={{ width: 26 }} />
        </View>

        {sinLeer > 0 && <Text style={s.resumen}>{sinLeer === 1 ? '1 nueva' : `${sinLeer} nuevas`}</Text>}

        {!cargado ? (
          <Text style={s.vacio}>Cargando…</Text>
        ) : lista.length === 0 ? (
          <Text style={s.vacio}>No tenés notificaciones.</Text>
        ) : (
          lista.map((n) => <Item key={n.id} n={n} />)
        )}
      </ScrollView>
    </View>
  );
}

const makeStyles = (W: Wf) =>
  StyleSheet.create({
    contenido: { paddingHorizontal: 22, paddingTop: 54, paddingBottom: 40, gap: 10 },
    cab: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
    cabTitulo: { fontFamily: F.h2, fontSize: 17, color: W.ink },
    resumen: { fontFamily: F.bodyMed, fontSize: 12.5, color: W.meta, textAlign: 'center', marginBottom: 4 },
    vacio: { fontFamily: F.body, fontSize: 13, color: W.meta, textAlign: 'center', marginTop: 30 },

    item: { flexDirection: 'row', gap: 12, backgroundColor: W.soft, borderRadius: 12, padding: 12 },
    itemNuevo: { backgroundColor: W.card, borderWidth: 1.5, borderColor: W.navy },
    itemIco: { width: 22, height: 22, marginTop: 2 },
    itemTop: { flexDirection: 'row', justifyContent: 'space-between' },
    tipo: { fontFamily: F.bodyMed, fontSize: 11, color: W.meta },
    fecha: { fontFamily: F.body, fontSize: 11, color: W.meta },
    titulo: { fontFamily: F.semi, fontSize: 13.5, color: W.ink, marginTop: 2 },
    texto: { fontFamily: F.body, fontSize: 12.5, lineHeight: 18, color: W.ink, marginTop: 2 },
    materia: { fontFamily: F.bodyMed, fontSize: 11, color: W.meta, marginTop: 6 },
    punto: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#e03131', marginTop: 4 },
  });