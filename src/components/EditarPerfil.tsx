import { useEffect, useMemo, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { useCarreras, useMisCarreras } from '../lib/carreras';
import { elegirFoto, guardarPerfil } from '../lib/perfil';
import { usuarioActual } from '../lib/sesion';
import { useTema } from '../lib/tema';
import { Wf, useWf } from '../lib/wf';

const F = {
  h2: 'Montserrat_800ExtraBold',
  semi: 'Montserrat_600SemiBold',
  body: 'Roboto_400Regular',
  bodyMed: 'Roboto_500Medium',
};

const iniciales = (nombre: string) => {
  const p = nombre.trim().split(/\s+/);
  return ((p[0]?.[0] ?? '') + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase() || '?';
};

export default function EditarPerfil({ alCerrar, alGuardar }: { alCerrar: () => void; alGuardar: () => void }) {
  const { C } = useTema();
  const { W } = useWf();
  const s = useMemo(() => makeStyles(W), [W]);
  const u = usuarioActual();
    const { carreras } = useCarreras();
  const { ids: misCarreras, listo, guardar: guardarCarreras } = useMisCarreras();
  const [elegidas, setElegidas] = useState<number[]>([]);
  const [carrerasListas, setCarrerasListas] = useState(false);

  // cuando llegan mis carreras del servidor, las marco una sola vez
  useEffect(() => {
    if (listo && !carrerasListas) {
      setElegidas(misCarreras);
      setCarrerasListas(true);
    }
  }, [listo, misCarreras, carrerasListas]);

  const alternarCarrera = (id: number) =>
    setElegidas((a) => (a.includes(id) ? a.filter((x) => x !== id) : [...a, id]));

  const [nombre, setNombre] = useState(u?.nombre ?? '');
  const [foto, setFoto] = useState<string | null>(u?.foto ?? null);
  const [fotoCambio, setFotoCambio] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState(u?.email ?? '');
  const cambiarFoto = async () => {
    try {
      const nueva = await elegirFoto();
      if (nueva) {
        setFoto(nueva);
        setFotoCambio(true);
      }
    } catch {
      Alert.alert('Foto', 'No se pudo abrir la galería.');
    }
  };

  const quitarFoto = () => {
    setFoto(null);
    setFotoCambio(true);
  };

  const guardar = async () => {
        const n = nombre.trim();
    const e = email.trim();
    if (n.length < 2) {
      setError('Escribí tu nombre.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
      setError('Escribí un email válido.');
      return;
    }
        if (elegidas.length === 0) {
      setError('Elegí al menos una carrera.');
      return;
    }
    setError('');
    setGuardando(true);
    try {
      await guardarPerfil({
        nombre: n,
        ...(e.toLowerCase() !== (u?.email ?? '').toLowerCase() ? { email: e } : {}),
        ...(fotoCambio ? { foto } : {}),
      });
      await guardarPerfil({ nombre: n, ...(fotoCambio ? { foto } : {}) });
            const cambiaron =
        elegidas.length !== misCarreras.length || elegidas.some((id) => !misCarreras.includes(id));
      if (cambiaron) await guardarCarreras(elegidas);
      alGuardar();
      alCerrar();
      
    } catch (e: any) {
      setError(e?.message || 'No se pudo guardar.');
      setGuardando(false);
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: C.bg }}
      contentContainerStyle={s.contenido}
      keyboardShouldPersistTaps="handled">
      <View style={s.cab}>
        <Pressable onPress={alCerrar} hitSlop={10}>
          <Text style={s.cancelar}>Cancelar</Text>
        </Pressable>
        <Text style={s.titulo}>Editar perfil</Text>
        <View style={{ width: 60 }} />
      </View>

      <Pressable style={s.avatar} onPress={cambiarFoto} accessibilityLabel="Cambiar foto de perfil">
        {foto ? (
          <Image source={{ uri: foto }} style={s.avatarImg} />
        ) : (
          <Text style={s.avatarTxt}>{iniciales(nombre || u?.nombre || '')}</Text>
        )}
      </Pressable>

      <View style={s.fotoBtns}>
        <Pressable style={s.btnChico} onPress={cambiarFoto}>
          <Text style={s.btnChicoTxt}>{foto ? 'Cambiar foto' : 'Elegir foto'}</Text>
        </Pressable>
        {!!foto && (
          <Pressable style={s.btnChico} onPress={quitarFoto}>
            <Text style={s.btnChicoTxt}>Quitar foto</Text>
          </Pressable>
        )}
      </View>

      <Text style={s.label}>Nombre y apellido</Text>
      <TextInput
        style={s.input}
        value={nombre}
        onChangeText={setNombre}
        placeholder="Nombre y apellido"
        placeholderTextColor={W.meta}
        maxLength={100}
      />

      <Text style={s.label}>Email</Text>
            <TextInput
        style={s.input}
        value={email}
        onChangeText={setEmail}
        placeholder="Email"
        placeholderTextColor={W.meta}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        maxLength={150}
      />

            <Text style={s.label}>Mis carreras</Text>
      <View style={s.chips}>
        {carreras.map((c) => {
          const on = elegidas.includes(c.id);
          return (
            <Pressable key={c.id} style={[s.chip, on && { backgroundColor: W.navy }]} onPress={() => alternarCarrera(c.id)}>
              <Text style={[s.chipTxt, on && { color: '#ffffff' }]}>{on ? '✓ ' : ''}{c.nombre}</Text>
            </Pressable>
          );
        })}
        {carreras.length === 0 && <Text style={s.nota}>Cargando carreras…</Text>}
      </View>
      <Text style={s.nota}>Al buscar materias solo vas a ver las de las carreras que elijas.</Text>

      {!!error && <Text style={s.error}>{error}</Text>}

      <Pressable style={[s.guardar, guardando && { opacity: 0.6 }]} onPress={guardar} disabled={guardando}>
        <Text style={s.guardarTxt}>{guardando ? 'Guardando…' : 'Guardar cambios'}</Text>
      </Pressable>
    </ScrollView>
  );
}

const makeStyles = (W: Wf) =>
  StyleSheet.create({
    contenido: { paddingHorizontal: 30, paddingTop: 54, paddingBottom: 40 },
    cab: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 },
    cancelar: { width: 60, fontFamily: F.bodyMed, fontSize: 13.5, color: W.ink },
    titulo: { fontFamily: F.h2, fontSize: 17, color: W.ink },

    avatar: {
      width: 120, height: 120, borderRadius: 60, backgroundColor: W.card,
      alignItems: 'center', justifyContent: 'center', alignSelf: 'center', overflow: 'hidden',
    },
    avatarImg: { width: 120, height: 120 },
    avatarTxt: { fontFamily: F.h2, fontSize: 38, color: W.ink },
    fotoBtns: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginTop: 12, marginBottom: 24 },
    btnChico: { backgroundColor: W.soft, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 16 },
    btnChicoTxt: { fontFamily: F.bodyMed, fontSize: 12.5, color: W.ink },

    label: { fontFamily: F.semi, fontSize: 12.5, color: W.ink, marginBottom: 6 },
    input: {
      backgroundColor: W.card, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 14,
      fontFamily: F.body, fontSize: 14, color: W.ink, marginBottom: 16,
    },
    inputTxt: { fontFamily: F.body, fontSize: 14, color: W.ink },
    nota: { fontFamily: F.body, fontSize: 11.5, color: W.meta, marginBottom: 18 },    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
    chip: { backgroundColor: W.card, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 14 },
    chipTxt: { fontFamily: F.bodyMed, fontSize: 12.5, color: W.ink },

    error: { fontFamily: F.body, fontSize: 12.5, color: '#c0392b', marginBottom: 10 },
    guardar: { backgroundColor: W.navy, borderRadius: 999, paddingVertical: 13, alignItems: 'center' },
    guardarTxt: { fontFamily: F.semi, fontSize: 14, color: '#ffffff' },
  });