import { useState } from 'react';
import { View } from 'react-native';
import Svg, { Defs, Line, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { useTema } from '../lib/theme';

type Props = { valores: number[]; min: number; max: number; alto?: number };

// Temperatura con la banda sana (min-max) sombreada y un degradado bajo la linea.
export function Grafico({ valores, min, max, alto = 170 }: Props) {
  const t = useTema();
  const [ancho, setAncho] = useState(0);
  const lo = Math.min(min, ...valores) - 1;
  const hi = Math.max(max, ...valores) + 1;
  const y = (v: number) => alto - ((v - lo) / (hi - lo)) * alto;
  const x = (i: number) => (valores.length <= 1 ? 0 : (i / (valores.length - 1)) * ancho);
  const linea = valores.map((v, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(v)}`).join(' ');
  const area = valores.length > 1 ? `${linea} L ${x(valores.length - 1)} ${alto} L 0 ${alto} Z` : '';
  const color = t.esOscuro ? t.primario : '#8A4B1F';

  return (
    <View onLayout={(e) => setAncho(e.nativeEvent.layout.width)} style={{ height: alto }}>
      {ancho > 0 && (
        <Svg width={ancho} height={alto}>
          <Defs>
            <LinearGradient id="rel" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={color} stopOpacity={0.28} />
              <Stop offset="1" stopColor={color} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Rect x={0} y={y(max)} width={ancho} height={Math.max(0, y(min) - y(max))} fill={t.ok} fillOpacity={0.12} />
          <Line x1={0} x2={ancho} y1={y(max)} y2={y(max)} stroke={t.ok} strokeOpacity={0.6} strokeDasharray="4 5" />
          <Line x1={0} x2={ancho} y1={y(min)} y2={y(min)} stroke={t.ok} strokeOpacity={0.6} strokeDasharray="4 5" />
          {valores.length > 1 && <Path d={area} fill="url(#rel)" />}
          {valores.length > 1 && <Path d={linea} stroke={color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" fill="none" />}
        </Svg>
      )}
    </View>
  );
}
