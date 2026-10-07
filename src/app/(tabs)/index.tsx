import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { AlertaFila } from '../../components/AlertaFila';
import { Grafico } from '../../components/Grafico';
import { Aparecer, Boton, Divisor, Fila, Pantalla, Punto, Seccion, Skeleton, T } from '../../components/ui';
import { Vial } from '../../components/Vial';
import { useSuave } from '../../lib/anim';
import { estadoDe, tendencia } from '../../lib/evaluar';
import { useVacty } from '../../lib/estado';
import { hace } from '../../lib/formato';
import { detectarCortes } from '../../lib/historial';
import { F, useTema } from '../../lib/theme';

const ICONO = { ok: 'checkmark-circle', precaucion: 'warning', alerta: 'alert-circle' } as const;
const TEXTO = { ok: 'En rango', precaucion: 'Cerca del límite', alerta: 'Fuera de rango' } as const;
const VENTANA_MS = 5 * 60_000;

export default function Monitor() {
  const t = useTema();
  const { perfil, termo, termos, lectura, servidorConectado, sensorActivo, estado, causa, historial, lotes, alertas, reconocer } = useVacty();
  const temp = useSuave(lectura ? lectura.temperatura : 0, 700);
  if (!perfil || !termo) return null;

  const abiertas = alertas.filter((a) => a.contenedor === termo.contenedor && a.status !== 'RESOLVED');
  const otrasAbiertas = alertas.filter((a) => a.contenedor !== termo.contenedor && a.status === 'ACTIVE').length;
  const alertaTemprana = estado !== 'alerta' ? tendencia(historial, perfil) : null;
  const porVencer = lotes.filter((l) => estadoDe(l) === 'porVencer').length;
  const vencidos = lotes.filter((l) => estadoDe(l) === 'vencido').length;
  const hayHumedad = lectura && !Number.isNaN(lectura.humedad);
  const color = t[estado];

  const hasta = Date.now();
  const reciente = historial.filter((h) => h.ts >= hasta - VENTANA_MS).map((h) => ({ ts: h.ts, v: h.temperatura }));
  // El registro local solo se llena con la app abierta: la ventana empieza en la primera lectura que tenemos,
  // para no confundir "la app no estaba grabando" con "el sensor no envio".
  const desde = reciente.length ? Math.max(hasta - VENTANA_MS, reciente[0].ts - 4000) : hasta - VENTANA_MS;
  const cortes = detectarCortes(reciente.map((p) => ({ ts: p.ts, temperatura: p.v, humedad: null })), desde, hasta, 20_000);

  const conexion = sensorActivo ? { txt: 'En vivo', c: t.ok, pulso: true } : servidorConectado ? { txt: 'Sensor sin datos', c: t.precaucion, pulso: false } : { txt: 'Sin conexión', c: t.alerta, pulso: false };

  return (
    <Pantalla ambiente={estado} sinTitulo>
      <Aparecer>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ gap: 2, flex: 1 }}>
            <T v="etiqueta" c="sub">Termo {termo.contenedor}</T>
            <T v="titulo">{perfil.nombre}</T>
            <T v="chico" c="sub">{perfil.min}–{perfil.max} °C · {perfil.nota}</T>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 4 }}>
            <Punto color={conexion.c} pulso={conexion.pulso} />
            <T v="chico" c="sub">{conexion.txt}</T>
          </View>
        </View>
      </Aparecer>

      <Aparecer i={1}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Vial valor={lectura ? lectura.temperatura : null} min={perfil.min} max={perfil.max} estado={estado} ancho={176} />
          <View style={{ flex: 1, gap: 6, paddingLeft: 4 }}>
            <T v="etiqueta" c="sub">Temperatura</T>
            {lectura ? (
              <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                <Text adjustsFontSizeToFit numberOfLines={1} style={{ fontFamily: F.xbold, fontSize: 60, lineHeight: 64, letterSpacing: -2.5, color: t.texto, flexShrink: 1 }}>
                  {temp.toFixed(1)}
                </Text>
                <Text style={{ fontFamily: F.bold, fontSize: 20, marginTop: 6, color: t.sub }}>°C</Text>
              </View>
            ) : (
              <Skeleton w={130} h={56} r={14} />
            )}
            {lectura ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name={ICONO[estado]} size={20} color={color} />
                <Text style={{ fontFamily: F.bold, fontSize: 17, color }}>{TEXTO[estado]}</Text>
              </View>
            ) : (
              <View style={{ gap: 2 }}>
                <T v="cuerpo" c="sub">{servidorConectado ? 'Esperando al sensor…' : 'Conectando…'}</T>
                {termo.temperatura != null && termo.lastReadingAt && (
                  <T v="chico" c="sub">Última: {termo.temperatura.toFixed(1)} °C, {hace(termo.lastReadingAt)}</T>
                )}
              </View>
            )}
            {lectura && estado !== 'ok' && causa && (
              <T v="chico" c="sub">{causa === 'frio' ? 'Riesgo de congelación' : 'Riesgo por calor'}</T>
            )}
            <Divisor style={{ marginVertical: 8 }} />
            <View style={{ flexDirection: 'row', gap: 18 }}>
              <View>
                <T v="etiqueta" c="sub">Humedad</T>
                {lectura ? <T v="titulo">{hayHumedad ? `${lectura.humedad.toFixed(0)}%` : '--'}</T> : <Skeleton w={44} h={22} r={6} style={{ marginTop: 4 }} />}
              </View>
              <View>
                <T v="etiqueta" c="sub">Lectura</T>
                {lectura ? <T v="titulo">{hace(lectura.ts).replace('hace ', '')}</T> : <Skeleton w={44} h={22} r={6} style={{ marginTop: 4 }} />}
              </View>
            </View>
          </View>
        </View>
      </Aparecer>

      {otrasAbiertas > 0 && (
        <Aparecer i={2}>
          <Fila icono="alert-circle" color="alerta" titulo={`${otrasAbiertas} alerta(s) en tus otros termos`} detalle="Toca para cambiar de termo" onPress={() => router.push('/termos')} ultimo />
        </Aparecer>
      )}

      {abiertas.length > 0 && (
        <Aparecer i={2}>
          <Seccion titulo={abiertas.length === 1 ? 'Una alerta abierta' : `${abiertas.length} alertas abiertas`}>
            {abiertas.map((a, i) => (
              <AlertaFila key={a.id} a={a} onReconocer={reconocer} ultimo={i === abiertas.length - 1} />
            ))}
          </Seccion>
        </Aparecer>
      )}

      {alertaTemprana && (
        <Aparecer i={2}>
          <View style={{ flexDirection: 'row', gap: 14 }}>
            <View style={{ width: 4, borderRadius: 2, backgroundColor: t.precaucion }} />
            <View style={{ flex: 1, gap: 2 }}>
              <T v="subtitulo" style={{ color: t.precaucion }}>
                Alerta temprana · {alertaTemprana.causa === 'frio' ? 'baja' : 'sube'} {Math.abs(alertaTemprana.pendiente).toFixed(1)} °C/min
              </T>
              <T v="cuerpo" c="sub">
                Podría salir de rango en ~{Math.max(1, Math.round(alertaTemprana.minutosAlLimite))} min.{' '}
                {alertaTemprana.causa === 'frio' ? 'Revisa que los paquetes fríos no toquen las vacunas.' : 'Protege el termo del calor.'}
              </T>
            </View>
          </View>
        </Aparecer>
      )}

      <Aparecer i={3}>
        <Seccion titulo="Últimos 5 minutos">
          {reciente.length > 1 ? (
            <Grafico puntos={reciente} min={perfil.min} max={perfil.max} desde={desde} hasta={hasta} cortes={cortes} alto={150} />
          ) : (
            <Skeleton w="100%" h={150} r={16} />
          )}
        </Seccion>
      </Aparecer>

      {(porVencer > 0 || vencidos > 0) && (
        <Aparecer i={4}>
          <Fila
            icono="medkit"
            color={vencidos > 0 ? 'alerta' : 'precaucion'}
            titulo={vencidos > 0 ? `${vencidos} lote(s) vencido(s)` : `${porVencer} lote(s) por vencer`}
            detalle={vencidos > 0 && porVencer > 0 ? `y ${porVencer} por vencer` : 'Toca para revisarlos'}
            onPress={() => router.push('/lotes')}
            ultimo
          />
        </Aparecer>
      )}

      <Aparecer i={5}>
        <Boton titulo={termos.length > 1 ? 'Cambiar de termo' : 'Mis termos'} icono="swap-horizontal" variante="texto" onPress={() => router.push('/termos')} />
      </Aparecer>
    </Pantalla>
  );
}
