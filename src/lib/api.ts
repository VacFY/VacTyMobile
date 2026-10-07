// Cliente del backend VacTy (Spring Boot). Contrato: ver VacTy_backend_iot_sin_redis/VacfyBackend/README.md
export const CONTENEDOR = '001';

export type Lectura = { temperatura: number; humedad: number; ts: number };

export type AlertaServidor = {
  id: number;
  contenedor: string;
  type: 'OUT_OF_RANGE' | 'RAPID_CHANGE' | 'SENSOR_OFFLINE' | 'INVALID_READING';
  severity: 'WARNING' | 'CRITICAL';
  status: 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED';
  message: string;
  triggerValue: number | null;
  startedAt: string;
  resolvedAt: string | null;
};

export type PerfilServidor = { id: number; name: string; minTemp: number; maxTemp: number; freezeSensitive: boolean };

export class ApiError extends Error {
  constructor(public status: number) {
    super(`HTTP ${status}`);
  }
}

const limpiar = (u: string) => u.trim().replace(/\/$/, '');

async function pedir<T>(base: string, ruta: string, init: RequestInit = {}): Promise<T> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 8000);
  try {
    const r = await fetch(`${limpiar(base)}${ruta}`, {
      ...init,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
      signal: ctrl.signal,
    });
    if (!r.ok) throw new ApiError(r.status);
    const txt = await r.text();
    return (txt ? JSON.parse(txt) : undefined) as T;
  } finally {
    clearTimeout(t);
  }
}

// La sesion viaja en una cookie que el cliente HTTP de Android guarda solo.
export const iniciarSesion = (base: string, userDni: string, userPassword: string) =>
  pedir<void>(base, '/api/v1/authentication/sign-in', { method: 'POST', body: JSON.stringify({ userDni, userPassword }) });

export const cerrarSesionServidor = (base: string) =>
  pedir<void>(base, '/api/v1/authentication/sign-out', { method: 'POST' }).catch(() => {});

export const listarAlertas = (base: string) => pedir<AlertaServidor[]>(base, '/api/v1/alerts?status=ALL');

export const reconocerAlerta = (base: string, id: number) =>
  pedir<AlertaServidor>(base, `/api/v1/alerts/${id}/acknowledge`, { method: 'PATCH' });

export const listarPerfiles = (base: string) => pedir<PerfilServidor[]>(base, '/api/v1/vaccine-profiles');

export const crearPerfil = (base: string, p: Omit<PerfilServidor, 'id'>) =>
  pedir<PerfilServidor>(base, '/api/v1/vaccine-profiles', { method: 'POST', body: JSON.stringify(p) });

export const asignarPerfil = (base: string, contenedor: string, profileId: number) =>
  pedir<unknown>(base, `/api/v1/containers/${contenedor}/profile`, { method: 'PUT', body: JSON.stringify({ profileId }) });

// ---- WebSocket con reconexion automatica
export const urlWs = (base: string, ruta: string) => limpiar(base).replace(/^http/, 'ws') + ruta;

export function conectarWS(url: string, onMensaje: (d: string) => void, onAbierto: (abierto: boolean) => void) {
  let ws: WebSocket | null = null;
  let cerrado = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const abrir = () => {
    ws = new WebSocket(url);
    ws.onopen = () => onAbierto(true);
    ws.onmessage = (e) => onMensaje(String(e.data));
    ws.onerror = () => {};
    ws.onclose = () => {
      onAbierto(false);
      if (!cerrado) timer = setTimeout(abrir, 3000);
    };
  };
  abrir();
  return () => {
    cerrado = true;
    clearTimeout(timer);
    ws?.close();
  };
}

// El mensaje de /ws/device no trae fecha: la ponemos al recibirlo. Ignora lecturas nulas (sensor con falla).
export function leerTelemetria(texto: string): Lectura | null {
  try {
    const j = JSON.parse(texto);
    if (j.contenedor !== CONTENEDOR || typeof j.temperatura !== 'number' || Number.isNaN(j.temperatura)) return null;
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
