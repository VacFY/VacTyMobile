import type { LecturaServidor } from './api';

export type Punto = { ts: number; temperatura: number; humedad: number | null };
export type RangoClave = '1h' | '6h' | '24h' | '7d';

export const RANGOS: { clave: RangoClave; titulo: string; horas: number }[] = [
  { clave: '1h', titulo: '1 hora', horas: 1 },
  { clave: '6h', titulo: '6 horas', horas: 6 },
  { clave: '24h', titulo: '24 horas', horas: 24 },
  { clave: '7d', titulo: '7 días', horas: 168 },
];

export const POR_PAGINA = 1000;
export const MAX_PAGINAS = 10;

// Une paginas descartando repetidos (el limite superior de cada pagina es inclusivo) y deja la lista de mas nueva a mas vieja.
export function unirPaginas(paginas: LecturaServidor[][]): Punto[] {
  const vistos = new Set<number>();
  const salida: Punto[] = [];
  for (const pagina of paginas) {
    for (const l of pagina) {
      if (vistos.has(l.id) || typeof l.temperatura !== 'number' || Number.isNaN(l.temperatura)) continue;
      vistos.add(l.id);
      salida.push({ ts: new Date(l.receivedAt).getTime(), temperatura: l.temperatura, humedad: typeof l.humedad === 'number' ? l.humedad : null });
    }
  }
  return salida.sort((a, b) => b.ts - a.ts);
}

// Reduce la serie a ~n puntos para graficar sin perder los picos: en cada tramo se queda con la lectura
// mas alejada del centro del rango sano, que es la que importa para ver excursiones.
export function reducir(puntos: Punto[], n: number, centro: number): Punto[] {
  if (puntos.length <= n) return puntos;
  const tam = puntos.length / n;
  const salida: Punto[] = [];
  for (let i = 0; i < n; i++) {
    const tramo = puntos.slice(Math.floor(i * tam), Math.floor((i + 1) * tam));
    if (!tramo.length) continue;
    salida.push(tramo.reduce((m, p) => (Math.abs(p.temperatura - centro) > Math.abs(m.temperatura - centro) ? p : m)));
  }
  return salida;
}

export function estadisticas(puntos: Punto[], min: number, max: number) {
  if (!puntos.length) return null;
  const temps = puntos.map((p) => p.temperatura);
  const fuera = temps.filter((t) => t < min || t > max).length;
  return {
    minima: Math.min(...temps),
    maxima: Math.max(...temps),
    promedio: temps.reduce((a, b) => a + b, 0) / temps.length,
    fueraPct: (fuera / temps.length) * 100,
    total: temps.length,
  };
}
