import { useState } from 'react';
import { View } from 'react-native';
import BuildingInterior from '../components/BuildingInterior';
import CampusMap from '../components/CampusMap';

export default function MapaScreen() {
  const [edificioId, setEdificioId] = useState<string | null>(null);

  return (
    <View style={{ flex: 1 }}>
      {/* el campus queda montado (solo oculto) para no perder lo que estaba seleccionado */}
      <View style={{ flex: 1, display: edificioId ? 'none' : 'flex' }}>
        <CampusMap onEnterBuilding={setEdificioId} />
      </View>
      {edificioId && <BuildingInterior buildingId={edificioId} onBack={() => setEdificioId(null)} />}
    </View>
  );
}
