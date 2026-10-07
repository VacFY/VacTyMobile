import { useEffect, useRef, useState } from 'react';
import { Animated, Easing } from 'react-native';

export function conAlfa(hex: string, alfa: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alfa})`;
}

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function mezclar(a: string, b: string, t: number): string {
  const [r1, g1, b1] = rgb(a);
  const [r2, g2, b2] = rgb(b);
  const f = (x: number, y: number) => Math.round(x + (y - x) * t);
  return `rgb(${f(r1, r2)},${f(g1, g2)},${f(b1, b2)})`;
}

// Numero que se desliza suavemente hasta su nuevo valor.
export function useSuave(objetivo: number, ms = 700) {
  const [valor, setValor] = useState(objetivo);
  const anim = useRef(new Animated.Value(objetivo)).current;
  useEffect(() => {
    const id = anim.addListener(({ value }) => setValor(value));
    Animated.timing(anim, { toValue: objetivo, duration: ms, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    return () => anim.removeListener(id);
  }, [objetivo, anim, ms]);
  return valor;
}

// Color que se funde con el anterior cuando cambia (por ejemplo, de verde a rojo).
export function useColorSuave(destino: string, ms = 600) {
  const previo = useRef(destino);
  const [color, setColor] = useState(destino);
  useEffect(() => {
    const origen = previo.current;
    if (origen === destino) return;
    const anim = new Animated.Value(0);
    const id = anim.addListener(({ value }) => setColor(mezclar(origen, destino, value)));
    Animated.timing(anim, { toValue: 1, duration: ms, easing: Easing.inOut(Easing.quad), useNativeDriver: false }).start(() => {
      previo.current = destino;
      setColor(destino);
    });
    return () => anim.removeListener(id);
  }, [destino, ms]);
  return color;
}

// Fase 0..2π en bucle, ~30 cuadros por segundo: para olas y burbujas.
export function useFase(periodoMs = 3600) {
  const [fase, setFase] = useState(0);
  useEffect(() => {
    let raf = 0;
    let ultimo = 0;
    const t0 = Date.now();
    const paso = () => {
      const ahora = Date.now();
      if (ahora - ultimo > 32) {
        ultimo = ahora;
        setFase((((ahora - t0) % periodoMs) / periodoMs) * Math.PI * 2);
      }
      raf = requestAnimationFrame(paso);
    };
    raf = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(raf);
  }, [periodoMs]);
  return fase;
}
