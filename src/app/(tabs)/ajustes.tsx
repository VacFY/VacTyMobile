import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, AppState, Platform, Switch, View } from 'react-native';
import { Aparecer, Boton, Fila, Pantalla, Punto, Seccion, T } from '../../components/ui';
import { useVacty } from '../../lib/estado';
import { abrirAjustesAlertas, abrirAjustesBateria, alertasSilenciadas, bateriaOptimizada, ESPERA_PRUEBA_S, probarAlarma } from '../../lib/monitor';
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
  const { url, servidorConectado, sensorActivo, perfil, termo, usuario, limpiarHistorial, salir, monitoreo, cambiarMonitoreo, estadoMonitor } = useVacty();
  const [bateria, setBateria] = useState(false);
  const [silenciadas, setSilenciadas] = useState(false);

  // Se revisa otra vez al volver de los ajustes del celular. El canal de alertas existe desde que arranca el monitoreo.
  useEffect(() => {
    const revisar = () => {
      bateriaOptimizada().then(setBateria);
      alertasSilenciadas().then(setSilenciadas);
    };
    revisar();
    const sub = AppState.addEventListener('change', (e) => e === 'active' && revisar());
    return () => sub.remove();
  }, [estadoMonitor]);

  const probar = () => {
    probarAlarma();
    Alert.alert('Prueba de alarma', `Sonará en ${ESPERA_PRUEBA_S} segundos. Sal de la app o bloquea el celular para comprobar que suena y aparece en las notificaciones.`);
  };

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
            titulo={termo ? `Rango del termo ${termo.contenedor}` : 'Rango del termo'}
            detalle={perfil?.nota}
            ultimo
            derecha={<T v="subtitulo">{perfil ? `${perfil.min}–${perfil.max} °C` : '--'}</T>}
          />
        </Seccion>
      </Aparecer>

      <Aparecer i={1}>
        <Seccion titulo="Cuenta">
          <Fila
            icono="person-circle"
            titulo={usuario?.nombre ?? (usuario ? `DNI ${usuario.dni}` : 'Sin datos')}
            detalle={usuario ? `${usuario.rol === 'SUPERVISOR' ? 'Supervisor' : 'Enfermera'} · DNI ${usuario.dni}` : undefined}
          />
          <Fila icono="cube" titulo={usuario?.rol === 'SUPERVISOR' ? 'Termos' : 'Mis termos'} detalle="Vincular, cambiar o entregar" onPress={() => router.push('/termos')} ultimo />
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
          {monitoreo && estadoMonitor === 'activo' && (
            <View style={{ gap: 12, marginTop: 10 }}>
              {silenciadas && (
                <>
                  <T v="cuerpo" style={{ color: t.alerta }}>Las alertas de temperatura están silenciadas en este celular: no sonarán ni aparecerán arriba de la pantalla.</T>
                  <Boton titulo="Activar alertas de temperatura" icono="notifications" variante="peligro" onPress={() => abrirAjustesAlertas()} />
                </>
              )}
              <Boton titulo="Probar alarma" icono="alarm" variante="texto" onPress={probar} />
            </View>
          )}
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
