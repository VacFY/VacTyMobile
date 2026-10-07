// Monitoreo en segundo plano (solo Android, requiere el APK / development build; no corre en Expo Go).
// Un servicio en primer plano mantiene viva la app y abre sus PROPIOS WebSocket, independientes de la pantalla,
// para avisar de las alertas del servidor con una notificacion aunque la app este cerrada.
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { AppState, Platform } from 'react-native';
import { conectarWS, esDeLote, leerTelemetria, type AlertaServidor } from './api';

type Lib = typeof import('react-native-notify-kit');

const soportado = Platform.OS === 'android' && Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;

let lib: Lib | null = null;
if (soportado) {
  try {
    lib = require('react-native-notify-kit') as Lib;
  } catch {
    lib = null;
  }
}

const CANAL_MONITOR = 'monitor';
const CANAL_ALERTAS = 'alertas';
const ID_MONITOR = 'monitor';
const ID_SIN_CONEXION = 'sin-conexion';
const SIN_CONEXION_MS = 120_000;
const REFRESCO_MS = 15_000;

export type EstadoMonitor = 'inactivo' | 'activo' | 'sin-permiso' | 'no-soportado';
export const monitorSoportado = lib !== null;

let urlActual = '';
let detener: (() => void) | null = null;
let urlEnEjecucion: string | null = null;
// Termo que se muestra en la notificacion fija (el que la enfermera tiene en pantalla).
let contenedorActual: string | null = null;

export function fijarTermoMonitor(contenedor: string | null) {
  contenedorActual = contenedor;
}

const TIPO: Record<AlertaServidor['type'], string> = {
  OUT_OF_RANGE: 'Temperatura fuera de rango',
  RAPID_CHANGE: 'Cambio brusco de temperatura',
  SENSOR_OFFLINE: 'Sensor sin datos',
  INVALID_READING: 'Lectura inválida del sensor',
  LOT_EXPIRING: 'Lote por vencer',
  LOT_EXPIRED: 'Lote vencido',
};

async function crearCanales(l: Lib) {
  await l.default.createChannel({ id: CANAL_MONITOR, name: 'Monitoreo activo', importance: l.AndroidImportance.LOW });
  await l.default.createChannel({
    id: CANAL_ALERTAS,
    name: 'Alertas de temperatura',
    importance: l.AndroidImportance.HIGH,
    vibration: true,
    vibrationPattern: [300, 700, 300, 700, 300, 700],
    sound: 'default',
    visibility: l.AndroidVisibility.PUBLIC,
  });
}

// Con el celular en el bolsillo un solo pitido se pierde: si las vacunas estan en riesgo, el sonido y la
// vibracion se repiten hasta que la enfermera toque o deslice la notificacion, o abra el panel.
const insistente = (a: AlertaServidor) => a.severity === 'CRITICAL' || a.type === 'OUT_OF_RANGE';

function mostrarAlerta(a: AlertaServidor) {
  if (!lib) return;
  lib.default.displayNotification({
    id: `alerta-${a.id}`,
    title: `${a.severity === 'CRITICAL' ? 'CRÍTICA: ' : 'Alerta: '}${a.title || TIPO[a.type] || 'Alerta'}`,
    body: a.message,
    android: {
      smallIcon: 'ic_notification',
      color: '#390f07',
      channelId: CANAL_ALERTAS,
      category: lib.AndroidCategory.ALARM,
      // Android 7 no tiene canales: sin esto no aparece como ventana emergente.
      importance: lib.AndroidImportance.HIGH,
      loopSound: insistente(a),
      style: { type: lib.AndroidStyle.BIGTEXT, text: a.message },
      timestamp: Date.parse(a.startedAt) || Date.now(),
      showTimestamp: true,
      pressAction: { id: 'default', launchActivity: 'default' },
    },
  }).catch(() => {});
}

// Tarea que vive mientras dure el servicio. No depende de React: si la pantalla se destruye, sigue.
async function tarea() {
  if (!lib) return;
  const n = lib.default;
  const url = urlActual;
  const notificadas = new Set<number>();
  let alertasAbierto = false;
  let deviceAbierto = false;
  let ultimaConexion = Date.now();
  let temperatura: number | null = null;
  let textoMostrado = '';

  const refrescar = () => {
    if (alertasAbierto || deviceAbierto) ultimaConexion = Date.now();
    const termo = contenedorActual ? `Termo ${contenedorActual}: ` : '';
    const texto = temperatura === null ? `${termo}esperando lecturas del sensor…` : `${termo}${temperatura.toFixed(1)} °C`;
    if (texto !== textoMostrado) {
      textoMostrado = texto;
      n.displayNotification({
        id: ID_MONITOR,
        title: 'VacTy está vigilando tus vacunas',
        body: texto,
        android: { smallIcon: 'ic_notification', color: '#390f07', channelId: CANAL_MONITOR, asForegroundService: true, ongoing: true, onlyAlertOnce: true, pressAction: { id: 'default', launchActivity: 'default' } },
      }).catch(() => {});
    }
    // Si el celular pierde conexion no puede avisar de nada: hay que decirlo.
    if (Date.now() - ultimaConexion > SIN_CONEXION_MS) {
      n.displayNotification({
        id: ID_SIN_CONEXION,
        title: 'VacTy sin conexión',
        body: 'No se están recibiendo alertas. Revisa la señal o el internet del celular.',
        android: { smallIcon: 'ic_notification', color: '#390f07', channelId: CANAL_ALERTAS, category: lib!.AndroidCategory.ERROR, pressAction: { id: 'default', launchActivity: 'default' } },
      }).catch(() => {});
    } else {
      n.cancelNotification(ID_SIN_CONEXION).catch(() => {});
    }
  };

  // El backend solo envia las alertas de los termos de esta cuenta.
  const cierraAlertas = conectarWS(
    url,
    '/ws/alerts',
    (txt) => {
      let a: AlertaServidor;
      try {
        a = JSON.parse(txt);
      } catch {
        return;
      }
      // Los avisos (p. ej. ASIGNACION_CAMBIADA) no son alertas; las de vencimiento no suenan con la app cerrada.
      if (typeof a.id !== 'number' || esDeLote(a)) return;
      const id = `alerta-${a.id}`;
      if (a.status !== 'ACTIVE') {
        // Vista o resuelta: ya no hace falta insistir.
        notificadas.delete(a.id);
        n.cancelNotification(id).catch(() => {});
        return;
      }
      if (notificadas.has(a.id)) return;
      // Con la app abierta la pantalla ya muestra y hace vibrar la alerta.
      if (AppState.currentState === 'active') return;
      notificadas.add(a.id);
      mostrarAlerta(a);
    },
    (abierto) => {
      alertasAbierto = abierto;
      refrescar();
    },
  );
  const cierraDevice = conectarWS(
    url,
    '/ws/device',
    (txt) => {
      const l = leerTelemetria(txt, contenedorActual);
      if (l) temperatura = l.temperatura;
    },
    (abierto) => {
      deviceAbierto = abierto;
    },
  );

  const timer = setInterval(refrescar, REFRESCO_MS);
  await new Promise<void>((fin) => {
    detener = fin;
  });
  clearInterval(timer);
  cierraAlertas();
  cierraDevice();
  n.cancelNotification(ID_SIN_CONEXION).catch(() => {});
}

if (lib) {
  lib.default.registerForegroundService(tarea);
  lib.default.onBackgroundEvent(async () => {});
}

export async function iniciarMonitor(url: string): Promise<EstadoMonitor> {
  if (!lib) return 'no-soportado';
  const n = lib.default;
  if (detener && urlEnEjecucion === url) return 'activo';
  if (detener) await detenerMonitor();

  const permiso = await n.requestPermission();
  if (permiso.authorizationStatus < lib.AuthorizationStatus.AUTHORIZED) return 'sin-permiso';

  await crearCanales(lib);

  urlActual = url;
  urlEnEjecucion = url;
  await n.displayNotification({
    id: ID_MONITOR,
    title: 'VacTy está vigilando tus vacunas',
    body: 'Conectando…',
    android: { smallIcon: 'ic_notification', color: '#390f07', channelId: CANAL_MONITOR, asForegroundService: true, ongoing: true, onlyAlertOnce: true, pressAction: { id: 'default', launchActivity: 'default' } },
  });
  return 'activo';
}

export async function detenerMonitor() {
  if (!lib) return;
  detener?.();
  detener = null;
  urlEnEjecucion = null;
  await lib.default.stopForegroundService().catch(() => {});
}

// Ahorro de bateria: si esta activo, Android puede pausar la red con el celular quieto y en reposo.
export async function bateriaOptimizada(): Promise<boolean> {
  if (!lib) return false;
  return lib.default.isBatteryOptimizationEnabled().catch(() => false);
}
export const abrirAjustesBateria = () => lib?.default.openBatteryOptimizationSettings().catch(() => {});

// Si la enfermera (o la capa del fabricante) bajo o bloqueo el canal, la alarma llega sin sonido ni ventana emergente.
export async function alertasSilenciadas(): Promise<boolean> {
  if (!lib) return false;
  const canal = await lib.default.getChannel(CANAL_ALERTAS).catch(() => null);
  return !!canal && (canal.blocked || (canal.importance ?? lib.AndroidImportance.HIGH) < lib.AndroidImportance.HIGH);
}
export const abrirAjustesAlertas = () => lib?.default.openNotificationSettings(CANAL_ALERTAS).catch(() => {});

export const ESPERA_PRUEBA_S = 10;

/**
 * Lanza una alarma de ejemplo en unos segundos, para salir de la app y comprobar que suena y aparece.
 * Solo con el monitoreo activo: su servicio crea el canal y mantiene vivo el temporizador con la app cerrada.
 */
export function probarAlarma() {
  setTimeout(
    () =>
      mostrarAlerta({
        id: 0,
        contenedor: contenedorActual ?? '',
        type: 'OUT_OF_RANGE',
        severity: 'CRITICAL',
        status: 'ACTIVE',
        title: 'Prueba de alarma',
        message: 'Así suena y se ve una alerta de temperatura con la app cerrada. Tócala o deslízala para silenciarla.',
        triggerValue: null,
        startedAt: new Date().toISOString(),
        resolvedAt: null,
      }),
    ESPERA_PRUEBA_S * 1000,
  );
}
