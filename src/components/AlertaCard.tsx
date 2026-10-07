import { Text, View } from 'react-native';
import type { AlertaServidor } from '../lib/api';
import { C } from '../lib/theme';
import { Boton, Card, s } from './ui';

const TIPO: Record<AlertaServidor['type'], string> = {
  OUT_OF_RANGE: 'Fuera de rango',
  RAPID_CHANGE: 'Cambio brusco',
  SENSOR_OFFLINE: 'Sensor sin datos',
  INVALID_READING: 'Lectura inválida',
};
const ESTADO = { ACTIVE: 'Sin atender', ACKNOWLEDGED: 'Vista', RESOLVED: 'Resuelta' } as const;

export function AlertaCard({ a, onReconocer }: { a: AlertaServidor; onReconocer?: (id: number) => void }) {
  const resuelta = a.status === 'RESOLVED';
  const color = resuelta ? C.sub : a.severity === 'CRITICAL' ? C.alerta : C.precaucion;
  return (
    <Card style={{ borderColor: color, borderWidth: resuelta ? 1 : 2, gap: 6 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ fontWeight: '800', color }}>
          {a.severity === 'CRITICAL' ? 'CRÍTICA · ' : ''}
          {TIPO[a.type]}
        </Text>
        <Text style={[s.sub, { fontWeight: '700' }]}>{ESTADO[a.status]}</Text>
      </View>
      <Text style={{ color: C.texto }}>{a.message}</Text>
      <Text style={s.sub}>{new Date(a.startedAt).toLocaleString()}</Text>
      {a.status === 'ACTIVE' && onReconocer && <Boton titulo="Marcar como vista" color={color} onPress={() => onReconocer(a.id)} />}
    </Card>
  );
}
