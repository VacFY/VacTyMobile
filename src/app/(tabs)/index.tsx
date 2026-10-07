import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { View } from 'react-native';
import { AlertaCard } from '../../components/AlertaCard';
import { Gauge } from '../../components/Gauge';
import { Grafico } from '../../components/Grafico';
import { Boton, Card, Pantalla, Pill, Punto, Skeleton, T } from '../../components/ui';
import { estadoLote, tendencia } from '../../lib/evaluar';
import { useVacty } from '../../lib/estado';
import { hace, hora } from '../../lib/formato';
import { suave, useTema } from '../../lib/theme';

export default function Monitor() {
  const t = useTema();
  const { perfil, lectura, servidorConectado, sensorActivo, estado, causa, historial, lotes, alertas, reconocer } = useVacty();
  if (!perfil) return null;

  const abiertas = alertas.filter((a) => a.status !== 'RESOLVED');
  const alertaTemprana = estado !== 'alerta' ? tendencia(historial, perfil) : null;
  const recientes = historial.slice(-60).map((h) => h.temperatura);
  const porVencer = lotes.filter((l) => estadoLote(l.vencimiento) === 'porVencer').length;
  const vencidos = lotes.filter((l) => estadoLote(l.vencimiento) === 'vencido').length;
  const hayHumedad = lectura && !Number.isNaN(lectura.humedad);

  const conexion = sensorActivo
    ? { txt: 'En vivo', color: t.ok, pulso: true }
    : servidorConectado
      ? { txt: 'Sensor sin datos', color: t.precaucion, pulso: false }
      : { txt: 'Sin conexión', color: t.alerta, pulso: false };

  return (
    <Pantalla titulo="Monitor" subtitulo={`Termo 001 · ${perfil.nombre}`}>
      <View style={{ backgroundColor: t.hero, borderRadius: 28, padding: 20, alignItems: 'center', gap: 14, borderWidth: estado === 'alerta' ? 2 : 0, borderColor: t.alerta }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,244,214,0.1)', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999 }}>
            <Ionicons name="medical" size={14} color={t.primario} />
            <T v="chico" c="sobreHero">{perfil.nombre}</T>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Punto color={conexion.color} pulso={conexion.pulso} />
            <T v="chico" c="subHero">{conexion.txt}</T>
          </View>
        </View>

        {lectura ? <Gauge valor={lectura.temperatura} min={perfil.min} max={perfil.max} estado={estado} /> : <Skeleton w={210} h={210} r={105} />}
        {lectura ? <Pill estado={estado} sobreOscuro /> : <Skeleton w={130} h={32} r={16} />}

        {!lectura && (
          <T v="cuerpo" c="subHero" style={{ textAlign: 'center' }}>
            {servidorConectado ? 'Esperando lecturas del sensor…' : 'Conectando con el servidor…'}
          </T>
        )}
        {lectura && estado !== 'ok' && causa && (
          <T v="cuerpo" c="sobreHero" style={{ textAlign: 'center' }}>
            {causa === 'frio' ? 'Riesgo de congelación: retira los paquetes fríos y aísla las vacunas.' : 'Riesgo por calor: protege el termo del sol y revisa los paquetes fríos.'}
          </T>
        )}
      </View>

      {abiertas.map((a) => (
        <AlertaCard key={a.id} a={a} onReconocer={reconocer} />
      ))}

      {alertaTemprana && (
        <Card style={{ backgroundColor: suave(t, 'precaucion'), borderColor: t.precaucion, flexDirection: 'row', gap: 12 }}>
          <Ionicons name="trending-up" size={26} color={t.precaucion} />
          <View style={{ flex: 1, gap: 2 }}>
            <T v="subtitulo" style={{ color: t.precaucion }}>
              Alerta temprana: {alertaTemprana.causa === 'frio' ? 'baja' : 'sube'} {Math.abs(alertaTemprana.pendiente).toFixed(1)} °C/min
            </T>
            <T v="cuerpo">
              Podría salir de rango en ~{Math.max(1, Math.round(alertaTemprana.minutosAlLimite))} min.{' '}
              {alertaTemprana.causa === 'frio' ? 'Revisa que los paquetes fríos no toquen las vacunas.' : 'Protege el termo del calor.'}
            </T>
          </View>
        </Card>
      )}

      <View style={{ flexDirection: 'row', gap: 14 }}>
        <Card style={{ flex: 1, gap: 6 }}>
          <Ionicons name="water" size={20} color={t.sub} />
          <T v="etiqueta" c="sub">Humedad</T>
          {lectura ? <T v="titulo">{hayHumedad ? `${lectura.humedad.toFixed(0)} %` : '--'}</T> : <Skeleton w={70} h={24} r={8} />}
        </Card>
        <Card style={{ flex: 1, gap: 6 }}>
          <Ionicons name="time" size={20} color={t.sub} />
          <T v="etiqueta" c="sub">Última lectura</T>
          {lectura ? (
            <>
              <T v="titulo">{hora(lectura.ts)}</T>
              <T v="chico" c="sub">{hace(lectura.ts)}</T>
            </>
          ) : (
            <Skeleton w={90} h={24} r={8} />
          )}
        </Card>
      </View>

      <Card style={{ gap: 10 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <T v="subtitulo">Últimos minutos</T>
          <T v="chico" c="sub">{recientes.length} lecturas</T>
        </View>
        {recientes.length > 1 ? <Grafico valores={recientes} min={perfil.min} max={perfil.max} /> : <Skeleton w="100%" h={120} r={14} />}
      </Card>

      {(porVencer > 0 || vencidos > 0) && (
        <Card onPress={() => router.push('/lotes')} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, borderColor: vencidos > 0 ? t.alerta : t.precaucion }}>
          <Ionicons name="medkit" size={26} color={vencidos > 0 ? t.alerta : t.precaucion} />
          <View style={{ flex: 1 }}>
            <T v="subtitulo">
              {vencidos > 0 ? `${vencidos} lote(s) vencido(s)` : ''}
              {vencidos > 0 && porVencer > 0 ? ' · ' : ''}
              {porVencer > 0 ? `${porVencer} por vencer` : ''}
            </T>
            <T v="chico" c="sub">Toca para revisar los lotes</T>
          </View>
          <Ionicons name="chevron-forward" size={20} color={t.sub} />
        </Card>
      )}

      <Boton titulo="Cambiar tipo de vacuna" icono="swap-horizontal" variante="suave" onPress={() => router.push('/seleccion')} />
    </Pantalla>
  );
}
