import { useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Boton, Encabezado, Punto, Segmentos, Skeleton, T, Vacio } from '../components/ui';
import { useVacty } from '../lib/estado';
import { duracionTexto, RANGOS, type Punto as Lectura, type RangoClave } from '../lib/historial';
import { useHistorial } from '../lib/useHistorial';
import { useTema } from '../lib/theme';

const fechaHora = (ts: number) => new Date(ts).toLocaleString([], { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
type Item = { tipo: 'lectura'; p: Lectura } | { tipo: 'corte'; desde: number; hasta: number; enCurso: boolean };

export default function HistorialCompleto() {
  const t = useTema();
  const { perfil } = useVacty();
  const [rango, setRango] = useState<RangoClave>('24h');
  const h = useHistorial(rango);

  // Lecturas de la mas reciente a la mas antigua, con los cortes del sensor intercalados donde ocurrieron.
  const items = useMemo<Item[]>(() => {
    if (!h.puntos) return [];
    const salida: Item[] = [];
    const reales = h.cortes.filter((c) => !c.inicio);
    const enCurso = reales.find((c) => c.enCurso);
    if (enCurso) salida.push({ tipo: 'corte', desde: enCurso.desde, hasta: enCurso.hasta, enCurso: true });
    const medios = reales.filter((c) => !c.enCurso).sort((a, b) => b.hasta - a.hasta);
    let k = 0;
    h.puntos.forEach((p, i) => {
      salida.push({ tipo: 'lectura', p });
      const anterior = h.puntos![i + 1]; // la lectura inmediatamente mas vieja
      while (k < medios.length && anterior && medios[k].hasta <= p.ts && medios[k].desde >= anterior.ts) {
        salida.push({ tipo: 'corte', desde: medios[k].desde, hasta: medios[k].hasta, enCurso: false });
        k++;
      }
    });
    return salida;
  }, [h.puntos, h.cortes]);

  if (!perfil) return null;

  const cabecera = (
    <View style={{ gap: 18, paddingBottom: 10 }}>
      <Encabezado titulo="Todas las lecturas" subtitulo={`Termo 001 · ${perfil.nombre}`} atras />
      <Segmentos opciones={RANGOS.map((r) => ({ clave: r.clave, titulo: r.titulo }))} valor={rango} onChange={setRango} />
      {h.cargando && !h.puntos && (
        <View style={{ gap: 12 }}>
          <Skeleton w="100%" h={40} r={8} />
          <Skeleton w="100%" h={40} r={8} />
          <Skeleton w="100%" h={40} r={8} />
        </View>
      )}
      {h.error && (
        <View style={{ gap: 12 }}>
          <Vacio icono="cloud-offline" titulo="No se pudo cargar" texto="Revisa la conexión con el servidor." />
          <Boton titulo="Reintentar" icono="refresh" onPress={h.recargar} />
        </View>
      )}
      {!h.error && h.puntos && h.puntos.length === 0 && <Vacio icono="analytics" titulo="Sin lecturas en este período" />}
      {!h.error && h.puntos && h.puntos.length > 0 && <T v="etiqueta" c="sub">{h.puntos.length.toLocaleString()} lecturas · la más reciente primero</T>}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <FlatList
          data={items}
          keyExtractor={(it, i) => (it.tipo === 'lectura' ? `${it.p.ts}-${i}` : `c${it.desde}-${i}`)}
          ListHeaderComponent={cabecera}
          contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 12, paddingBottom: 60 }}
          initialNumToRender={24}
          windowSize={10}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={h.cargando && !!h.puntos} onRefresh={h.recargar} tintColor={t.sub} />}
          renderItem={({ item }) => {
            if (item.tipo === 'corte') {
              return (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14, paddingHorizontal: 12, marginVertical: 6, borderRadius: 12, backgroundColor: t.esOscuro ? 'rgba(255,107,94,0.12)' : 'rgba(217,58,47,0.08)' }}>
                  <Punto color={t.alerta} pulso={item.enCurso} />
                  <T v="chico" c="alerta" style={{ flex: 1 }}>
                    Sin datos · {duracionTexto(item.hasta - item.desde)}
                    {item.enCurso ? ' · sigue sin enviar' : ''}
                  </T>
                  <T v="chico" c="sub">{fechaHora(item.desde).slice(0, 11)}</T>
                </View>
              );
            }
            const fuera = item.p.temperatura < perfil.min || item.p.temperatura > perfil.max;
            return (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.borde }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: fuera ? t.alerta : t.ok }} />
                <T v="chico" c="sub" style={{ flex: 1 }}>{fechaHora(item.p.ts)}</T>
                <T v="subtitulo" c={fuera ? 'alerta' : 'texto'}>{item.p.temperatura.toFixed(1)}°</T>
                <T v="chico" c="sub" style={{ width: 46, textAlign: 'right' }}>{item.p.humedad === null ? '--' : `${item.p.humedad.toFixed(0)}%`}</T>
              </View>
            );
          }}
        />
      </SafeAreaView>
    </View>
  );
}
