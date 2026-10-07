import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { AlertaFila } from '../../components/AlertaFila';
import { Grafico } from '../../components/Grafico';
import { Aparecer, Boton, Divisor, Fila, Pantalla, Segmentos, Seccion, Skeleton, T, Vacio } from '../../components/ui';
import { useVacty } from '../../lib/estado';
import { duracionTexto, estadisticas, RANGOS, reducir, type RangoClave } from '../../lib/historial';
import { useHistorial } from '../../lib/useHistorial';
import { useTema } from '../../lib/theme';

const hm = (ts: number) => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
const dmhm = (ts: number) => new Date(ts).toLocaleString([], { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

function Cifra({ etiqueta, valor, color }: { etiqueta: string; valor: string; color?: 'alerta' | 'ok' }) {
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <T v="etiqueta" c="sub">{etiqueta}</T>
      <T v="display" c={color ?? 'texto'} style={{ fontSize: 30 }}>{valor}</T>
    </View>
  );
}

export default function Historial() {
  const t = useTema();
  const { perfil, alertas, reconocer } = useVacty();
  const [rango, setRango] = useState<RangoClave>('24h');
  const h = useHistorial(rango);
  if (!perfil) return null;

  const stats = h.puntos ? estadisticas(h.puntos, perfil.min, perfil.max) : null;
  const reales = h.cortes.filter((c) => !c.inicio);
  const msSinDatos = reales.reduce((a, c) => a + (c.hasta - c.desde), 0);
  const total = h.ventana.hasta - h.ventana.desde;
  const pctSinDatos = total > 0 ? (msSinDatos / total) * 100 : 0;
  const fx = rango === '7d' || rango === '24h' ? dmhm : hm;

  return (
    <Pantalla titulo="Historial" subtitulo="Lo que midió el sensor y lo que pasó" onRefresh={h.recargar} refrescando={h.cargando && !!h.puntos}>
      <Aparecer i={1}>
        <Segmentos opciones={RANGOS.map((r) => ({ clave: r.clave, titulo: r.titulo }))} valor={rango} onChange={setRango} />
      </Aparecer>

      {h.cargando && !h.puntos && (
        <View style={{ gap: 16 }}>
          <Skeleton w="100%" h={44} r={10} />
          <Skeleton w="100%" h={200} r={16} />
        </View>
      )}

      {h.error && (
        <View style={{ gap: 12 }}>
          <Vacio icono="cloud-offline" titulo="No se pudo cargar el historial" texto="Revisa la conexión con el servidor." />
          <Boton titulo="Reintentar" icono="refresh" onPress={h.recargar} />
        </View>
      )}

      {!h.error && h.puntos && !stats && (
        <Vacio icono="analytics" titulo="Sin lecturas en este período" texto="El sensor no envió temperatura. Prueba con un rango más largo." />
      )}

      {!h.error && stats && h.puntos && (
        <View style={{ gap: 22, opacity: h.cargando ? 0.5 : 1 }}>
          <Aparecer i={2}>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Cifra etiqueta="Mínima" valor={`${stats.minima.toFixed(1)}°`} />
              <Cifra etiqueta="Promedio" valor={`${stats.promedio.toFixed(1)}°`} />
              <Cifra etiqueta="Máxima" valor={`${stats.maxima.toFixed(1)}°`} />
            </View>
          </Aparecer>

          <Aparecer i={3}>
            <Grafico
              puntos={reducir(h.asc, 400, (perfil.min + perfil.max) / 2).map((p) => ({ ts: p.ts, v: p.temperatura }))}
              min={perfil.min}
              max={perfil.max}
              desde={h.ventana.desde}
              hasta={h.ventana.hasta}
              cortes={h.cortes}
              alto={210}
              formatoX={fx}
            />
          </Aparecer>

          <Aparecer i={4}>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Cifra etiqueta="% fuera" valor={`${stats.fueraPct.toFixed(stats.fueraPct > 0 && stats.fueraPct < 10 ? 1 : 0)}%`} color={stats.fueraPct > 0 ? 'alerta' : 'ok'} />
              <Cifra etiqueta="Sin datos" valor={msSinDatos > 0 ? duracionTexto(msSinDatos, true) : 'Nada'} color={msSinDatos > 0 ? 'alerta' : 'ok'} />
              <Cifra etiqueta="Lecturas" valor={stats.total.toLocaleString()} />
            </View>
            {msSinDatos > 0 && (
              <T v="chico" c="sub" style={{ marginTop: 8 }}>
                El sensor estuvo {pctSinDatos < 1 ? 'menos del 1' : pctSinDatos.toFixed(0)}% del período sin enviar lecturas.
              </T>
            )}
            {h.truncado && <T v="chico" c="precaucion" style={{ marginTop: 6 }}>Hay más lecturas que el límite de la app: se muestra lo más reciente.</T>}
          </Aparecer>

          <Aparecer i={5}>
            <Seccion titulo="Cortes del sensor">
              {h.cortes.length === 0 && h.invalidas === 0 ? (
                <Fila icono="checkmark-circle" color="ok" titulo="Sin cortes" detalle="El sensor midió de forma continua en este período." ultimo />
              ) : (
                <View>
                  {[...h.cortes].reverse().map((c, i, arr) => (
                    <Fila
                      key={`${c.desde}-${i}`}
                      icono="cloud-offline"
                      color={c.inicio ? undefined : 'alerta'}
                      titulo={c.inicio ? `Sin registros antes de ${hm(c.hasta)}` : `Sin datos · ${duracionTexto(c.hasta - c.desde)}`}
                      detalle={c.enCurso ? `Desde ${dmhm(c.desde)} · sigue sin enviar` : c.inicio ? 'Al inicio del período' : `${dmhm(c.desde)} → ${dmhm(c.hasta)}`}
                      ultimo={i === arr.length - 1 && h.invalidas === 0}
                    />
                  ))}
                  {h.invalidas > 0 && <Fila icono="help-circle" color="precaucion" titulo={`${h.invalidas} lectura(s) inválida(s)`} detalle="El sensor respondió, pero sin una temperatura válida." ultimo />}
                </View>
              )}
            </Seccion>
          </Aparecer>

          <Aparecer i={6}>
            <Boton titulo="Ver todas las lecturas" icono="list" variante="texto" onPress={() => router.push('/historial-completo')} />
          </Aparecer>
        </View>
      )}

      <Seccion titulo="Alertas">
        {alertas.length === 0 ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 }}>
            <Ionicons name="shield-checkmark" size={26} color={t.ok} />
            <T v="cuerpo" c="sub" style={{ flex: 1 }}>Todo en orden: no hay alertas registradas.</T>
          </View>
        ) : (
          alertas.map((a, i) => <AlertaFila key={a.id} a={a} onReconocer={reconocer} ultimo={i === alertas.length - 1} />)
        )}
      </Seccion>
      <Divisor style={{ opacity: 0 }} />
    </Pantalla>
  );
}
