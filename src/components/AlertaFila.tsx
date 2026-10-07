import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { AlertaServidor } from '../lib/api';
import { hace } from '../lib/formato';
import { F, useTema } from '../lib/theme';
import { Punto, T } from './ui';

const TITULO: Record<AlertaServidor['type'], string> = {
  OUT_OF_RANGE: 'Fuera de rango',
  RAPID_CHANGE: 'Cambio brusco',
  SENSOR_OFFLINE: 'Sensor sin datos',
  INVALID_READING: 'Lectura inválida',
};
const ESTADO = { ACTIVE: 'Sin atender', ACKNOWLEDGED: 'Vista', RESOLVED: 'Resuelta' } as const;

// Una alerta como linea de una cronologia: franja de color, texto y hora. Sin recuadro.
export function AlertaFila({ a, onReconocer, ultimo }: { a: AlertaServidor; onReconocer?: (id: number) => void; ultimo?: boolean }) {
  const t = useTema();
  const resuelta = a.status === 'RESOLVED';
  const nivel = a.severity === 'CRITICAL' ? 'alerta' : 'precaucion';
  const color = resuelta ? t.sub : t[nivel];
  return (
    <View style={{ flexDirection: 'row', gap: 14, paddingVertical: 16, borderBottomWidth: ultimo ? 0 : StyleSheet.hairlineWidth, borderBottomColor: t.borde, opacity: resuelta ? 0.7 : 1 }}>
      <View style={{ width: 4, borderRadius: 2, backgroundColor: color }} />
      <View style={{ flex: 1, gap: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {a.status === 'ACTIVE' && <Punto color={color} pulso />}
          <Text style={{ fontFamily: F.bold, fontSize: 16, color, flex: 1 }}>
            {a.severity === 'CRITICAL' && !resuelta ? 'Crítica · ' : ''}
            {TITULO[a.type]}
          </Text>
          <T v="chico" c="sub">{ESTADO[a.status]}</T>
        </View>
        <T v="cuerpo" c="sub">{a.message}</T>
        <T v="chico" c="sub">{hace(a.startedAt)}</T>
        {a.status === 'ACTIVE' && onReconocer && (
          <Pressable onPress={() => onReconocer(a.id)} hitSlop={10} style={{ alignSelf: 'flex-start', marginTop: 6, borderBottomWidth: 2, borderBottomColor: t.primario }}>
            <Text style={{ fontFamily: F.bold, fontSize: 14, color: t.texto }}>Marcar como vista</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}
