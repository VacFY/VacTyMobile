import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';
import type { AlertaServidor } from '../lib/api';
import { hace } from '../lib/formato';
import { suave, useTema } from '../lib/theme';
import { Boton, Card, T, type IconName } from './ui';

const TIPO: Record<AlertaServidor['type'], { titulo: string; icono: IconName }> = {
  OUT_OF_RANGE: { titulo: 'Fuera de rango', icono: 'thermometer' },
  RAPID_CHANGE: { titulo: 'Cambio brusco', icono: 'trending-up' },
  SENSOR_OFFLINE: { titulo: 'Sensor sin datos', icono: 'cloud-offline' },
  INVALID_READING: { titulo: 'Lectura inválida', icono: 'help-circle' },
};
const ESTADO = { ACTIVE: 'Sin atender', ACKNOWLEDGED: 'Vista', RESOLVED: 'Resuelta' } as const;

export function AlertaCard({ a, onReconocer }: { a: AlertaServidor; onReconocer?: (id: number) => void }) {
  const t = useTema();
  const resuelta = a.status === 'RESOLVED';
  const nivel = a.severity === 'CRITICAL' ? 'alerta' : 'precaucion';
  const color = resuelta ? t.sub : t[nivel];
  const fondo = resuelta ? t.superficieAlt : suave(t, nivel);
  return (
    <Card style={{ gap: 12, borderColor: resuelta ? t.borde : color, borderWidth: resuelta ? 1 : 1.5 }}>
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
        <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: fondo, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name={TIPO[a.type].icono} size={22} color={color} />
        </View>
        <View style={{ flex: 1 }}>
          <T v="subtitulo" style={{ color }}>
            {a.severity === 'CRITICAL' && !resuelta ? 'Crítica · ' : ''}
            {TIPO[a.type].titulo}
          </T>
          <T v="chico" c="sub">
            {ESTADO[a.status]} · {hace(a.startedAt)}
          </T>
        </View>
      </View>
      <T v="cuerpo">{a.message}</T>
      {a.status === 'ACTIVE' && onReconocer && <Boton titulo="Marcar como vista" icono="checkmark" variante="oscuro" onPress={() => onReconocer(a.id)} />}
    </Card>
  );
}
