import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Vibration } from 'react-native';
import {
  ApiError, cerrarLote, cerrarSesionServidor, conectarWS, conSesion, entregarTermo, esDeLote, iniciarSesion, leerTelemetria,
  listarAlertas, listarLecturas, listarVacunas, lotesDelTermo, misTermos, obtenerPerfil, reconocerAlerta, registrarLote,
  todosLosTermos, vincularTermo, type AlertaServidor, type Lectura, type LecturaServidor, type LoteServidor, type Rol, type Termo,
  type Vacuna,
} from './api';
import { evaluar, type Causa, type Estado } from './evaluar';
import { detenerMonitor, fijarTermoMonitor, iniciarMonitor, type EstadoMonitor } from './monitor';
import { borrarCredenciales, guardarCredenciales, leerCredenciales } from './sesion';
import { cargar, CLAVES, guardar } from './storage';
import { perfilDeTermo, type PerfilVacuna } from './vacunas';

export type Sesion = 'cargando' | 'fuera' | 'dentro';
export type Vvm = 'utilizable' | 'descartar';
type Usuario = { dni: string; rol: Rol; nombre: string | null };

const URL_DEFECTO = process.env.EXPO_PUBLIC_API_URL ?? 'https://vacfybackend.onrender.com';
const MAX_HISTORIAL = 2000;
const ESPACIO_HISTORIAL_MS = 5000;
const SENSOR_INACTIVO_MS = 15000;
const REFRESCO_TERMOS_MS = 60_000;

/** Texto para mostrar de un error del servidor o de la red. */
export function mensajeError(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.motivo) return e.motivo;
    if (e.status === 401) return 'Tu sesión terminó. Vuelve a iniciar sesión.';
    if (e.status >= 500) return 'El servidor no pudo completar la operación. Inténtalo de nuevo.';
    return `El servidor respondió ${e.status}.`;
  }
  return 'Sin conexión con el servidor. Revisa tu internet.';
}

const limpioPerfil = (v: string | undefined) => (v && v.trim().toLowerCase() !== 'undefined' ? v.trim() : '');

type Ctx = {
  listo: boolean;
  sesion: Sesion;
  entrar: (dni: string, password: string, url: string) => Promise<string | null>;
  salir: () => void;
  url: string;
  usuario: Usuario | null;
  // Termos: la enfermera ve los que tiene vinculados; el supervisor, todos
  termos: Termo[];
  termo: Termo | null;
  termosListos: boolean;
  elegirTermo: (contenedor: string) => void;
  vincular: (codigo: string, clave: string) => Promise<string>;
  entregar: (contenedor: string) => Promise<void>;
  recargarTermos: () => Promise<void>;
  /** Rango del termo activo (lo calcula el backend). */
  perfil: PerfilVacuna | null;
  monitoreo: boolean;
  cambiarMonitoreo: (v: boolean) => void;
  estadoMonitor: EstadoMonitor;
  lectura: Lectura | null;
  servidorConectado: boolean;
  sensorActivo: boolean;
  estado: Estado;
  causa: Causa;
  historial: Lectura[];
  /** Alertas de mis termos. */
  alertas: AlertaServidor[];
  reconocer: (id: number) => void;
  cargarLecturas: (desde: Date, hasta?: Date) => Promise<LecturaServidor[]>;
  lotes: LoteServidor[];
  lotesCargando: boolean;
  recargarLotes: () => Promise<void>;
  agregarLote: (l: { vaccineId: number; lotNumber: string; expiryDate: string; vials: number }) => Promise<string | null>;
  cerrarLoteId: (id: number, status: 'USED' | 'DISCARDED', motivo: string) => Promise<string | null>;
  vacunas: Vacuna[];
  /** VVM revisado en este celular, por id de lote (el backend no lo guarda). */
  vvm: Record<number, Vvm>;
  marcarVvm: (lotId: number, v: Vvm) => void;
  limpiarHistorial: () => void;
};

const Contexto = createContext<Ctx>(null as unknown as Ctx);
export const useVacty = () => useContext(Contexto);

export function VactyProvider({ children }: { children: ReactNode }) {
  const [listo, setListo] = useState(false);
  const [sesion, setSesion] = useState<Sesion>('cargando');
  const [url, setUrl] = useState(URL_DEFECTO);
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [termos, setTermos] = useState<Termo[]>([]);
  const [termosListos, setTermosListos] = useState(false);
  const [activo, setActivo] = useState<string | null>(null);
  const [monitoreo, setMonitoreo] = useState(true);
  const [estadoMonitor, setEstadoMonitor] = useState<EstadoMonitor>('inactivo');
  // Lectura e historial local guardan de qué termo son: al cambiar de termo no se mezclan.
  const [ultima, setUltima] = useState<{ c: string; l: Lectura } | null>(null);
  const [wsAbierto, setWsAbierto] = useState(false);
  const [ahora, setAhora] = useState(Date.now());
  const [hist, setHist] = useState<{ c: string | null; puntos: Lectura[] }>({ c: null, puntos: [] });
  const [alertas, setAlertas] = useState<AlertaServidor[]>([]);
  const [lotes, setLotes] = useState<LoteServidor[]>([]);
  const [lotesCargando, setLotesCargando] = useState(false);
  const [vacunas, setVacunas] = useState<Vacuna[]>([]);
  const [vvm, setVvm] = useState<Record<number, Vvm>>({});
  const conocidas = useRef(new Set<number>());
  const contador = useRef(0);
  const rolRef = useRef<Rol>('ENFERMERA');

  const termo = termos.find((t) => t.contenedor === activo) ?? termos[0] ?? null;
  const contenedor = termo?.contenedor ?? null;
  const contenedorRef = useRef<string | null>(null);
  useEffect(() => {
    contenedorRef.current = contenedor;
  }, [contenedor]);
  const lectura = ultima && ultima.c === contenedor ? ultima.l : null;
  const historial = useMemo(() => (hist.c === contenedor ? hist.puntos : []), [hist, contenedor]);
  const perfil = useMemo(() => (termo ? perfilDeTermo(termo) : null), [termo]);
  const ev = lectura && perfil ? evaluar(lectura.temperatura, perfil) : { estado: 'ok' as Estado, causa: null as Causa };
  const sensorActivo = wsAbierto && !!lectura && ahora - lectura.ts < SENSOR_INACTIVO_MS;

  // Arranque: datos guardados y reinicio de sesion automatico.
  useEffect(() => {
    (async () => {
      const u = await cargar(CLAVES.url, URL_DEFECTO);
      setUrl(u);
      setActivo(await cargar<string | null>(CLAVES.termo, null));
      setMonitoreo(await cargar(CLAVES.monitoreo, true));
      setTermos(await cargar<Termo[]>(CLAVES.termos, []));
      setVacunas(await cargar<Vacuna[]>(CLAVES.vacunas, []));
      setVvm(await cargar<Record<number, Vvm>>(CLAVES.vvm, {}));
      const guardado = await cargar<Usuario | null>(CLAVES.usuario, null);
      if (guardado) {
        setUsuario(guardado);
        rolRef.current = guardado.rol;
      }
      const c = await leerCredenciales();
      if (!c) {
        setSesion('fuera');
      } else {
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

  const recargarTermos = useCallback(async () => {
    try {
      const lista = await conSesion(url, () => (rolRef.current === 'SUPERVISOR' ? todosLosTermos(url) : misTermos(url)));
      lista.sort((a, b) => a.contenedor.localeCompare(b.contenedor, 'es', { numeric: true }));
      setTermos(lista);
      guardar(CLAVES.termos, lista);
    } catch {
      // sin conexion: se queda con la lista guardada
    } finally {
      setTermosListos(true);
    }
  }, [url]);

  // Al entrar: perfil (rol y nombre), termos y catalogo de vacunas; luego los termos cada minuto.
  useEffect(() => {
    if (sesion !== 'dentro') return;
    let vigente = true;
    (async () => {
      try {
        const p = await conSesion(url, () => obtenerPerfil(url));
        const u: Usuario = {
          dni: p.profileDni,
          rol: p.role === 'SUPERVISOR' ? 'SUPERVISOR' : 'ENFERMERA',
          nombre: [limpioPerfil(p.profileName), limpioPerfil(p.profileLastName)].filter(Boolean).join(' ') || null,
        };
        if (!vigente) return;
        rolRef.current = u.rol;
        setUsuario(u);
        guardar(CLAVES.usuario, u);
      } catch {}
      if (vigente) await recargarTermos();
      conSesion(url, () => listarVacunas(url))
        .then((v) => {
          setVacunas(v);
          guardar(CLAVES.vacunas, v);
        })
        .catch(() => {});
    })();
    const id = setInterval(recargarTermos, REFRESCO_TERMOS_MS);
    return () => {
      vigente = false;
      clearInterval(id);
    };
  }, [sesion, url, recargarTermos]);

  // Varios avisos seguidos por /ws/alerts se agrupan en una sola recarga de termos.
  const pendiente = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const recargarPronto = useCallback(() => {
    if (pendiente.current) return;
    pendiente.current = setTimeout(() => {
      pendiente.current = undefined;
      recargarTermos();
    }, 1500);
  }, [recargarTermos]);

  const avisarNueva = useCallback((a: AlertaServidor) => {
    if (conocidas.current.has(a.id)) return;
    conocidas.current.add(a.id);
    if (a.status === 'ACTIVE' && !esDeLote(a)) {
      Vibration.vibrate(a.severity === 'CRITICAL' ? [0, 800, 300, 800, 300, 800, 300, 800] : [0, 600, 300, 600]);
    }
  }, []);

  // Al cambiar de termo: su historial local guardado en el celular.
  useEffect(() => {
    if (!contenedor) return;
    let vigente = true;
    cargar<Lectura[]>(`${CLAVES.historial}.${contenedor}`, []).then(
      (puntos) => vigente && setHist((h) => (h.c === contenedor && h.puntos.length ? h : { c: contenedor, puntos })),
    );
    fijarTermoMonitor(contenedor);
    return () => {
      vigente = false;
    };
  }, [contenedor]);

  // Datos en vivo y alertas del servidor (el backend solo envia lo de mis termos).
  useEffect(() => {
    if (sesion !== 'dentro') return;
    const cierraDevice = conectarWS(
      url,
      '/ws/device',
      (txt) => {
        const actual = contenedorRef.current;
        const l = leerTelemetria(txt, actual);
        if (!l || !actual) return;
        setUltima({ c: actual, l });
        setHist((h) => {
          const previos = h.c === actual ? h.puntos : [];
          const ultimo = previos[previos.length - 1];
          if (ultimo && l.ts - ultimo.ts < ESPACIO_HISTORIAL_MS) return h;
          const n = [...previos, l].slice(-MAX_HISTORIAL);
          if (++contador.current % 5 === 0) guardar(`${CLAVES.historial}.${actual}`, n);
          return { c: actual, puntos: n };
        });
      },
      setWsAbierto,
    );
    const cierraAlertas = conectarWS(
      url,
      '/ws/alerts',
      (txt) => {
        try {
          const m = JSON.parse(txt);
          // Un mensaje con `tipo` es un aviso (p. ej. ASIGNACION_CAMBIADA); uno con `id`, una alerta.
          if (m && typeof m.tipo === 'string') return recargarPronto();
          const a = m as AlertaServidor;
          if (typeof a.id !== 'number') return;
          avisarNueva(a);
          setAlertas((prev) => [a, ...prev.filter((x) => x.id !== a.id)].sort((x, y) => y.id - x.id));
          recargarPronto();
        } catch {}
      },
      () => {},
    );
    conSesion(url, () => listarAlertas(url))
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
  }, [sesion, url, avisarNueva, recargarPronto]);

  // Lotes del termo activo (en el servidor).
  const recargarLotes = useCallback(async () => {
    if (!contenedor) return;
    setLotesCargando(true);
    try {
      const lista = await conSesion(url, () => lotesDelTermo(url, contenedor));
      setLotes(lista);
      guardar(`${CLAVES.lotes}.${contenedor}`, lista);
    } catch {
      setLotes(await cargar<LoteServidor[]>(`${CLAVES.lotes}.${contenedor}`, []));
    } finally {
      setLotesCargando(false);
    }
  }, [url, contenedor]);

  useEffect(() => {
    if (sesion === 'dentro') recargarLotes();
  }, [sesion, recargarLotes]);

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

  // La enfermera deja de ver las alertas de un termo que ya no tiene.
  const alertasVisibles = useMemo(() => {
    if (usuario?.rol === 'SUPERVISOR') return alertas;
    const mios = new Set(termos.map((t) => t.contenedor));
    return alertas.filter((a) => mios.has(a.contenedor));
  }, [alertas, termos, usuario?.rol]);

  const elegirTermo = useCallback((c: string) => {
    setActivo(c);
    guardar(CLAVES.termo, c);
  }, []);

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
      await guardarCredenciales({ dni: dni.trim(), password });
      setUrl(base);
      guardar(CLAVES.url, base);
      setTermosListos(false);
      setSesion('dentro');
      return null;
    },
    salir: () => {
      cerrarSesionServidor(url);
      borrarCredenciales();
      conocidas.current.clear();
      setAlertas([]);
      setUltima(null);
      setTermos([]);
      setLotes([]);
      setUsuario(null);
      guardar(CLAVES.termos, []);
      guardar(CLAVES.usuario, null);
      setSesion('fuera');
    },
    url,
    usuario,
    termos,
    termo,
    termosListos,
    elegirTermo,
    vincular: async (codigo, clave) => {
      const r = await conSesion(url, () => vincularTermo(url, codigo.trim(), clave.trim()));
      elegirTermo(r.contenedor);
      await recargarTermos();
      const nombre = r.nombre || `El termo ${r.contenedor}`;
      return r.nuevaAsignacion ? `${nombre} quedó vinculado a tu cuenta.` : `${nombre} ya estaba vinculado a tu cuenta.`;
    },
    entregar: async (c) => {
      await conSesion(url, () => entregarTermo(url, c));
      await recargarTermos();
    },
    recargarTermos,
    perfil,
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
    alertas: alertasVisibles,
    reconocer: (id) => {
      conSesion(url, () => reconocerAlerta(url, id))
        .then((a) => setAlertas((prev) => prev.map((x) => (x.id === id ? a : x))))
        .catch(() => {});
    },
    cargarLecturas: (desde, hasta) => {
      if (!contenedor) return Promise.resolve([]);
      return conSesion(url, () => listarLecturas(url, contenedor, desde, hasta));
    },
    lotes,
    lotesCargando,
    recargarLotes,
    agregarLote: async (l) => {
      if (!contenedor) return 'Primero elige un termo.';
      try {
        const nuevo = await conSesion(url, () => registrarLote(url, { contenedor, ...l }));
        setLotes((ls) => [...ls, nuevo]);
        recargarPronto();
        return null;
      } catch (e) {
        return mensajeError(e);
      }
    },
    cerrarLoteId: async (id, status, motivo) => {
      try {
        await conSesion(url, () => cerrarLote(url, id, status, motivo));
        setLotes((ls) => ls.filter((x) => x.id !== id));
        recargarPronto();
        return null;
      } catch (e) {
        return mensajeError(e);
      }
    },
    vacunas,
    vvm,
    marcarVvm: (lotId, v) =>
      setVvm((m) => {
        const n = { ...m, [lotId]: v };
        guardar(CLAVES.vvm, n);
        return n;
      }),
    limpiarHistorial: () => {
      setHist({ c: contenedor, puntos: [] });
      if (contenedor) guardar(`${CLAVES.historial}.${contenedor}`, []);
    },
  };

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}
