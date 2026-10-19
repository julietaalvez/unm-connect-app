import * as Location from 'expo-location';
import { useCallback, useEffect, useRef, useState } from 'react';

export type EstadoUbicacion = 'pidiendo' | 'ok' | 'denegado' | 'apagado' | 'error';
export type Punto = { lat: number; lng: number; precision: number | null };

/** Sigue la posición del usuario mientras la pantalla está abierta. No guarda ni envía nada. */
export function useUbicacion(activa = true) {
  const [estado, setEstado] = useState<EstadoUbicacion>('pidiendo');
  const [punto, setPunto] = useState<Punto | null>(null);
  const sub = useRef<Location.LocationSubscription | null>(null);

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
        { accuracy: Location.Accuracy.Balanced, distanceInterval: 5, timeInterval: 3000 },
        (l) => {
          setPunto({ lat: l.coords.latitude, lng: l.coords.longitude, precision: l.coords.accuracy });
          setEstado('ok');
        }
      );
    } catch {
      setEstado('error');
    }
  }, []);

  useEffect(() => {
    if (!activa) return;
    iniciar();
    return () => {
      sub.current?.remove();
      sub.current = null;
    };
  }, [activa, iniciar]);

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