import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Grafico } from '../components/Grafico';
import { Boton, Card, Chip, Encabezado, Skeleton, T, Vacio } from '../components/ui';
import { useVacty } from '../lib/estado';
import { estadisticas, MAX_PAGINAS, POR_PAGINA, RANGOS, reducir, unirPaginas, type Punto, type RangoClave } from '../lib/historial';
import { useTema } from '../lib/theme';

const fechaHora = (ts: number) => new Date(ts).toLocaleString([], { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });

function Dato({ etiqueta, valor, color }: { etiqueta: string; valor: string; color?: 'ok' | 'alerta' }) {
  return (
    <Card style={{ width: '47.5%', gap: 4, padding: 14 }}>
      <T v="etiqueta" c="sub">{etiqueta}</T>
      <T v="titulo" c={color ?? 'texto'}>{valor}</T>
    </Card>
  );
}

export default function HistorialCompleto() {
  const t = useTema();
  const { perfil, cargarLecturas } = useVacty();
  const [rango, setRango] = useState<RangoClave>('24h');
  const [puntos, setPuntos] = useState<Punto[] | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);
  const [truncado, setTruncado] = useState(false);
  const peticion = useRef(0);

  const cargar = useCallback(
    async (clave: RangoClave) => {
      const id = ++peticion.current;
      setCargando(true);
      setError(false);
      try {
        const horas = RANGOS.find((r) => r.clave === clave)!.horas;
        const desde = new Date(Date.now() - horas * 3600_000);
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
        setPuntos(unirPaginas(paginas));
        setTruncado(corto);
      } catch {
        if (id === peticion.current) setError(true);
      } finally {
        if (id === peticion.current) setCargando(false);
      }
    },
    [cargarLecturas],
  );

  useEffect(() => {
    cargar(rango);
  }, [rango, cargar]);

  const stats = useMemo(() => (perfil && puntos ? estadisticas(puntos, perfil.min, perfil.max) : null), [puntos, perfil]);
  const serie = useMemo(() => {
    if (!perfil || !puntos) return [];
    return reducir([...puntos].reverse(), 240, (perfil.min + perfil.max) / 2).map((p) => p.temperatura);
  }, [puntos, perfil]);

  if (!perfil) return null;

  const cabecera = (
    <View style={{ gap: 14, paddingBottom: 6 }}>
      <Encabezado titulo="Historial completo" subtitulo={`Termo 001 · ${perfil.nombre}`} atras />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {RANGOS.map((r) => (
          <Chip key={r.clave} texto={r.titulo} activo={rango === r.clave} onPress={() => setRango(r.clave)} />
        ))}
      </View>

      {cargando && !puntos && (
        <>
          <Skeleton w="100%" h={210} r={20} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
            <Skeleton w="47.5%" h={70} r={20} />
            <Skeleton w="47.5%" h={70} r={20} />
          </View>
        </>
      )}

      {error && (
        <Card style={{ gap: 12, borderColor: t.alerta }}>
          <T v="subtitulo" c="alerta">No se pudo cargar el historial</T>
          <T v="cuerpo" c="sub">Revisa la conexión con el servidor e inténtalo de nuevo.</T>
          <Boton titulo="Reintentar" icono="refresh" variante="oscuro" onPress={() => cargar(rango)} />
        </Card>
      )}

      {!error && puntos && puntos.length === 0 && (
        <Card>
          <Vacio icono="analytics" titulo="Sin lecturas en este período" texto="Prueba con un rango más largo o espera a que el sensor envíe datos." />
        </Card>
      )}

      {!error && puntos && puntos.length > 0 && stats && (
        <>
          <Card style={{ gap: 10, opacity: cargando ? 0.5 : 1 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <T v="subtitulo">Temperatura</T>
              <T v="chico" c="sub">{stats.total} lecturas</T>
            </View>
            <Grafico valores={serie} min={perfil.min} max={perfil.max} alto={200} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <T v="chico" c="sub">{fechaHora(puntos[puntos.length - 1].ts)}</T>
              <T v="chico" c="sub">{fechaHora(puntos[0].ts)}</T>
            </View>
          </Card>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
            <Dato etiqueta="Mínima" valor={`${stats.minima.toFixed(1)} °C`} />
            <Dato etiqueta="Máxima" valor={`${stats.maxima.toFixed(1)} °C`} />
            <Dato etiqueta="Promedio" valor={`${stats.promedio.toFixed(1)} °C`} />
            <Dato etiqueta="Fuera de rango" valor={`${stats.fueraPct.toFixed(stats.fueraPct > 0 && stats.fueraPct < 10 ? 1 : 0)} %`} color={stats.fueraPct > 0 ? 'alerta' : 'ok'} />
          </View>
          <T v="chico" c="sub">El porcentaje usa el rango de la vacuna actual ({perfil.min} a {perfil.max} °C).</T>
          {truncado && (
            <T v="chico" c="precaucion">Hay más lecturas que el límite de la app: se muestran las {puntos.length.toLocaleString()} más recientes.</T>
          )}
          <T v="etiqueta" c="sub" style={{ marginTop: 6 }}>Lecturas · de la más reciente a la más antigua</T>
        </>
      )}
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={['top']}>
      <FlatList
        data={puntos ?? []}
        keyExtractor={(p, i) => `${p.ts}-${i}`}
        ListHeaderComponent={cabecera}
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        initialNumToRender={20}
        windowSize={10}
        refreshControl={<RefreshControl refreshing={cargando && !!puntos} onRefresh={() => cargar(rango)} tintColor={t.sub} />}
        renderItem={({ item }) => {
          const fuera = item.temperatura < perfil.min || item.temperatura > perfil.max;
          return (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: t.borde }}>
              <Ionicons name={fuera ? 'alert-circle' : 'checkmark-circle'} size={18} color={fuera ? t.alerta : t.ok} />
              <T v="chico" c="sub" style={{ flex: 1 }}>{fechaHora(item.ts)}</T>
              <T v="subtitulo" c={fuera ? 'alerta' : 'texto'}>{item.temperatura.toFixed(1)} °C</T>
              <T v="chico" c="sub" style={{ width: 48, textAlign: 'right' }}>{item.humedad === null ? '--' : `${item.humedad.toFixed(0)} %`}</T>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}
