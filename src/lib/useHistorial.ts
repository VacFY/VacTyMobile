import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useVacty } from './estado';
import { detectarCortes, MAX_PAGINAS, POR_PAGINA, RANGOS, unirPaginas, type Corte, type Punto, type RangoClave } from './historial';

// Carga del historial del sensor desde el servidor (varias paginas si hace falta) y deteccion de cortes.
export function useHistorial(rango: RangoClave) {
  const { cargarLecturas } = useVacty();
  const [puntos, setPuntos] = useState<Punto[] | null>(null); // de la mas nueva a la mas vieja
  const [invalidas, setInvalidas] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);
  const [truncado, setTruncado] = useState(false);
  const [ventana, setVentana] = useState({ desde: Date.now(), hasta: Date.now() });
  const peticion = useRef(0);

  const cargar = useCallback(async () => {
    const id = ++peticion.current;
    setCargando(true);
    setError(false);
    try {
      const horas = RANGOS.find((r) => r.clave === rango)!.horas;
      const hastaMs = Date.now();
      const desde = new Date(hastaMs - horas * 3600_000);
      const paginas = [];
      let hasta: Date | undefined;
      let corto = false;
      for (let i = 0; i < MAX_PAGINAS; i++) {
        const pagina = await cargarLecturas(desde, hasta);
        paginas.push(pagina);
        if (pagina.length < POR_PAGINA) break;
        if (i === MAX_PAGINAS - 1) corto = true;
        hasta = new Date(pagina[pagina.length - 1].receivedAt);
      }
      if (id !== peticion.current) return;
      const r = unirPaginas(paginas);
      setPuntos(r.puntos);
      setInvalidas(r.invalidas);
      setTruncado(corto);
      // si hubo que cortar por el limite de paginas, el inicio real es la lectura mas vieja que si cargamos
      setVentana({ desde: corto && r.puntos.length ? r.puntos[r.puntos.length - 1].ts : desde.getTime(), hasta: hastaMs });
    } catch {
      if (id === peticion.current) setError(true);
    } finally {
      if (id === peticion.current) setCargando(false);
    }
  }, [cargarLecturas, rango]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const asc = useMemo(() => (puntos ? [...puntos].reverse() : []), [puntos]);
  const cortes: Corte[] = useMemo(() => (puntos ? detectarCortes(asc, ventana.desde, ventana.hasta) : []), [puntos, asc, ventana]);

  return { puntos, asc, cortes, invalidas, cargando, error, truncado, ventana, recargar: cargar };
}
