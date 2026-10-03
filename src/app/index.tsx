import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';

// Reemplazá esta IP por la que te dio el ipconfig
const API_URL = 'https://unm-backend-production.up.railway.app';

// Le decimos a TypeScript qué forma tiene un espacio
interface Espacio {
  id: string;
  nombre_visible: string;
  tipo: string;
  piso: string;
}

export default function HomeScreen() {
  const [espacios, setEspacios] = useState<Espacio[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/espacios`)
      .then(res => res.json())
      .then(data => {
        setEspacios(data);
        setCargando(false);
      })
      .catch(err => {
        console.log('Error al traer espacios:', err);
        setCargando(false);
      });
  }, []);

  if (cargando) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text>Cargando espacios...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>UNM Connect</Text>
      <FlatList
        data={espacios}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.nombre}>{item.nombre_visible}</Text>
            <Text>{item.tipo} — {item.piso}</Text>
          </View>
        )}
        ListEmptyComponent={<Text>No hay espacios cargados todavía.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingTop: 60 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  titulo: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  card: { backgroundColor: '#eee', padding: 15, borderRadius: 10, marginBottom: 10 },
  nombre: { fontSize: 16, fontWeight: '600' },
});