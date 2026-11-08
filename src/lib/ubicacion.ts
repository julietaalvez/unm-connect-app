import * as Location from 'expo-location';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

export type EstadoUbicacion = 'pidiendo' | 'ok' | 'denegado' | 'apagado' | 'error';
export type Punto = { lat: number; lng: number; precision: number | null };

/** Sigue la posición del usuario mientras la pantalla está abierta. No guarda ni envía nada. */
export function useUbicacion(activa = true) {
  const [estado, setEstado] = useState<EstadoUbicacion>('pidiendo');
  const [punto, setPunto] = useState<Punto | null>(null);
  const sub = useRef<Location.LocationSubscription | null>(null);
  const ultimo = useRef<Punto | null>(null);
    // solo sigue el GPS mientras esta pantalla se está viendo
  const [enPantalla, setEnPantalla] = useState(true);
  useFocusEffect(
    useCallback(() => {
      setEnPantalla(true);
      return () => setEnPantalla(false);
    }, [])
  );

  const iniciar = useCallback(async () => {
    try {
      setEstado('pidiendo');
      const permiso = await Location.requestForegroundPermissionsAsync();
      if (permiso.status !== 'granted') {
        setEstado('denegado');
        return;
      }
      if (!(await Location.hasServicesEnabledAsync())) {
        setEstado('apagado');
        return;
      }
      sub.current?.remove();
           sub.current = await Location.watchPositionAsync(
                { accuracy: Location.Accuracy.High, distanceInterval: 3, timeInterval: 2500 },
        (l) => {
          const nuevo = { lat: l.coords.latitude, lng: l.coords.longitude, precision: l.coords.accuracy };
          // descarta lecturas muy imprecisas (salvo la primera) y suaviza los saltitos
          if (nuevo.precision != null && nuevo.precision > 60 && ultimo.current) return;
          const ant = ultimo.current;
          let fin = nuevo;
          if (ant && distanciaM(ant, nuevo) < 25) {
            const peso = nuevo.precision != null && ant.precision != null ? ant.precision / (ant.precision + nuevo.precision) : 0.5;
            fin = { lat: ant.lat + (nuevo.lat - ant.lat) * peso, lng: ant.lng + (nuevo.lng - ant.lng) * peso, precision: nuevo.precision };
          }
                    if (ant && distanciaM(ant, fin) < 1.5) return; // no se movió: no redibuja
          ultimo.current = fin;
          setPunto(fin);
          setEstado('ok');
        }
      );
    } catch {
      setEstado('error');
    }
  }, []);

  useEffect(() => {
    if (!activa || !enPantalla) return;
    iniciar();
    return () => {
      sub.current?.remove();
      sub.current = null;
    };
  }, [activa, enPantalla, iniciar]);

  return { estado, punto, reintentar: iniciar };
}

/** Distancia en metros entre dos puntos (fórmula de Haversine) */
export function distanciaM(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371000;
  const rad = (g: number) => (g * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}