import { useEffect, useState } from 'react';
import { Alert, AppState, Platform, ScrollView, Switch, Text, View } from 'react-native';
import { Boton, Card, s } from '../../components/ui';
import { useVacty } from '../../lib/estado';
import { abrirAjustesBateria, bateriaOptimizada } from '../../lib/monitor';
import { C } from '../../lib/theme';

export default function Ajustes() {
  const { url, servidorConectado, sensorActivo, perfilSync, limpiarHistorial, salir, monitoreo, cambiarMonitoreo, estadoMonitor } = useVacty();
  const [bateria, setBateria] = useState(false);
  useEffect(() => {
    const revisar = () => bateriaOptimizada().then(setBateria);
    revisar();
    const sub = AppState.addEventListener('change', (e) => e === 'active' && revisar());
    return () => sub.remove();
  }, []);
  const TXT_MONITOR = {
    activo: ['Activo: recibirás alertas con la app cerrada', C.ok],
    inactivo: ['Desactivado', C.sub],
    'sin-permiso': ['Falta el permiso de notificaciones: actívalo en los ajustes del celular', C.alerta],
    'no-soportado': [Platform.OS === 'android' ? 'No disponible en Expo Go: instala el APK' : 'Solo disponible en Android', C.precaucion],
  } as const;
  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Card style={{ gap: 6 }}>
        <Text style={s.titulo}>Conexión</Text>
        <Text style={s.sub}>{url}</Text>
        <Text style={{ color: servidorConectado ? C.ok : C.alerta, fontWeight: '600' }}>
          Servidor: {servidorConectado ? 'conectado' : 'sin conexión'}
        </Text>
        <Text style={{ color: sensorActivo ? C.ok : C.precaucion, fontWeight: '600' }}>
          Sensor: {sensorActivo ? 'enviando lecturas' : 'sin lecturas recientes'}
        </Text>
        <Text style={{ color: perfilSync === 'ok' ? C.ok : perfilSync === 'error' ? C.alerta : C.sub, fontWeight: '600' }}>
          Rango de la vacuna en el servidor: {perfilSync === 'ok' ? 'sincronizado' : perfilSync === 'error' ? 'error al sincronizar' : 'sincronizando…'}
        </Text>
      </Card>
      <Card style={{ gap: 8 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={s.titulo}>Alertas en segundo plano</Text>
          <Switch value={monitoreo} onValueChange={cambiarMonitoreo} trackColor={{ true: C.primario }} />
        </View>
        <Text style={{ color: TXT_MONITOR[estadoMonitor][1], fontWeight: '600' }}>{monitoreo ? TXT_MONITOR[estadoMonitor][0] : TXT_MONITOR.inactivo[0]}</Text>
        <Text style={s.sub}>Mantiene una notificación fija mientras vigila. Si cierras sesión se detiene.</Text>
        {bateria && monitoreo && (
          <>
            <Text style={{ color: C.precaucion, fontWeight: '600' }}>
              El ahorro de batería puede pausar la vigilancia con el celular quieto. Desactívalo para VacTy.
            </Text>
            <Boton titulo="Abrir ajustes de batería" color={C.precaucion} onPress={() => abrirAjustesBateria()} />
          </>
        )}
      </Card>
      <Boton
        titulo="Borrar historial local"
        color={C.sub}
        onPress={() => Alert.alert('Borrar historial', 'Se eliminará el registro de temperaturas guardado en este celular.', [{ text: 'Cancelar' }, { text: 'Borrar', style: 'destructive', onPress: limpiarHistorial }])}
      />
      <Boton titulo="Cerrar sesión" color={C.alerta} onPress={salir} />
    </ScrollView>
  );
}
