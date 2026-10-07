import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';
import { conAlfa } from '../lib/anim';
import { useTema, type EstadoColor } from '../lib/theme';

const ESTADOS: EstadoColor[] = ['ok', 'precaucion', 'alerta'];

// Resplandor suave en la parte alta de la pantalla; cambia de color con el estado del termo.
export function Ambiente({ estado }: { estado: EstadoColor }) {
  const t = useTema();
  const op = useRef({ ok: new Animated.Value(estado === 'ok' ? 1 : 0), precaucion: new Animated.Value(estado === 'precaucion' ? 1 : 0), alerta: new Animated.Value(estado === 'alerta' ? 1 : 0) }).current;
  useEffect(() => {
    ESTADOS.forEach((e) => Animated.timing(op[e], { toValue: e === estado ? 1 : 0, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }).start());
  }, [estado, op]);
  const fuerza = t.esOscuro ? 0.42 : 0.3;
  return (
    <>
      {ESTADOS.map((e) => (
        <Animated.View key={e} pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 520, opacity: op[e] }}>
          <LinearGradient colors={[conAlfa(t[e], fuerza), conAlfa(t[e], fuerza * 0.35), conAlfa(t.bg, 0)]} locations={[0, 0.45, 1]} style={{ flex: 1 }} />
        </Animated.View>
      ))}
    </>
  );
}
