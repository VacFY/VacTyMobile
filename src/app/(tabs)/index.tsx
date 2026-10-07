import { Link, router } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import { AlertaCard } from '../../components/AlertaCard';
import { Boton, Card, s } from '../../components/ui';
import { Grafico } from '../../components/Grafico';
import { estadoLote, tendencia } from '../../lib/evaluar';
import { useVacty } from '../../lib/estado';
import { C, colorEstado } from '../../lib/theme';

const TXT = {
  ok: 'En rango',
  precaucion: 'Precaución',
  alerta: 'ALERTA: fuera de rango',
} as const;

export default function Monitor() {
  const { perfil, lectura, servidorConectado, sensorActivo, estado, causa, historial, lotes, alertas, reconocer } = useVacty();
  if (!perfil) return null;
  const color = colorEstado(estado);
  const abiertas = alertas.filter((a) => a.status !== 'RESOLVED');
  const porVencer = lotes.filter((l) => estadoLote(l.vencimiento) === 'porVencer').length;
  const vencidos = lotes.filter((l) => estadoLote(l.vencimiento) === 'vencido').length;
  const alertaTemprana = estado !== 'alerta' ? tendencia(historial, perfil) : null;
  const recientes = historial.slice(-60).map((h) => h.temperatura);
  const hora = lectura ? new Date(lectura.ts).toLocaleTimeString() : '--';

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Card style={{ backgroundColor: color, borderColor: color, alignItems: 'center' }}>
        <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>{TXT[estado]}</Text>
        <Text style={{ color: '#fff', fontSize: 72, fontWeight: '800' }}>{lectura ? lectura.temperatura.toFixed(1) : '--'}°C</Text>
        {estado !== 'ok' && causa && (
          <Text style={{ color: '#fff', fontWeight: '600', textAlign: 'center' }}>
            {causa === 'frio' ? 'Riesgo de congelación: retira los paquetes fríos y aísla las vacunas' : 'Riesgo por calor: protege el termo del sol y revisa los paquetes fríos'}
          </Text>
        )}
      </Card>

      {abiertas.map((a) => (
        <AlertaCard key={a.id} a={a} onReconocer={reconocer} />
      ))}

      {alertaTemprana && (
        <Card style={{ borderColor: C.precaucion, borderWidth: 2, backgroundColor: '#FFF6E5' }}>
          <Text style={{ fontWeight: '800', color: C.precaucion }}>
            Alerta temprana: {alertaTemprana.causa === 'frio' ? 'baja' : 'sube'} {Math.abs(alertaTemprana.pendiente).toFixed(1)} °C/min
          </Text>
          <Text style={{ color: C.texto }}>
            Podría salir de rango en ~{Math.max(1, Math.round(alertaTemprana.minutosAlLimite))} min.{' '}
            {alertaTemprana.causa === 'frio' ? 'Revisa que los paquetes fríos no estén tocando las vacunas.' : 'Protege el termo del calor y revisa los paquetes fríos.'}
          </Text>
        </Card>
      )}

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Card style={{ flex: 1 }}>
          <Text style={s.sub}>Humedad</Text>
          <Text style={{ fontSize: 26, fontWeight: '800', color: C.texto }}>{lectura && !Number.isNaN(lectura.humedad) ? `${lectura.humedad.toFixed(0)} %` : '--'}</Text>
        </Card>
        <Card style={{ flex: 1 }}>
          <Text style={s.sub}>Vacuna</Text>
          <Text style={{ fontSize: 18, fontWeight: '800', color: C.texto }}>{perfil.nombre}</Text>
          <Text style={s.sub}>
            {perfil.min} a {perfil.max} °C
          </Text>
        </Card>
      </View>

      <Card>
        <Text style={[s.sub, { marginBottom: 8 }]}>Últimas lecturas</Text>
        <Grafico valores={recientes} min={perfil.min} max={perfil.max} />
        <Text style={[s.sub, { marginTop: 8, color: sensorActivo ? C.ok : C.alerta }]}>
          {!servidorConectado
            ? `Sin conexión con el servidor · última lectura ${hora}`
            : sensorActivo
              ? `Sensor activo · última lectura ${hora}`
              : `Servidor conectado, pero el sensor no envía lecturas · última: ${hora}`}
        </Text>
      </Card>

      {(porVencer > 0 || vencidos > 0) && (
        <Link href="/lotes" asChild>
          <Card style={{ borderColor: C.precaucion }}>
            <Text style={{ fontWeight: '700', color: C.texto }}>
              {vencidos > 0 ? `${vencidos} lote(s) vencido(s)` : ''}
              {vencidos > 0 && porVencer > 0 ? ' · ' : ''}
              {porVencer > 0 ? `${porVencer} lote(s) por vencer (30 días o menos)` : ''}
            </Text>
            <Text style={s.sub}>Toca para ver los lotes</Text>
          </Card>
        </Link>
      )}

      <Boton titulo="Cambiar tipo de vacuna" color={C.sub} onPress={() => router.push('/seleccion')} />
    </ScrollView>
  );
}
