import Svg, { Circle, ClipPath, Defs, G, LinearGradient, Line, Path, Rect, Stop, Text as SvgText } from 'react-native-svg';
import { mezclar, useColorSuave, useFase, useSuave } from '../lib/anim';
import { F, useTema, type EstadoColor } from '../lib/theme';

// Frasco de vacuna: el nivel del liquido es la temperatura, con una banda que marca el rango sano.
const W = 200;
const H = 330;
const CRISTAL = 'M 65 44 L 65 72 C 65 94, 29 90, 29 128 L 29 288 Q 29 322 63 322 L 121 322 Q 155 322 155 288 L 155 128 C 155 90, 119 94, 119 72 L 119 44 Z';
const Y_ABAJO = 316;
const Y_ARRIBA = 110;

function ola(nivel: number, fase: number, amp: number) {
  let d = `M 0 ${H}`;
  for (let x = 0; x <= W; x += 4) {
    const y = nivel + amp * Math.sin(x * 0.06 + fase) + amp * 0.45 * Math.sin(x * 0.13 - fase * 1.4);
    d += ` L ${x} ${y.toFixed(1)}`;
  }
  return `${d} L ${W} ${H} Z`;
}

const BURBUJAS = Array.from({ length: 7 }, (_, i) => ({ x: 44 + ((i * 37) % 96), k: 1 + (i % 2), o: (i * 0.23) % 1, r: 2 + (i % 3) }));

export function Vial({ valor, min, max, estado, ancho = 190 }: { valor: number | null; min: number; max: number; estado: EstadoColor; ancho?: number }) {
  const t = useTema();
  const fase = useFase(4200);
  const color = useColorSuave(t[estado]);
  const margen = Math.max(4, (max - min) * 0.5);
  const lo = min - margen;
  const hi = max + margen;
  const frac = (v: number) => Math.min(1, Math.max(0, (v - lo) / (hi - lo)));
  const yDe = (v: number) => Y_ABAJO - frac(v) * (Y_ABAJO - Y_ARRIBA);
  const objetivo = valor === null ? lo : valor;
  const nivelT = useSuave(objetivo, 900);
  const nivel = yDe(nivelT);
  const yMax = yDe(max);
  const yMin = yDe(min);
  const amp = estado === 'alerta' ? 6 : estado === 'precaucion' ? 4.5 : 3.2;
  const oscuro = mezclar(color.startsWith('#') ? color : '#888888', '#000000', 0.0);
  const fondoCristal = t.esOscuro ? 'rgba(255,244,214,0.07)' : 'rgba(255,255,255,0.55)';
  const trazo = t.esOscuro ? 'rgba(255,244,214,0.85)' : t.texto;
  const gris = t.esOscuro ? '#FFF4D6' : '#390f07';
  void oscuro;

  return (
    <Svg width={ancho} height={(ancho * H) / W} viewBox={`0 0 ${W} ${H}`}>
      <Defs>
        <ClipPath id="cristal">
          <Path d={CRISTAL} />
        </ClipPath>
        <LinearGradient id="liquido" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={color} stopOpacity={0.95} />
          <Stop offset="1" stopColor={color} stopOpacity={0.62} />
        </LinearGradient>
      </Defs>

      <Path d={CRISTAL} fill={fondoCristal} />
      <G clipPath="url(#cristal)">
        {valor !== null && <Path d={ola(nivel, fase, amp)} fill="url(#liquido)" />}
        {valor !== null && <Path d={ola(nivel + 7, -fase * 1.2 + 1, amp * 0.8)} fill={color} fillOpacity={0.25} />}
        {valor !== null &&
          BURBUJAS.map((b, i) => {
            const alto = Math.max(10, Y_ABAJO - nivel - 8);
            const y = Y_ABAJO - ((((fase / (Math.PI * 2)) * b.k + b.o) % 1) * alto);
            return <Circle key={i} cx={b.x + 3 * Math.sin(fase * b.k + i)} cy={y} r={b.r} fill="#FFFFFF" fillOpacity={0.4} />;
          })}
        <Rect x={29} y={yMax} width={126} height={Math.max(0, yMin - yMax)} fill="#FFFFFF" fillOpacity={0.13} />
        <Line x1={29} x2={155} y1={yMax} y2={yMax} stroke="#FFFFFF" strokeOpacity={0.7} strokeDasharray="5 5" strokeWidth={1.5} />
        <Line x1={29} x2={155} y1={yMin} y2={yMin} stroke="#FFFFFF" strokeOpacity={0.7} strokeDasharray="5 5" strokeWidth={1.5} />
        <Path d="M 43 140 L 43 268" stroke="#FFFFFF" strokeOpacity={0.5} strokeWidth={6} strokeLinecap="round" />
      </G>
      <Path d={CRISTAL} fill="none" stroke={trazo} strokeWidth={3.5} strokeLinejoin="round" />

      <Rect x={50} y={42} width={84} height={11} rx={5.5} fill={mezclar('#ffde59', '#390f07', 0.35)} />
      <Rect x={55} y={5} width={74} height={42} rx={13} fill="#ffde59" />
      <Rect x={55} y={5} width={74} height={42} rx={13} fill="none" stroke={gris} strokeOpacity={0.9} strokeWidth={2.5} />
      <Path d="M 70 14 L 70 38 M 84 14 L 84 38 M 98 14 L 98 38 M 112 14 L 112 38" stroke="#390f07" strokeOpacity={0.22} strokeWidth={3} strokeLinecap="round" />

      {[{ y: yMax, v: max }, { y: yMin, v: min }].map((m) => (
        <G key={m.v}>
          <Line x1={160} x2={172} y1={m.y} y2={m.y} stroke={t.sub} strokeWidth={2} strokeLinecap="round" />
          <SvgText x={176} y={m.y + 4.5} fontSize={13} fontFamily={F.semi} fill={t.sub}>{`${m.v}°`}</SvgText>
        </G>
      ))}
      {valor !== null && <Path d={`M 4 ${nivel - 8} L 20 ${nivel} L 4 ${nivel + 8} Z`} fill={color} />}
    </Svg>
  );
}
