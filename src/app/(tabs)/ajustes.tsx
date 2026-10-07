import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Alert, AppState, Platform, Switch, View } from 'react-native';
import { Boton, Card, Pantalla, Punto, Seccion, T, type IconName } from '../../components/ui';
import { useVacty } from '../../lib/estado';
import { abrirAjustesBateria, bateriaOptimizada } from '../../lib/monitor';
import { suave, useTema } from '../../lib/theme';

function Fila({ icono, titulo, valor, color }: { icono: IconName; titulo: string; valor: string; color: string }) {
  const t = useTema();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 }}>
      <Ionicons name={icono} size={20} color={t.sub} />
      <T v="cuerpo" style={{ flex: 1 }}>{titulo}</T>
      <Punto color={color} />
      <T v="chico" c="sub">{valor}</T>
    </View>
  );
}

export default function Ajustes() {
  const t = useTema();
  const { url, servidorConectado, sensorActivo, perfilSync, limpiarHistorial, salir, monitoreo, cambiarMonitoreo, estadoMonitor } = useVacty();
  const [bateria, setBateria] = useState(false);

  useEffect(() => {
    const revisar = () => bateriaOptimizada().then(setBateria);
    revisar();
    const sub = AppState.addEventListener('change', (e) => e === 'active' && revisar());
    return () => sub.remove();
  }, []);

  const textoMonitor = !monitoreo
    ? 'Desactivado'
    : {
        activo: 'Activo: recibirás alertas con la app cerrada',
        inactivo: 'Iniciando…',
        'sin-permiso': 'Falta el permiso de notificaciones: actívalo en los ajustes del celular',
        'no-soportado': Platform.OS === 'android' ? 'No disponible en Expo Go: instala el APK' : 'Solo disponible en Android',
      }[estadoMonitor];
  const colorMonitor = !monitoreo ? t.sub : { activo: t.ok, inactivo: t.sub, 'sin-permiso': t.alerta, 'no-soportado': t.precaucion }[estadoMonitor];

  return (
    <Pantalla titulo="Ajustes" subtitulo="Conexión y alertas en segundo plano">
      <Seccion titulo="Conexión">
        <Card style={{ gap: 4 }}>
          <T v="chico" c="sub" style={{ marginBottom: 6 }}>{url}</T>
          <Fila icono="server" titulo="Servidor" valor={servidorConectado ? 'Conectado' : 'Sin conexión'} color={servidorConectado ? t.ok : t.alerta} />
          <Fila icono="pulse" titulo="Sensor" valor={sensorActivo ? 'Enviando' : 'Sin lecturas'} color={sensorActivo ? t.ok : t.precaucion} />
          <Fila
            icono="medical"
            titulo="Rango de la vacuna"
            valor={perfilSync === 'ok' ? 'Sincronizado' : perfilSync === 'error' ? 'Error' : 'Sincronizando'}
            color={perfilSync === 'ok' ? t.ok : perfilSync === 'error' ? t.alerta : t.precaucion}
          />
        </Card>
      </Seccion>

      <Seccion titulo="Alertas en segundo plano">
        <Card style={{ gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <T v="subtitulo">Vigilar con la app cerrada</T>
              <T v="chico" style={{ color: colorMonitor }}>{textoMonitor}</T>
            </View>
            <Switch value={monitoreo} onValueChange={cambiarMonitoreo} trackColor={{ true: t.primario, false: t.borde }} thumbColor={monitoreo ? t.sobrePrimario : t.sub} />
          </View>
          <T v="chico" c="sub">Mantiene una notificación fija mientras vigila. Se detiene al cerrar sesión.</T>
          {bateria && monitoreo && (
            <View style={{ gap: 10, backgroundColor: suave(t, 'precaucion'), padding: 12, borderRadius: 14 }}>
              <T v="chico" style={{ color: t.precaucion }}>El ahorro de batería puede pausar la vigilancia con el celular quieto. Desactívalo para VacTy.</T>
              <Boton titulo="Abrir ajustes de batería" icono="battery-charging" variante="oscuro" onPress={() => abrirAjustesBateria()} />
            </View>
          )}
        </Card>
      </Seccion>

      <Seccion titulo="Cuenta y datos">
        <Boton
          titulo="Borrar historial local"
          icono="trash"
          variante="suave"
          onPress={() => Alert.alert('Borrar historial', 'Se eliminará el registro de temperaturas guardado en este celular.', [{ text: 'Cancelar' }, { text: 'Borrar', style: 'destructive', onPress: limpiarHistorial }])}
        />
        <Boton titulo="Cerrar sesión" icono="log-out" variante="peligro" onPress={salir} />
      </Seccion>
    </Pantalla>
  );
}
