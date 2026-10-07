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
export function unirPaginas(paginas: LecturaServidor[][]): { puntos: Punto[]; invalidas: number } {
  const vistos = new Set<number>();
  const salida: Punto[] = [];
  let invalidas = 0;
  for (const pagina of paginas) {
    for (const l of pagina) {
      if (vistos.has(l.id)) continue;
      vistos.add(l.id);
      if (typeof l.temperatura !== 'number' || Number.isNaN(l.temperatura)) {
        invalidas++;
        continue;
      }
      salida.push({ ts: new Date(l.receivedAt).getTime(), temperatura: l.temperatura, humedad: typeof l.humedad === 'number' ? l.humedad : null });
    }
  }
  return { puntos: salida.sort((a, b) => b.ts - a.ts), invalidas };
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

// ---- Cortes del sensor: tramos en los que no llego ninguna lectura valida
export const UMBRAL_CORTE_MS = 150_000; // el servidor guarda 1 lectura cada 30 s; mas de 2,5 min sin nada es un corte

export type Corte = {
  desde: number;
  hasta: number;
  /** El corte llega hasta ahora: el sensor sigue sin enviar. */
  enCurso: boolean;
  /** Es el tramo anterior a la primera lectura del periodo (puede que el sensor aun no existiera o estuviera apagado). */
  inicio: boolean;
};

export function detectarCortes(asc: Punto[], desde: number, hasta: number, umbral = UMBRAL_CORTE_MS): Corte[] {
  if (!asc.length) return [{ desde, hasta, enCurso: true, inicio: false }];
  const cortes: Corte[] = [];
  if (asc[0].ts - desde > umbral) cortes.push({ desde, hasta: asc[0].ts, enCurso: false, inicio: true });
  for (let i = 1; i < asc.length; i++) {
    if (asc[i].ts - asc[i - 1].ts > umbral) cortes.push({ desde: asc[i - 1].ts, hasta: asc[i].ts, enCurso: false, inicio: false });
  }
  const ultimo = asc[asc.length - 1].ts;
  if (hasta - ultimo > umbral) cortes.push({ desde: ultimo, hasta, enCurso: true, inicio: false });
  return cortes;
}

export function duracionTexto(ms: number, corto = false): string {
  const min = Math.round(ms / 60000);
  if (min < 1) return corto ? '<1 min' : 'menos de 1 min';
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h < 24) return m ? (corto ? `${h}h ${m}m` : `${h} h ${m} min`) : `${h} h`;
  const d = Math.floor(h / 24);
  return h % 24 ? (corto ? `${d}d ${h % 24}h` : `${d} d ${h % 24} h`) : `${d} d`;
}
