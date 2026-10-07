import { useEffect, useState } from 'react';
import { Alert, AppState, Platform, Switch, View } from 'react-native';
import { Aparecer, Boton, Fila, Pantalla, Punto, Seccion, T } from '../../components/ui';
import { useVacty } from '../../lib/estado';
import { abrirAjustesBateria, bateriaOptimizada } from '../../lib/monitor';
import { useTema } from '../../lib/theme';

function Estado({ color, texto }: { color: string; texto: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Punto color={color} />
      <T v="chico" c="sub">{texto}</T>
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
      <Aparecer i={1}>
        <Seccion titulo="Conexión">
          <T v="chico" c="sub">{url}</T>
          <Fila icono="server" titulo="Servidor" derecha={<Estado color={servidorConectado ? t.ok : t.alerta} texto={servidorConectado ? 'Conectado' : 'Sin conexión'} />} />
          <Fila icono="pulse" titulo="Sensor" derecha={<Estado color={sensorActivo ? t.ok : t.precaucion} texto={sensorActivo ? 'Enviando' : 'Sin lecturas'} />} />
          <Fila
            icono="medical"
            titulo="Rango de la vacuna"
            ultimo
            derecha={<Estado color={perfilSync === 'ok' ? t.ok : perfilSync === 'error' ? t.alerta : t.precaucion} texto={perfilSync === 'ok' ? 'Sincronizado' : perfilSync === 'error' ? 'Error' : 'Sincronizando'} />}
          />
        </Seccion>
      </Aparecer>

      <Aparecer i={2}>
        <Seccion titulo="Alertas en segundo plano">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 8 }}>
            <View style={{ flex: 1, gap: 2 }}>
              <T v="subtitulo">Vigilar con la app cerrada</T>
              <T v="chico" style={{ color: colorMonitor }}>{textoMonitor}</T>
            </View>
            <Switch value={monitoreo} onValueChange={cambiarMonitoreo} trackColor={{ true: t.primario, false: t.borde }} thumbColor={monitoreo ? t.sobrePrimario : t.sub} />
          </View>
          <T v="chico" c="sub">Mantiene una notificación fija mientras vigila. Se detiene al cerrar sesión.</T>
          {bateria && monitoreo && (
            <View style={{ gap: 12, marginTop: 10 }}>
              <T v="cuerpo" style={{ color: t.precaucion }}>El ahorro de batería puede pausar la vigilancia con el celular quieto. Desactívalo para VacTy.</T>
              <Boton titulo="Abrir ajustes de batería" icono="battery-charging" variante="oscuro" onPress={() => abrirAjustesBateria()} />
            </View>
          )}
        </Seccion>
      </Aparecer>

      <Aparecer i={3}>
        <Seccion titulo="Cuenta y datos">
          <View style={{ gap: 12, marginTop: 6 }}>
            <Boton
              titulo="Borrar historial local"
              icono="trash"
              variante="texto"
              onPress={() => Alert.alert('Borrar historial', 'Se eliminará el registro de temperaturas guardado en este celular.', [{ text: 'Cancelar' }, { text: 'Borrar', style: 'destructive', onPress: limpiarHistorial }])}
            />
            <Boton titulo="Cerrar sesión" icono="log-out" variante="peligro" onPress={salir} />
          </View>
        </Seccion>
      </Aparecer>
    </Pantalla>
  );
}
