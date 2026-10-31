import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { useNovedades } from '../lib/novedades';

const F = { h: 'Montserrat_800ExtraBold', semi: 'Montserrat_600SemiBold', body: 'Roboto_400Regular', bold: 'Roboto_700Bold' };

/**
 * Cartel que aparece solo con las novedades importantes (hoy: los cambios de aula) que todavía no leíste.
 * Al cerrarlo, esa novedad queda como leída y, si hay otra, aparece la siguiente.
 */
export default function AlertaImportante() {
  const { lista, leerUna } = useNovedades();
  const n = lista.find((x) => x.tipo === 'aula' && !x.leida);
  if (!n) return null;

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={() => leerUna(n.id)}>
      <View style={s.fondo}>
        <View style={s.card}>
          <Pressable style={s.cerrar} onPress={() => leerUna(n.id)} hitSlop={12} accessibilityLabel="Cerrar aviso">
            <Svg width={14} height={14} viewBox="0 0 14 14">
              <Path d="M2 2 L12 12 M12 2 L2 12" stroke="#fff" strokeWidth={2} strokeLinecap="round" />
            </Svg>
          </Pressable>

          <Svg width={64} height={64} viewBox="0 0 64 64">
            <Path d="M32 6 L60 56 H4 Z" stroke="#fff" strokeWidth={4} strokeLinejoin="round" fill="none" />
            <Path d="M32 24 V38" stroke="#fff" strokeWidth={4.5} strokeLinecap="round" />
            <Path d="M32 46 V47" stroke="#fff" strokeWidth={5} strokeLinecap="round" />
          </Svg>

          <Text style={s.tag}>CAMBIO DE AULA</Text>
          {!!n.titulo && <Text style={s.titulo}>{n.titulo}</Text>}
          {!!n.texto && <Text style={s.texto}>{n.texto}</Text>}
          {!!n.materia && <Text style={s.materia}>{n.materia}</Text>}

          <Pressable style={s.btn} onPress={() => leerUna(n.id)}>
            <Text style={s.btnTxt}>Entendido</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: 'rgba(5,12,30,0.6)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 360, backgroundColor: '#1a3399', borderRadius: 18, paddingTop: 28, paddingBottom: 20, paddingHorizontal: 22, alignItems: 'center', gap: 8, elevation: 12 },
  cerrar: { position: 'absolute', top: 12, right: 14, padding: 4 },
  tag: { fontFamily: F.semi, fontSize: 15, letterSpacing: 0.6, color: '#fff', marginTop: 6 },
  titulo: { fontFamily: F.bold, fontSize: 14, color: '#fff', textAlign: 'center' },
  texto: { fontFamily: F.body, fontSize: 13, lineHeight: 19, color: 'rgba(255,255,255,0.92)', textAlign: 'center' },
  materia: { fontFamily: F.body, fontSize: 11.5, color: 'rgba(255,255,255,0.7)', textAlign: 'center' },
  btn: { marginTop: 10, backgroundColor: '#fff', borderRadius: 999, paddingVertical: 9, paddingHorizontal: 26 },
  btnTxt: { fontFamily: F.bold, fontSize: 13, color: '#1a3399' },
});
