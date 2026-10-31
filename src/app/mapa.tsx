import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import BuildingInterior from '../components/BuildingInterior';
import CampusMap from '../components/CampusMap';
import { EDIFICIOS } from '../data/edificios';

type Destino = { floor: string; id: string };

// Se guardan afuera del componente: si la pantalla se vuelve a armar (por ejemplo al cambiar de tema),
// no se pierde en qué edificio estabas.
let edificioGuardado: string | null = null;
let destinoGuardado: Destino | undefined;

// expo-router puede devolver un parámetro como texto o como lista
const uno = (v?: string | string[]) => (Array.isArray(v) ? v[0] : v) || undefined;

// La base dice "edificio-historico"; se prueba también sin el prefijo por las dudas.
// Devuelve null si ese edificio no tiene plano interior (así no se rompe BuildingInterior).
function resolverEdificio(raw?: string): string | null {
  if (!raw) return null;
  const sin = raw.replace(/^edificio-/, '');
  return [raw, 'edificio-' + sin, sin].find((k) => !!EDIFICIOS[k]) ?? null;
}

// Busca en qué piso está dibujada el aula (el código del mapa es el id del espacio)
function destinoDeAula(edificio: string, aula?: string): Destino | undefined {
  if (!aula) return undefined;
  const pisos = EDIFICIOS[edificio].floors;
  for (const floor of Object.keys(pisos)) {
    if (pisos[floor].shapes.some((x) => x.id === aula)) return { floor, id: aula };
  }
  return undefined;
}

export default function MapaScreen() {
  const [edificioId, setEdificio] = useState<string | null>(edificioGuardado);
  const [destino, setDestino] = useState<Destino | undefined>(destinoGuardado);
  const params = useLocalSearchParams<{ edificioId?: string; aula?: string; t?: string }>();

  const elegir = (id: string | null, d?: Destino) => {
    edificioGuardado = id;
    destinoGuardado = d;
    setEdificio(id);
    setDestino(d);
  };

  // Viene desde "¿Y mi profe?" -> "Cómo llegar": abre el edificio y deja el aula elegida
  useEffect(() => {
    const ed = resolverEdificio(uno(params.edificioId));
    if (!ed) return;
    elegir(ed, destinoDeAula(ed, uno(params.aula)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.edificioId, params.aula, params.t]);

  return (
    <View style={{ flex: 1 }}>
      {/* el campus queda montado (solo oculto) para no perder lo que estaba seleccionado */}
      <View style={{ flex: 1, display: edificioId ? 'none' : 'flex' }}>
        <CampusMap onEnterBuilding={(id, d) => elegir(id, d)} />
      </View>
      {edificioId && (
        <BuildingInterior
          key={edificioId + (destino?.id ?? '')}
          buildingId={edificioId}
          inicial={destino}
          onBack={() => elegir(null)}
        />
      )}
    </View>
  );
}