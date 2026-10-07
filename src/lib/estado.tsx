import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Vibration } from 'react-native';
import {
  ApiError, asignarPerfil, CONTENEDOR, cerrarSesionServidor, conectarWS, crearPerfil, iniciarSesion, leerTelemetria,
  listarAlertas, listarLecturas, listarPerfiles, reconocerAlerta, urlWs, type AlertaServidor, type Lectura, type LecturaServidor,
} from './api';
import { evaluar, type Causa, type Estado } from './evaluar';
import { detenerMonitor, iniciarMonitor, type EstadoMonitor } from './monitor';
import { borrarCredenciales, guardarCredenciales, leerCredenciales, type Credenciales } from './sesion';
import { cargar, CLAVES, guardar } from './storage';
import { perfilPorId, type PerfilVacuna } from './vacunas';

export type Lote = { id: string; vacunaId: string; codigo: string; vencimiento: string; vvm?: 'utilizable' | 'descartar' };
export type Sesion = 'cargando' | 'fuera' | 'dentro';

const URL_DEFECTO = process.env.EXPO_PUBLIC_API_URL ?? 'https://vacfybackend.onrender.com';
const MAX_HISTORIAL = 2000;
const ESPACIO_HISTORIAL_MS = 5000;
const SENSOR_INACTIVO_MS = 15000;

type Ctx = {
  listo: boolean;
  sesion: Sesion;
  entrar: (dni: string, password: string, url: string) => Promise<string | null>;
  salir: () => void;
  url: string;
  perfil: PerfilVacuna | null;
  elegirVacuna: (id: string) => void;
  perfilSync: 'pendiente' | 'ok' | 'error';
  monitoreo: boolean;
  cambiarMonitoreo: (v: boolean) => void;
  estadoMonitor: EstadoMonitor;
  lectura: Lectura | null;
  servidorConectado: boolean;
  sensorActivo: boolean;
  estado: Estado;
  causa: Causa;
  historial: Lectura[];
  alertas: AlertaServidor[];
  reconocer: (id: number) => void;
  cargarLecturas: (desde: Date, hasta?: Date) => Promise<LecturaServidor[]>;
  lotes: Lote[];
  agregarLote: (l: Omit<Lote, 'id'>) => void;
  actualizarLote: (id: string, cambios: Partial<Lote>) => void;
  quitarLote: (id: string) => void;
  limpiarHistorial: () => void;
};

const Contexto = createContext<Ctx>(null as unknown as Ctx);
export const useVacty = () => useContext(Contexto);

export function VactyProvider({ children }: { children: ReactNode }) {
  const [listo, setListo] = useState(false);
  const [sesion, setSesion] = useState<Sesion>('cargando');
  const [vacunaId, setVacunaId] = useState<string | null>(null);
  const [url, setUrl] = useState(URL_DEFECTO);
  const [perfilSync, setPerfilSync] = useState<'pendiente' | 'ok' | 'error'>('pendiente');
  const [monitoreo, setMonitoreo] = useState(true);
  const [estadoMonitor, setEstadoMonitor] = useState<EstadoMonitor>('inactivo');
  const [lectura, setLectura] = useState<Lectura | null>(null);
  const [wsAbierto, setWsAbierto] = useState(false);
  const [ahora, setAhora] = useState(Date.now());
  const [historial, setHistorial] = useState<Lectura[]>([]);
  const [alertas, setAlertas] = useState<AlertaServidor[]>([]);
  const [lotes, setLotes] = useState<Lote[]>([]);
  const cred = useRef<Credenciales | null>(null);
  const conocidas = useRef(new Set<number>());
  const contador = useRef(0);

  const perfil = perfilPorId(vacunaId);
  const ev = lectura && perfil ? evaluar(lectura.temperatura, perfil) : { estado: 'ok' as Estado, causa: null as Causa };
  const sensorActivo = wsAbierto && !!lectura && ahora - lectura.ts < SENSOR_INACTIVO_MS;

  // Ejecuta una llamada REST; si la sesion expiro (401/403) vuelve a iniciar sesion y reintenta.
  const conSesion = useCallback(
    async <T,>(fn: () => Promise<T>): Promise<T> => {
      try {
        return await fn();
      } catch (e) {
        if (e instanceof ApiError && (e.status === 401 || e.status === 403) && cred.current) {
          await iniciarSesion(url, cred.current.dni, cred.current.password);
          return fn();
        }
        throw e;
      }
    },
    [url],
  );

  // Arranque: datos guardados y reinicio de sesion automatico.
  useEffect(() => {
    (async () => {
      const u = await cargar(CLAVES.url, URL_DEFECTO);
      setUrl(u);
      setVacunaId(await cargar<string | null>(CLAVES.vacuna, null));
      setMonitoreo(await cargar(CLAVES.monitoreo, true));
      setHistorial(await cargar(CLAVES.historial, []));
      setLotes(await cargar(CLAVES.lotes, []));
      const c = await leerCredenciales();
      if (!c) {
        setSesion('fuera');
      } else {
        cred.current = c;
        try {
          await iniciarSesion(u, c.dni, c.password);
          setSesion('dentro');
        } catch (e) {
          // Sin red: entramos igual (hay datos locales); credenciales rechazadas: volver al login.
          setSesion(e instanceof ApiError ? 'fuera' : 'dentro');
        }
      }
      setListo(true);
    })();
  }, []);

  useEffect(() => {
    const id = setInterval(() => setAhora(Date.now()), 3000);
    return () => clearInterval(id);
  }, []);

  const avisarNueva = useCallback((a: AlertaServidor) => {
    if (conocidas.current.has(a.id)) return;
    conocidas.current.add(a.id);
    if (a.status === 'ACTIVE') {
      Vibration.vibrate(a.severity === 'CRITICAL' ? [0, 800, 300, 800, 300, 800, 300, 800] : [0, 600, 300, 600]);
    }
  }, []);

  // Datos en vivo y alertas del servidor.
  useEffect(() => {
    if (sesion !== 'dentro') return;
    const cierraDevice = conectarWS(
      urlWs(url, '/ws/device'),
      (txt) => {
        const l = leerTelemetria(txt);
        if (!l) return;
        setLectura(l);
        setHistorial((h) => {
          const ultimo = h[h.length - 1];
          if (ultimo && l.ts - ultimo.ts < ESPACIO_HISTORIAL_MS) return h;
          const n = [...h, l].slice(-MAX_HISTORIAL);
          if (++contador.current % 5 === 0) guardar(CLAVES.historial, n);
          return n;
        });
      },
      setWsAbierto,
    );
    const cierraAlertas = conectarWS(
      urlWs(url, '/ws/alerts'),
      (txt) => {
        try {
          const a = JSON.parse(txt) as AlertaServidor;
          if (a.contenedor !== CONTENEDOR) return;
          avisarNueva(a);
          setAlertas((prev) => [a, ...prev.filter((x) => x.id !== a.id)].sort((x, y) => y.id - x.id));
        } catch {}
      },
      () => {},
    );
    conSesion(() => listarAlertas(url))
      .then((lista) => {
        lista.forEach((a) => conocidas.current.add(a.id));
        setAlertas((prev) => {
          const m = new Map(lista.map((a) => [a.id, a]));
          prev.forEach((a) => m.set(a.id, a));
          return [...m.values()].sort((x, y) => y.id - x.id);
        });
      })
      .catch(() => {});
    return () => {
      cierraDevice();
      cierraAlertas();
      setWsAbierto(false);
    };
  }, [sesion, url, conSesion, avisarNueva]);

  // La vacuna elegida define el rango del servidor: se busca o crea el perfil y se asigna al contenedor.
  useEffect(() => {
    if (sesion !== 'dentro' || !perfil) return;
    let vigente = true;
    setPerfilSync('pendiente');
    conSesion(async () => {
      const lista = await listarPerfiles(url);
      let p = lista.find((x) => x.name === perfil.nombre && x.minTemp === perfil.min && x.maxTemp === perfil.max);
      if (!p) p = await crearPerfil(url, { name: perfil.nombre, minTemp: perfil.min, maxTemp: perfil.max, freezeSensitive: perfil.sensibleCongelacion });
      await asignarPerfil(url, CONTENEDOR, p.id);
    })
      .then(() => vigente && setPerfilSync('ok'))
      .catch(() => vigente && setPerfilSync('error'));
    return () => {
      vigente = false;
    };
  }, [sesion, perfil, url, conSesion]);

  // Servicio en segundo plano: vive mientras haya sesion y el monitoreo este activado.
  useEffect(() => {
    let vigente = true;
    if (sesion === 'dentro' && monitoreo) {
      iniciarMonitor(url).then((e) => vigente && setEstadoMonitor(e));
    } else {
      detenerMonitor().then(() => vigente && setEstadoMonitor('inactivo'));
    }
    return () => {
      vigente = false;
    };
  }, [sesion, monitoreo, url]);

  const persistirLotes = (fn: (l: Lote[]) => Lote[]) =>
    setLotes((l) => {
      const n = fn(l);
      guardar(CLAVES.lotes, n);
      return n;
    });

  const valor: Ctx = {
    listo,
    sesion,
    entrar: async (dni, password, nuevaUrl) => {
      const base = nuevaUrl.trim();
      try {
        await iniciarSesion(base, dni.trim(), password);
      } catch (e) {
        return e instanceof ApiError ? 'DNI o contraseña incorrectos' : 'No se pudo conectar con el servidor. Revisa la URL y tu red.';
      }
      const c = { dni: dni.trim(), password };
      cred.current = c;
      await guardarCredenciales(c);
      setUrl(base);
      guardar(CLAVES.url, base);
      setSesion('dentro');
      return null;
    },
    salir: () => {
      cerrarSesionServidor(url);
      borrarCredenciales();
      cred.current = null;
      conocidas.current.clear();
      setAlertas([]);
      setLectura(null);
      setSesion('fuera');
    },
    url,
    perfil,
    elegirVacuna: useCallback((id) => {
      setVacunaId(id);
      guardar(CLAVES.vacuna, id);
    }, []),
    perfilSync,
    monitoreo,
    cambiarMonitoreo: (v) => {
      setMonitoreo(v);
      guardar(CLAVES.monitoreo, v);
    },
    estadoMonitor,
    lectura,
    servidorConectado: wsAbierto,
    sensorActivo,
    estado: ev.estado,
    causa: ev.causa,
    historial,
    alertas,
    reconocer: (id) => {
      conSesion(() => reconocerAlerta(url, id))
        .then((a) => setAlertas((prev) => prev.map((x) => (x.id === id ? a : x))))
        .catch(() => {});
    },
    cargarLecturas: (desde, hasta) => conSesion(() => listarLecturas(url, CONTENEDOR, desde, hasta)),
    lotes,
    agregarLote: (l) => persistirLotes((ls) => [...ls, { ...l, id: String(Date.now()) }]),
    actualizarLote: (id, c) => persistirLotes((ls) => ls.map((x) => (x.id === id ? { ...x, ...c } : x))),
    quitarLote: (id) => persistirLotes((ls) => ls.filter((x) => x.id !== id)),
    limpiarHistorial: () => {
      setHistorial([]);
      guardar(CLAVES.historial, []);
    },
  };

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}
