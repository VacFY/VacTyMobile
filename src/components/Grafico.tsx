import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import Svg, { ClipPath, Defs, G, Line, LinearGradient, Path, Rect, Stop, Text as SvgText } from 'react-native-svg';
import type { Corte } from '../lib/historial';
import { F, useTema } from '../lib/theme';

export type PuntoGrafico = { ts: number; v: number };
type Props = {
  puntos: PuntoGrafico[]; // de mas vieja a mas nueva
  min: number;
  max: number;
  desde: number;
  hasta: number;
  cortes?: Corte[];
  alto?: number;
  formatoX?: (ts: number) => string;
};

// Serie temporal con eje de tiempo real: la linea se interrumpe donde el sensor no envio datos y ese tramo se raya.
export function Grafico({ puntos, min, max, desde, hasta, cortes = [], alto = 190, formatoX }: Props) {
  const t = useTema();
  const [ancho, setAncho] = useState(0);
  const color = t.esOscuro ? t.primario : t.texto;

  const g = useMemo(() => {
    const vals = puntos.map((p) => p.v);
    const lo = Math.min(min, ...vals) - 1;
    const hi = Math.max(max, ...vals) + 1;
    const total = Math.max(1, hasta - desde);
    const x = (ts: number) => Math.min(1, Math.max(0, (ts - desde) / total)) * ancho;
    const y = (v: number) => alto - ((v - lo) / (hi - lo)) * alto;
    // segmentos continuos: se parte la linea donde hay un corte entre dos puntos
    const segs: PuntoGrafico[][] = [];
    puntos.forEach((p, i) => {
      const prev = puntos[i - 1];
      const roto = prev && cortes.some((c) => c.hasta > prev.ts && c.desde < p.ts);
      if (!prev || roto) segs.push([p]);
      else segs[segs.length - 1].push(p);
    });
    const linea = segs.map((s) => s.map((p, i) => `${i ? 'L' : 'M'} ${x(p.ts).toFixed(1)} ${y(p.v).toFixed(1)}`).join(' ')).join(' ');
    const area = segs
      .filter((s) => s.length > 1)
      .map((s) => `${s.map((p, i) => `${i ? 'L' : 'M'} ${x(p.ts).toFixed(1)} ${y(p.v).toFixed(1)}`).join(' ')} L ${x(s[s.length - 1].ts).toFixed(1)} ${alto} L ${x(s[0].ts).toFixed(1)} ${alto} Z`)
      .join(' ');
    // tramos fuera de rango en rojo
    let rojo = '';
    segs.forEach((s) =>
      s.forEach((p, i) => {
        const q = s[i - 1];
        if (q && (p.v < min || p.v > max || q.v < min || q.v > max)) rojo += `M ${x(q.ts).toFixed(1)} ${y(q.v).toFixed(1)} L ${x(p.ts).toFixed(1)} ${y(p.v).toFixed(1)} `;
      }),
    );
    const huecos = cortes
      .map((c) => ({ x0: x(Math.max(c.desde, desde)), x1: x(Math.min(c.hasta, hasta)), enCurso: c.enCurso }))
      .filter((h) => h.x1 - h.x0 > 1.5);
    const ultimo = puntos[puntos.length - 1];
    return { linea, area, rojo, huecos, yMax: y(max), yMin: y(min), ultimo: ultimo ? { x: x(ultimo.ts), y: y(ultimo.v) } : null };
  }, [puntos, cortes, min, max, desde, hasta, ancho, alto]);

  const fx = formatoX ?? ((ts: number) => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

  return (
    <View>
      <View onLayout={(e) => setAncho(e.nativeEvent.layout.width)} style={{ height: alto }}>
        {ancho > 0 && (
          <Svg width={ancho} height={alto}>
            <Defs>
              <LinearGradient id="rel" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={color} stopOpacity={0.22} />
                <Stop offset="1" stopColor={color} stopOpacity={0} />
              </LinearGradient>
              {g.huecos.map((h, i) => (
                <ClipPath id={`h${i}`} key={i}>
                  <Rect x={h.x0} y={0} width={h.x1 - h.x0} height={alto} />
                </ClipPath>
              ))}
            </Defs>

            <Rect x={0} y={g.yMax} width={ancho} height={Math.max(0, g.yMin - g.yMax)} fill={t.ok} fillOpacity={0.1} />
            <Line x1={0} x2={ancho} y1={g.yMax} y2={g.yMax} stroke={t.ok} strokeOpacity={0.55} strokeDasharray="3 6" />
            <Line x1={0} x2={ancho} y1={g.yMin} y2={g.yMin} stroke={t.ok} strokeOpacity={0.55} strokeDasharray="3 6" />
            <SvgText x={ancho - 2} y={g.yMax - 5} fontSize={11} fontFamily={F.semi} fill={t.ok} textAnchor="end">{`${max}°`}</SvgText>
            <SvgText x={ancho - 2} y={g.yMin + 14} fontSize={11} fontFamily={F.semi} fill={t.ok} textAnchor="end">{`${min}°`}</SvgText>

            {g.huecos.map((h, i) => (
              <G key={i} clipPath={`url(#h${i})`}>
                <Rect x={h.x0} y={0} width={h.x1 - h.x0} height={alto} fill={t.sub} fillOpacity={0.09} />
                {Array.from({ length: Math.ceil((h.x1 - h.x0 + alto) / 9) }, (_, k) => (
                  <Line key={k} x1={h.x0 + k * 9 - alto} y1={alto} x2={h.x0 + k * 9} y2={0} stroke={t.sub} strokeOpacity={0.3} strokeWidth={1.5} />
                ))}
                <Line x1={h.x0} x2={h.x0} y1={0} y2={alto} stroke={t.sub} strokeOpacity={0.6} strokeDasharray="2 4" />
                <Line x1={h.x1} x2={h.x1} y1={0} y2={alto} stroke={t.sub} strokeOpacity={0.6} strokeDasharray="2 4" />
              </G>
            ))}
            {g.huecos.map((h, i) =>
              h.x1 - h.x0 > 64 ? (
                <SvgText key={`l${i}`} x={(h.x0 + h.x1) / 2} y={alto / 2} fontSize={11} fontFamily={F.bold} fill={t.sub} textAnchor="middle">
                  SIN DATOS
                </SvgText>
              ) : null,
            )}

            {g.area !== '' && <Path d={g.area} fill="url(#rel)" />}
            {g.linea !== '' && <Path d={g.linea} stroke={color} strokeWidth={2.4} strokeLinejoin="round" strokeLinecap="round" fill="none" />}
            {g.rojo !== '' && <Path d={g.rojo} stroke={t.alerta} strokeWidth={3} strokeLinecap="round" fill="none" />}
            {g.ultimo && <Rect x={g.ultimo.x - 4} y={g.ultimo.y - 4} width={8} height={8} rx={4} fill={color} />}
          </Svg>
        )}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
        <Text style={{ fontFamily: F.med, fontSize: 12, color: t.sub }}>{fx(desde)}</Text>
        <Text style={{ fontFamily: F.med, fontSize: 12, color: t.sub }}>{fx(hasta)}</Text>
      </View>
    </View>
  );
}
