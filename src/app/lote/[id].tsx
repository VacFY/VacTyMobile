import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { Boton, Card, Pantalla, T, Vacio } from '../../components/ui';
import { diasParaVencer, estadoLote } from '../../lib/evaluar';
import { useVacty } from '../../lib/estado';
import { suave, useTema } from '../../lib/theme';
import { perfilPorId } from '../../lib/vacunas';

export default function VerificarLote() {
  const t = useTema();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { lotes, actualizarLote, quitarLote } = useVacty();
  const lote = lotes.find((l) => l.id === id);

  if (!lote) {
    return (
      <Pantalla titulo="Lote" atras>
        <Vacio icono="search" titulo="Lote no encontrado" />
      </Pantalla>
    );
  }

  const estado = estadoLote(lote.vencimiento);
  const dias = diasParaVencer(lote.vencimiento);
  const descartar = () => {
    quitarLote(lote.id);
    router.back();
  };

  return (
    <Pantalla titulo={perfilPorId(lote.vacunaId)?.nombre ?? 'Lote'} subtitulo={`Lote ${lote.codigo} · vence ${lote.vencimiento}`} atras>
      {estado === 'vencido' ? (
        <Card style={{ gap: 12, backgroundColor: suave(t, 'alerta'), borderColor: t.alerta }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Ionicons name="close-circle" size={30} color={t.alerta} />
            <T v="titulo" style={{ color: t.alerta, flex: 1 }}>Lote vencido: uso bloqueado</T>
          </View>
          <T v="cuerpo">Venció hace {-dias} días. No lo apliques; descártalo según el protocolo.</T>
          <Boton titulo="Marcar como descartado" icono="trash" variante="peligro" onPress={descartar} />
        </Card>
      ) : (
        <>
          <Card style={{ flexDirection: 'row', gap: 12, alignItems: 'center', borderColor: estado === 'porVencer' ? t.precaucion : t.ok }}>
            <Ionicons name={estado === 'porVencer' ? 'hourglass' : 'checkmark-circle'} size={28} color={estado === 'porVencer' ? t.precaucion : t.ok} />
            <View style={{ flex: 1 }}>
              <T v="subtitulo">Vencimiento vigente</T>
              <T v="cuerpo" c="sub">{estado === 'porVencer' ? `Quedan ${dias} días: úsalo primero.` : 'Sin riesgo de vencimiento próximo.'}</T>
            </View>
          </Card>

          <Card style={{ gap: 12 }}>
            <T v="subtitulo">Revisa el VVM del frasco</T>
            <T v="cuerpo" c="sub">Si el cuadrado interior es igual o más oscuro que el círculo, la vacuna no se usa.</T>
            <Boton titulo="Cuadrado más claro: utilizable" icono="checkmark-circle" onPress={() => actualizarLote(lote.id, { vvm: 'utilizable' })} />
            <Boton titulo="Igual o más oscuro: descartar" icono="close-circle" variante="oscuro" onPress={() => actualizarLote(lote.id, { vvm: 'descartar' })} />
          </Card>

          {lote.vvm === 'utilizable' && (
            <Card style={{ backgroundColor: suave(t, 'ok'), borderColor: t.ok, flexDirection: 'row', gap: 10, alignItems: 'center' }}>
              <Ionicons name="shield-checkmark" size={26} color={t.ok} />
              <T v="subtitulo" style={{ color: t.ok, flex: 1 }}>Verificado: puedes aplicar este lote</T>
            </Card>
          )}
          {lote.vvm === 'descartar' && (
            <Card style={{ gap: 12, backgroundColor: suave(t, 'alerta'), borderColor: t.alerta }}>
              <T v="subtitulo" style={{ color: t.alerta }}>VVM no utilizable: no aplicar. Descarta el frasco.</T>
              <Boton titulo="Marcar como descartado" icono="trash" variante="peligro" onPress={descartar} />
            </Card>
          )}
        </>
      )}
    </Pantalla>
  );
}
