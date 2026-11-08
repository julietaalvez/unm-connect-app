import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { G, Path, Text as SvgText } from 'react-native-svg';
import { EDIFICIOS } from '../data/edificios';
import { TRANSFORMS } from '../data/unificado';
import { labelFor } from '../lib/interior';

/** Con este zoom (o más) se ven los planos interiores dibujados sobre el campus */
export const ZOOM_INTERIORES = 2.2;
/** Con este zoom (o más) aparecen además los nombres de las aulas */
export const ZOOM_NOMBRES = 3.4;

const NOMBRE_EDIFICIO: Record<string, string> = {
  'edificio-historico': 'Edificio Histórico',
  'edificio-daract1': 'Daract I',
  'edificio-daract2': 'Daract II',
  'edificio-dorrego1': 'Dorrego I',
};

/** nivel 0 = planta baja, 1 = primer piso, 2 = segundo piso (solo el Histórico lo tiene) */
export const NIVELES = ['Planta baja', 'Piso 1', 'Piso 2'];

function pisoDe(edificioId: string, nivel: number): string | null {
  const pisos = Object.keys(EDIFICIOS[edificioId].floors);
  return pisos[nivel] ?? null;
}

const OCULTAR = /^(espaciolibre|nulo|nopasar|verde|camino|contorno)/;
const ESPECIAL = /^(bano|escalera|ascensor)/;

export type LugarInterior = {
  clave: string;
  label: string;
  edificio: string;
  sub: string;
  destino: { floor: string; id: string };
};

type Props = {
  C: any; // los colores del mapa
  scale: number; // píxeles de pantalla por unidad del campus
  zoom: number;
  nivel: number;
  verde: string; // color del césped
  onElegir: (l: LugarInterior) => void;
   onEdificio: (edificioId: string, e?: any) => void;
};

function InterioresCampusBase({ C, scale, zoom, nivel, verde, onElegir, onEdificio }: Props) {
  const edificios = useMemo(
    () =>
      Object.keys(TRANSFORMS).map((id) => {
        const ed = EDIFICIOS[id];
        const m = TRANSFORMS[id];
        const k = Math.hypot(m[0], m[1]); // cuánto achica el plano
        const pb = ed.floors['Planta Baja'].shapes;
        const util = pb.filter((f) => !OCULTAR.test(f.id));
        // el Histórico trae en su plano el césped, los caminos y el contorno: se usan tal cual para que todo coincida
        const base =
          id === 'edificio-historico'
            ? [
                ...pb.filter((f) => /^espaciolibre-verde/.test(f.id)).map((f) => ({ d: f.d, fill: verde })),
                ...pb.filter((f) => /^espaciolibre-camino/.test(f.id)).map((f) => ({ d: f.d, fill: C.paths })),
                ...pb.filter((f) => /^espaciolibre-(contorno|pasillo)/.test(f.id)).map((f) => ({ d: f.d, fill: C.bldgFill })),
              ]
            : (() => {
                // Daract / Dorrego: el rectángulo que abarca todo el plano es el edificio
                const x0 = Math.min(...util.map((f) => f.x)), y0 = Math.min(...util.map((f) => f.y));
                const x1 = Math.max(...util.map((f) => f.x + f.w)), y1 = Math.max(...util.map((f) => f.y + f.h));
                return [{ d: `M${x0} ${y0} L${x1} ${y0} L${x1} ${y1} L${x0} ${y1} Z`, fill: C.bldgFill }];
              })();
        const piso = pisoDe(id, nivel);
        const formas = piso
          ? ed.floors[piso].shapes
              .filter((f) => !OCULTAR.test(f.id))
              .map((f) => ({ ...f, esAula: !!ed.entrances[f.id], especial: ESPECIAL.test(f.id), texto: (labelFor(f.id) || f.id).slice(0, 16) }))
          : [];
        return { id, ed, m, k, piso, formas, base };
      }),
    [nivel, verde, C],
  );

  if (zoom < ZOOM_INTERIORES) return null;
  const conNombres = zoom >= ZOOM_NOMBRES;

  return (
    <>
      {edificios.map(({ id, m, k, piso, formas, base }) => (
          <G key={id} transform={`matrix(${m.join(' ')})`}>
            {base.map((b, i) => (
              <Path key={'b' + i} d={b.d} fill={b.fill} fillRule="evenodd" onPress={(e) => onEdificio(id, e)}/>
            ))}
            {!piso ? null : formas.map((f) => (
              <Path
                key={f.id}
                d={f.d}
                fill={f.especial ? C.paths : C.bldgFill}
                fillRule="evenodd"
                stroke={C.bldgStroke}
                strokeWidth={1 / scale / k}
                onPress={
                  f.esAula
                    ? () => onElegir({ clave: id, label: f.texto, edificio: NOMBRE_EDIFICIO[id], sub: piso, destino: { floor: piso, id: f.id } })
                    : (e) => onEdificio(id, e)
                }
              />
            ))}
            {conNombres && !!piso &&
              formas.map((f) =>
                f.esAula && !f.especial && f.cx != null && f.cy != null ? (
                  <SvgText
                    key={'t' + f.id}
                    x={f.cx}
                    y={f.cy}
                    fontSize={7 / scale / k}
                    fill={C.label}
                    textAnchor="middle"
                    pointerEvents="none"
                  >
                    {f.texto}
                  </SvgText>
                ) : null,
              )}
          </G>
      ))}
    </>
  );
}
export const InterioresCampus = React.memo(InterioresCampusBase);
/** Botones para cambiar de piso: se ven cuando los planos están visibles */
export function SelectorPiso({ C, nivel, onCambiar, visible }: { C: any; nivel: number; onCambiar: (n: number) => void; visible: boolean }) {
  if (!visible) return null;
  return (
    <View style={st.caja} pointerEvents="box-none">
      {NIVELES.map((n, i) => (
        <Pressable
          key={n}
          onPress={() => onCambiar(i)}
          style={[st.btn, { backgroundColor: i === nivel ? C.mapAccent : C.elevated ?? C.bldgFill, borderColor: C.bldgStroke }]}
        >
          <Text style={{ fontSize: 11.5, fontWeight: '600', color: i === nivel ? '#fff' : C.text }}>{n}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const st = StyleSheet.create({
  caja: { position: 'absolute', left: 12, top: 170, gap: 6 },
  btn: { paddingVertical: 7, paddingHorizontal: 11, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth },
});
