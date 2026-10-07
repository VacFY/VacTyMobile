import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { F, useTema, type EstadoColor } from '../lib/theme';

// Medidor circular de 270 grados: pista tenue, banda verde con el rango sano y un indicador en la temperatura actual.
const INICIO = 135;
const BARRIDO = 270;

function punto(cx: number, cy: number, r: number, grados: number) {
  const rad = (grados * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}
function arco(cx: number, cy: number, r: number, a0: number, a1: number) {
  const p0 = punto(cx, cy, r, a0);
  const p1 = punto(cx, cy, r, a1);
  return `M ${p0.x} ${p0.y} A ${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${p1.x} ${p1.y}`;
}

function useSuave(objetivo: number) {
  const [valor, setValor] = useState(objetivo);
  const anim = useRef(new Animated.Value(objetivo)).current;
  useEffect(() => {
    const id = anim.addListener(({ value }) => setValor(value));
    Animated.timing(anim, { toValue: objetivo, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    return () => anim.removeListener(id);
  }, [objetivo, anim]);
  return valor;
}

type Props = { valor: number | null; min: number; max: number; estado: EstadoColor; size?: number };

export function Gauge({ valor, min, max, estado, size = 250 }: Props) {
  const t = useTema();
  const suave = useSuave(valor ?? min);
  const margen = Math.max(4, (max - min) * 0.5);
  const lo = min - margen;
  const hi = max + margen;
  const ang = (v: number) => INICIO + BARRIDO * Math.min(1, Math.max(0, (v - lo) / (hi - lo)));
  const grosor = 16;
  const r = size / 2 - grosor - 4;
  const c = size / 2;
  const marca = punto(c, c, r, ang(suave));
  const color = t[estado];

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Path d={arco(c, c, r, INICIO, INICIO + BARRIDO)} stroke="rgba(255,244,214,0.14)" strokeWidth={grosor} strokeLinecap="round" fill="none" />
        <Path d={arco(c, c, r, ang(min), ang(max))} stroke={t.ok} strokeOpacity={0.55} strokeWidth={grosor} fill="none" />
        {valor !== null && (
          <>
            <Circle cx={marca.x} cy={marca.y} r={grosor / 2 + 6} fill={color} fillOpacity={0.25} />
            <Circle cx={marca.x} cy={marca.y} r={grosor / 2 + 1} fill="#FFFFFF" stroke={color} strokeWidth={4} />
          </>
        )}
      </Svg>
      <View style={{ alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
          <Text style={{ fontFamily: F.xbold, fontSize: 60, letterSpacing: -2, color: t.sobreHero }}>{valor === null ? '--' : suave.toFixed(1)}</Text>
          <Text style={{ fontFamily: F.bold, fontSize: 22, marginTop: 10, marginLeft: 2, color: t.subHero }}>°C</Text>
        </View>
        <Text style={{ fontFamily: F.med, fontSize: 13, color: t.subHero }}>
          Rango sano {min} a {max} °C
        </Text>
      </View>
    </View>
  );
}
