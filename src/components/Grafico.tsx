import { useState } from 'react';
import { View } from 'react-native';
import Svg, { Line, Polyline, Rect } from 'react-native-svg';
import { C } from '../lib/theme';

type Props = { valores: number[]; min: number; max: number; alto?: number };

// Linea de temperatura con la banda sana (min-max) sombreada.
export function Grafico({ valores, min, max, alto = 180 }: Props) {
  const [ancho, setAncho] = useState(0);
  const lo = Math.min(min, ...valores) - 1;
  const hi = Math.max(max, ...valores) + 1;
  const y = (v: number) => alto - ((v - lo) / (hi - lo)) * alto;
  const x = (i: number) => (valores.length <= 1 ? 0 : (i / (valores.length - 1)) * ancho);
  const puntos = valores.map((v, i) => `${x(i)},${y(v)}`).join(' ');

  return (
    <View onLayout={(e) => setAncho(e.nativeEvent.layout.width)} style={{ height: alto }}>
      {ancho > 0 && (
        <Svg width={ancho} height={alto}>
          <Rect x={0} y={y(max)} width={ancho} height={y(min) - y(max)} fill="#1E9E5A22" />
          <Line x1={0} x2={ancho} y1={y(max)} y2={y(max)} stroke={C.ok} strokeDasharray="4 4" />
          <Line x1={0} x2={ancho} y1={y(min)} y2={y(min)} stroke={C.ok} strokeDasharray="4 4" />
          {valores.length > 1 && <Polyline points={puntos} fill="none" stroke={C.primario} strokeWidth={2.5} />}
        </Svg>
      )}
    </View>
  );
}
