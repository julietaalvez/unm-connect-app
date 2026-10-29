import { useState } from 'react';
import { View } from 'react-native';
import BuildingInterior from '../components/BuildingInterior';
import CampusMap from '../components/CampusMap';

type Destino = { floor: string; id: string };

// Se guardan afuera del componente: si la pantalla se vuelve a armar (por ejemplo al cambiar de tema),
// no se pierde en qué edificio estabas.
let edificioGuardado: string | null = null;
let destinoGuardado: Destino | undefined;

export default function MapaScreen() {
  const [edificioId, setEdificio] = useState<string | null>(edificioGuardado);
  const [destino, setDestino] = useState<Destino | undefined>(destinoGuardado);

  const elegir = (id: string | null, d?: Destino) => {
    edificioGuardado = id;
    destinoGuardado = d;
    setEdificio(id);
    setDestino(d);
  };

  return (
    <View style={{ flex: 1 }}>
      {/* el campus queda montado (solo oculto) para no perder lo que estaba seleccionado */}
      <View style={{ flex: 1, display: edificioId ? 'none' : 'flex' }}>
        <CampusMap onEnterBuilding={(id, d) => elegir(id, d)} />
      </View>
      {edificioId && <BuildingInterior key={edificioId + (destino?.id ?? '')} buildingId={edificioId} inicial={destino} onBack={() => elegir(null)} />}
    </View>
  );
}
