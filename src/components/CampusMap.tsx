import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, Path, Polygon, Text as SvgText } from 'react-native-svg';

import { BUILDINGS, Building, FIELD, GATES, PATH_D, PATH_POLYGONS } from '../data/campus';
import { EDIFICIOS_CON_INTERIOR } from '../data/edificios';

const VB_X = -70;
const VB_W = 1270;
const VB_H = 860;
const LABEL_PX = 13; // tamaño de letra legible en pantalla

// Centro de un polígono (para poner el nombre encima)
function centro(points: string) {
  const pts = points.split(' ').map((p) => p.split(',').map(Number));
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  return {
    x: (Math.min(...xs) + Math.max(...xs)) / 2,
    y: (Math.min(...ys) + Math.max(...ys)) / 2,
  };
}

// Devuelve el id del plano interior de un edificio, o undefined si todavía no tiene
function idInterior(id: string) {
  return EDIFICIOS_CON_INTERIOR.find(
    (k) => k === id || k === 'edificio-' + id || k.replace('edificio-', '') === id
  );
}

type Props = { onEnterBuilding?: (id: string) => void };

export default function CampusMap({ onEnterBuilding }: Props) {
  const { width } = useWindowDimensions();
  const [selected, setSelected] = useState<Building | null>(null);

  const mapWidth = width * 2.4; // el mapa es más ancho que la pantalla: se desliza con el dedo
  const mapHeight = (mapWidth * VB_H) / VB_W;
  const fontSize = LABEL_PX / (mapWidth / VB_W);

  const centros = useMemo(
    () => Object.fromEntries(BUILDINGS.map((b) => [b.id, centro(b.points)])),
    []
  );

  const interior = selected ? idInterior(selected.id) : undefined;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ paddingBottom: 32 }}>
      <View style={styles.mapCard}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <Svg width={mapWidth} height={mapHeight} viewBox={`${VB_X} 0 ${VB_W} ${VB_H}`}>
            {FIELD.map((p, i) => (
              <Polygon key={`f${i}`} points={p} fill="#5fae7a" />
            ))}
            <Path d={PATH_D} fill="#b9cdf0" opacity={0.9} />
            {PATH_POLYGONS.map((p, i) => (
              <Polygon key={`p${i}`} points={p} fill="#b9cdf0" opacity={0.9} />
            ))}

            {BUILDINGS.map((b) => (
              <Polygon
                key={b.id}
                points={b.points}
                fill={selected?.id === b.id ? '#4f8ef7' : '#ffffff'}
                stroke={selected?.id === b.id ? '#2f6fe0' : '#a9c4ef'}
                strokeWidth={1.3}
                onPress={() => setSelected(b)}
              />
            ))}

            {BUILDINGS.map((b) => (
              <SvgText
                key={`t-${b.id}`}
                x={centros[b.id].x}
                y={centros[b.id].y + fontSize * 0.35}
                fontSize={fontSize}
                fontWeight="700"
                fill="#12213c"
                textAnchor="middle"
                pointerEvents="none"
              >
                {b.label}
              </SvgText>
            ))}

            {GATES.map((g) => (
              <Circle key={g.id} cx={g.x} cy={g.y} r={7} fill="#2f6fe0" />
            ))}
          </Svg>
        </ScrollView>
      </View>

      <View style={styles.info}>
        {selected ? (
          <>
            <Text style={styles.infoTitle}>{selected.label}</Text>
            <Text style={styles.infoSub}>Campus UNM</Text>
            <Text style={styles.pill}>
              {selected.accesos} acceso{selected.accesos !== 1 ? 's' : ''}
            </Text>
            {interior ? (
              <Pressable style={styles.enterBtn} onPress={() => onEnterBuilding?.(interior)}>
                <Text style={styles.enterBtnText}>Ver mapa interior  →</Text>
              </Pressable>
            ) : (
              <Text style={styles.infoSub}>Todavía no digitalizamos el interior de este edificio.</Text>
            )}
          </>
        ) : (
          <Text style={styles.infoSub}>Tocá un edificio en el mapa para ver su información.</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#ffffff' },
  mapCard: {
    margin: 16,
    backgroundColor: '#e0edff',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#c7d9f5',
    overflow: 'hidden',
  },
  info: {
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 18,
    backgroundColor: '#e0edff',
    gap: 6,
  },
  infoTitle: { fontSize: 17, fontWeight: '700', color: '#12213c' },
  infoSub: { fontSize: 13, color: '#737a83' },
  pill: {
    alignSelf: 'flex-start',
    fontSize: 11,
    fontWeight: '600',
    color: '#153396',
    backgroundColor: 'rgba(21,51,150,0.1)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 20,
    overflow: 'hidden',
  },
  enterBtn: {
    marginTop: 8,
    backgroundColor: '#153396',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
  },
  enterBtnText: { color: '#ffffff', fontWeight: '700', fontSize: 14 },
});