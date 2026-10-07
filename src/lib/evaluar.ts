import type { PerfilVacuna } from './vacunas';

export type Estado = 'ok' | 'precaucion' | 'alerta';
export type Causa = 'frio' | 'calor' | null;

export function evaluar(temp: number, p: PerfilVacuna): { estado: Estado; causa: Causa } {
  if (temp < p.min) return { estado: 'alerta', causa: 'frio' };
  if (temp > p.max) return { estado: 'alerta', causa: 'calor' };
  if (temp < p.min + p.margenFrio) return { estado: 'precaucion', causa: 'frio' };
  if (temp > p.max - p.margenCalor) return { estado: 'precaucion', causa: 'calor' };
  return { estado: 'ok', causa: null };
}

export type EstadoLote = 'vencido' | 'porVencer' | 'vigente';
const DIA = 86400000;

export function diasParaVencer(vencimiento: string, hoy = new Date()): number {
  const [y, m, d] = vencimiento.split('-').map(Number);
  const fin = new Date(y, m - 1, d).getTime();
  const ini = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).getTime();
  return Math.round((fin - ini) / DIA);
}

// Un lote vence al terminar el dia de su fecha de vencimiento.
export function estadoLote(vencimiento: string): EstadoLote {
  const d = diasParaVencer(vencimiento);
  if (d < 0) return 'vencido';
  if (d <= 30) return 'porVencer';
  return 'vigente';
}

// Un lote que el backend ya marcó como EXPIRED cuenta como vencido aunque la fecha local diga otra cosa.
export const estadoDe = (l: { status: string; expiryDate: string }): EstadoLote => (l.status === 'EXPIRED' ? 'vencido' : estadoLote(l.expiryDate));

export const fechaValida = (s: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  const f = new Date(y, m - 1, d);
  return f.getFullYear() === y && f.getMonth() === m - 1 && f.getDate() === d;
};

// HU11: alerta temprana por tendencia. Avisa cuando la temperatura sigue en rango pero se acerca
// a un limite con rapidez suficiente para salirse en pocos minutos.
export type Tendencia = { causa: 'frio' | 'calor'; pendiente: number; minutosAlLimite: number };

const VENTANA_MS = 90_000;
const PENDIENTE_MIN = 0.5; // grados por minuto
const HORIZONTE_MIN = 10; // minutos hasta el limite

export function tendencia(historial: { temperatura: number; ts: number }[], p: PerfilVacuna): Tendencia | null {
  if (historial.length < 6) return null;
  const ultimo = historial[historial.length - 1];
  const ventana = historial.filter((h) => ultimo.ts - h.ts <= VENTANA_MS);
  if (ventana.length < 6) return null;
  const primero = ventana[0];
  const minutos = (ultimo.ts - primero.ts) / 60_000;
  if (minutos <= 0) return null;
  const pendiente = (ultimo.temperatura - primero.temperatura) / minutos;
  const t = ultimo.temperatura;

  if (pendiente <= -PENDIENTE_MIN && t >= p.min) {
    const m = (t - p.min) / -pendiente;
    if (m <= HORIZONTE_MIN) return { causa: 'frio', pendiente, minutosAlLimite: m };
  }
  if (pendiente >= PENDIENTE_MIN && t <= p.max) {
    const m = (p.max - t) / pendiente;
    if (m <= HORIZONTE_MIN) return { causa: 'calor', pendiente, minutosAlLimite: m };
  }
  return null;
}
