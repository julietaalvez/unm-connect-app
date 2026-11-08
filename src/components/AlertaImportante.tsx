import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { useNovedades } from '../lib/novedades';
import { usuarioActual } from '../lib/sesion';

// las novedades de aula que ya se mostraron en esta sesión
const mostradas = new Set<number>();

/** Cartel de "Cambio de aula": aparece al abrir la app si hay avisos de aula sin leer */
export default function AlertaImportante() {
  const { lista, cargado, leerTodas } = useNovedades();
  const [, setTick] = useState(0);
  const [abierto, setAbierto] = useState(false);

  const esAlumno = usuarioActual()?.rol !== 'profesor';
  const pendientes = useMemo(
    () => lista.filter((n) => n.tipo === 'aula' && !n.leida && !mostradas.has(n.id)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lista, abierto, setTick],
  );
  const actual = pendientes[0];

  useEffect(() => {
    if (esAlumno && cargado && actual) setAbierto(true);
  }, [esAlumno, cargado, actual?.id]);

  if (!esAlumno || !actual) return null;

  const cerrar = () => {
    mostradas.add(actual.id);
    if (pendientes.length <= 1) {
      setAbierto(false);
      leerTodas(); // quedan leídas: la campanita se limpia
    }
    setTick((t) => t + 1);
  };

  const detalle = actual.materia && !actual.texto.toLowerCase().includes(actual.materia.toLowerCase()) ? `${actual.materia}: ${actual.texto}` : actual.texto;

  return (
    <Modal visible={abierto} transparent animationType="fade" onRequestClose={cerrar}>
      <View style={s.fondo}>
        <View style={s.caja}>
          <Pressable onPress={cerrar} hitSlop={14} style={s.cerrar} accessibilityLabel="Cerrar">
            <Text style={s.cerrarTxt}>×</Text>
          </Pressable>
          <Svg width={64} height={64} viewBox="0 0 64 64" fill="none">
            <Path d="M32 8 L58 54 H6 Z" stroke="#fff" strokeWidth={4.5} strokeLinejoin="round" />
            <Path d="M32 24 V38" stroke="#fff" strokeWidth={4.5} strokeLinecap="round" />
            <Path d="M32 46 V47" stroke="#fff" strokeWidth={5} strokeLinecap="round" />
          </Svg>
          <Text style={s.titulo}>{actual.titulo.toUpperCase()}</Text>
          <Text style={s.texto}>{detalle}</Text>
          {pendientes.length > 1 && <Text style={s.mas}>{`+${pendientes.length - 1} aviso${pendientes.length - 1 === 1 ? '' : 's'} más`}</Text>}
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 28 },
  caja: { width: '100%', maxWidth: 340, backgroundColor: '#0c2370', borderRadius: 20, paddingVertical: 28, paddingHorizontal: 22, alignItems: 'center', elevation: 12 },
  cerrar: { position: 'absolute', top: 8, right: 14 },
  cerrarTxt: { color: '#fff', fontSize: 26, lineHeight: 28, fontWeight: '600' },
  titulo: { color: '#fff', fontSize: 17, fontWeight: '800', marginTop: 12, textAlign: 'center', letterSpacing: 0.3 },
  texto: { color: '#fff', fontSize: 13.5, marginTop: 10, textAlign: 'center', lineHeight: 19 },
  mas: { color: '#c9d4ff', fontSize: 11.5, marginTop: 12 },
});
