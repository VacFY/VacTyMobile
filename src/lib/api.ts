// Cliente del backend VacTy (Spring Boot). Contrato: ver el README de VacfyBackend ("API para el front").
import { leerCredenciales } from './sesion';

export type Lectura = { temperatura: number; humedad: number; ts: number };

export type TipoAlerta = 'OUT_OF_RANGE' | 'RAPID_CHANGE' | 'SENSOR_OFFLINE' | 'INVALID_READING' | 'LOT_EXPIRING' | 'LOT_EXPIRED';

export type AlertaServidor = {
  id: number;
  contenedor: string;
  type: TipoAlerta;
  severity: 'WARNING' | 'CRITICAL';
  status: 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED';
  title?: string;
  message: string;
  affectedLots?: { lotId: number; vaccine: string; lotNumber: string; expiryDate: string }[];
  lotId?: number | null;
  triggerValue: number | null;
  startedAt: string;
  resolvedAt: string | null;
};

export type Rol = 'ENFERMERA' | 'SUPERVISOR';
export type PerfilServidor = { profileDni: string; profileName: string; profileLastName: string; profileCompany: string; role: Rol };

export type RangoTermo = {
  minTemp: number;
  maxTemp: number;
  basedOn: 'LOTS' | 'PROFILE';
  profileName: string | null;
  freezeSensitive: boolean;
  heatSensitive: boolean;
};

/** GET /my/containers (enfermera, con asignadoDesde) o GET /containers (supervisor, con asignadoA). */
export type Termo = {
  contenedor: string;
  nombre: string | null;
  asignadoDesde?: string | null;
  registrado?: boolean;
  asignadoA?: { userId: string; dni: string; nombre: string | null; desde: string } | null;
  status: 'OK' | 'ALERTA' | 'SIN_DATOS';
  temperatura: number | null;
  humedad: number | null;
  lastReadingAt: string | null;
  range: RangoTermo;
  activeLots: number;
  expiredLots: number;
  openAlerts: number;
};

export type ResultadoVinculo = { contenedor: string; nombre: string | null; asignadoDesde: string; nuevaAsignacion: boolean };

export type Vacuna = {
  id: number;
  name: string;
  minTemp: number;
  maxTemp: number;
  freezeSensitive: boolean;
  heatSensitive: boolean;
  careProfileLabel: string | null;
  careInstructions: string[];
  verified: boolean;
};

export type LoteServidor = {
  id: number;
  contenedor: string;
  vaccine: Vacuna;
  lotNumber: string;
  expiryDate: string; // AAAA-MM-DD
  vials: number;
  doses: number | null;
  status: 'ACTIVE' | 'USED' | 'DISCARDED' | 'EXPIRED';
};

export class ApiError extends Error {
  // `motivo` es el texto que envía el backend en termos, lotes, vacunas y en todos los 403 y 429.
  constructor(public status: number, public motivo: string | null = null) {
    super(motivo ?? `HTTP ${status}`);
  }
}

export const nombreTermo = (t: Pick<Termo, 'nombre' | 'contenedor'>) => t.nombre?.trim() || `Termo ${t.contenedor}`;

const limpiar = (u: string) => u.trim().replace(/\/$/, '');

async function pedir<T>(base: string, ruta: string, init: RequestInit = {}): Promise<T> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 15000);
  try {
    const r = await fetch(`${limpiar(base)}${ruta}`, {
      ...init,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
      signal: ctrl.signal,
    });
    const txt = await r.text();
    if (!r.ok) {
      let motivo: string | null = null;
      try {
        const m = JSON.parse(txt)?.message;
        if (typeof m === 'string' && m.trim()) motivo = m.trim();
      } catch {}
      throw new ApiError(r.status, r.status === 401 ? null : motivo);
    }
    return (txt ? JSON.parse(txt) : undefined) as T;
  } finally {
    clearTimeout(t);
  }
}

// La sesion viaja en una cookie que el cliente HTTP de Android guarda solo.
export const iniciarSesion = (base: string, userDni: string, userPassword: string) =>
  pedir<void>(base, '/api/v1/authentication/sign-in', { method: 'POST', body: JSON.stringify({ userDni, userPassword }) });

/**
 * Llamada con sesion: si el servidor responde 401 (sesion vencida o cerrada), vuelve a iniciar sesion con las
 * credenciales guardadas y reintenta una vez. Sirve tambien para el servicio en segundo plano, que no tiene React.
 */
export async function conSesion<T>(base: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (!(e instanceof ApiError && e.status === 401)) throw e;
    const c = await leerCredenciales();
    if (!c) throw e;
    await iniciarSesion(base, c.dni, c.password);
    return fn();
  }
}

export const cerrarSesionServidor = (base: string) =>
  pedir<void>(base, '/api/v1/authentication/sign-out', { method: 'POST' }).catch(() => {});

export const obtenerPerfil = (base: string) => pedir<PerfilServidor>(base, '/api/v1/profile');

// ---- Termos
export const misTermos = (base: string) => pedir<Termo[]>(base, '/api/v1/my/containers');
export const todosLosTermos = (base: string) => pedir<Termo[]>(base, '/api/v1/containers');

export const vincularTermo = (base: string, codigo: string, clave: string) =>
  pedir<ResultadoVinculo>(base, '/api/v1/containers/link', { method: 'POST', body: JSON.stringify({ codigo, clave }) });

export const entregarTermo = (base: string, codigo: string) =>
  pedir<void>(base, `/api/v1/containers/${encodeURIComponent(codigo)}/unlink`, { method: 'POST' });

/** Texto del QR del termo: "vacty:<codigo>:<clave>". */
export function separarQr(texto: string): { codigo: string; clave: string } | null {
  const m = /^\s*vacty:([A-Za-z0-9_-]{1,32}):([A-Za-z0-9 -]{4,})\s*$/i.exec(texto);
  return m ? { codigo: m[1], clave: m[2].trim() } : null;
}

// ---- Alertas
export const listarAlertas = (base: string) => pedir<AlertaServidor[]>(base, '/api/v1/alerts?status=ALL');

export const reconocerAlerta = (base: string, id: number) =>
  pedir<AlertaServidor>(base, `/api/v1/alerts/${id}/acknowledge`, { method: 'PATCH' });

/** Las de vencimiento de lotes se avisan sin sirena ni vibracion fuerte. */
export const esDeLote = (a: Pick<AlertaServidor, 'type'>) => a.type === 'LOT_EXPIRING' || a.type === 'LOT_EXPIRED';

// ---- Vacunas y lotes
export const listarVacunas = (base: string) => pedir<Vacuna[]>(base, '/api/v1/vaccines');

export const lotesDelTermo = (base: string, contenedor: string) =>
  pedir<LoteServidor[]>(base, `/api/v1/containers/${encodeURIComponent(contenedor)}/lots?includeExpired=true`);

export const registrarLote = (
  base: string,
  datos: { contenedor: string; vaccineId: number; lotNumber: string; expiryDate: string; vials: number },
) => pedir<LoteServidor>(base, '/api/v1/lots', { method: 'POST', body: JSON.stringify({ ...datos, source: 'MANUAL' }) });

export const cerrarLote = (base: string, id: number, status: 'USED' | 'DISCARDED', reason: string) =>
  pedir<LoteServidor>(base, `/api/v1/lots/${id}/close`, { method: 'PATCH', body: JSON.stringify({ status, reason }) });

// ---- WebSocket con sesion y reconexion automatica
const pedirTicket = (base: string) =>
  conSesion(base, () => pedir<{ ticket: string }>(base, '/api/v1/authentication/ws-ticket', { method: 'POST' }));

/**
 * Abre `ruta` (/ws/device o /ws/alerts) con un ticket de un solo uso, pedido antes de cada conexion.
 * Si la conexion se cae, o no se pudo pedir el ticket (sin red), reintenta cada 3 s.
 */
export function conectarWS(base: string, ruta: string, onMensaje: (d: string) => void, onAbierto: (abierto: boolean) => void) {
  let ws: WebSocket | null = null;
  let cerrado = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const reintentar = () => {
    if (!cerrado) timer = setTimeout(abrir, 3000);
  };
  const abrir = async () => {
    let ticket: string;
    try {
      ticket = (await pedirTicket(base)).ticket;
    } catch {
      reintentar();
      return;
    }
    if (cerrado) return;
    ws = new WebSocket(`${limpiar(base).replace(/^http/, 'ws')}${ruta}?ticket=${encodeURIComponent(ticket)}`);
    ws.onopen = () => onAbierto(true);
    ws.onmessage = (e) => onMensaje(String(e.data));
    ws.onerror = () => {};
    ws.onclose = () => {
      onAbierto(false);
      reintentar();
    };
  };
  abrir();
  return () => {
    cerrado = true;
    clearTimeout(timer);
    ws?.close();
  };
}

// El mensaje de /ws/device no trae fecha: la ponemos al recibirlo. Ignora lecturas nulas (sensor con falla)
// y las de otros termos.
export function leerTelemetria(texto: string, contenedor: string | null): Lectura | null {
  try {
    const j = JSON.parse(texto);
    if (!contenedor || j.contenedor !== contenedor || typeof j.temperatura !== 'number' || Number.isNaN(j.temperatura)) return null;
    return { temperatura: j.temperatura, humedad: typeof j.humedad === 'number' ? j.humedad : NaN, ts: Date.now() };
  } catch {
    return null;
  }
}

// ---- Historial de lecturas guardadas en el servidor (maximo 1000 por consulta, de la mas reciente a la mas antigua)
export type LecturaServidor = { id: number; contenedor: string; temperatura: number | null; humedad: number | null; receivedAt: string };

export const listarLecturas = (base: string, contenedor: string, desde: Date, hasta?: Date) =>
  pedir<LecturaServidor[]>(
    base,
    `/api/v1/readings?contenedor=${encodeURIComponent(contenedor)}&from=${encodeURIComponent(desde.toISOString())}` + (hasta ? `&to=${encodeURIComponent(hasta.toISOString())}` : ''),
  );
