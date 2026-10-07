import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';
import { Aparecer, Boton, Pantalla, Seccion, T, Vacio } from '../../components/ui';
import { diasParaVencer, estadoLote } from '../../lib/evaluar';
import { useVacty } from '../../lib/estado';
import { F, useTema } from '../../lib/theme';
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
  const vencido = estado === 'vencido';
  const descartar = () => {
    quitarLote(lote.id);
    router.back();
  };
  const color = vencido ? t.alerta : estado === 'porVencer' ? t.precaucion : t.ok;

  return (
    <Pantalla titulo={perfilPorId(lote.vacunaId)?.nombre ?? 'Lote'} subtitulo={`Lote ${lote.codigo} · vence ${lote.vencimiento}`} atras>
      <Aparecer i={1}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10 }}>
          <Text style={{ fontFamily: F.xbold, fontSize: 84, lineHeight: 88, letterSpacing: -3, color }}>{Math.abs(dias)}</Text>
          <Text style={{ fontFamily: F.bold, fontSize: 18, color: t.sub, paddingBottom: 12 }}>{vencido ? 'días vencido' : dias === 0 ? 'vence hoy' : 'días para vencer'}</Text>
        </View>
      </Aparecer>

      {vencido ? (
        <Aparecer i={2}>
          <View style={{ flexDirection: 'row', gap: 14 }}>
            <View style={{ width: 4, borderRadius: 2, backgroundColor: t.alerta }} />
            <View style={{ flex: 1, gap: 6 }}>
              <T v="titulo" c="alerta">Uso bloqueado</T>
              <T v="cuerpo" c="sub">Este lote está vencido: no lo apliques. Descártalo según el protocolo.</T>
            </View>
          </View>
          <View style={{ height: 18 }} />
          <Boton titulo="Marcar como descartado" icono="trash" variante="peligro" onPress={descartar} />
        </Aparecer>
      ) : (
        <>
          <Aparecer i={2}>
            <Seccion titulo="1 · Vencimiento">
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Ionicons name={estado === 'porVencer' ? 'hourglass' : 'checkmark-circle'} size={26} color={color} />
                <T v="cuerpo" style={{ flex: 1 }}>{estado === 'porVencer' ? 'Vigente, pero vence pronto: úsalo primero.' : 'Vigente, sin riesgo de vencimiento próximo.'}</T>
              </View>
            </Seccion>
          </Aparecer>

          <Aparecer i={3}>
            <Seccion titulo="2 · Revisa el VVM del frasco">
              <T v="cuerpo" c="sub">Si el cuadrado interior es igual o más oscuro que el círculo, la vacuna no se usa.</T>
              <View style={{ height: 8 }} />
              <View style={{ gap: 12 }}>
                <Boton titulo="Cuadrado más claro: utilizable" icono="checkmark-circle" onPress={() => actualizarLote(lote.id, { vvm: 'utilizable' })} />
                <Boton titulo="Igual o más oscuro: descartar" icono="close-circle" variante="oscuro" onPress={() => actualizarLote(lote.id, { vvm: 'descartar' })} />
              </View>
            </Seccion>
          </Aparecer>

          {lote.vvm === 'utilizable' && (
            <Aparecer>
              <View style={{ flexDirection: 'row', gap: 14 }}>
                <View style={{ width: 4, borderRadius: 2, backgroundColor: t.ok }} />
                <T v="titulo" c="ok" style={{ flex: 1 }}>Verificado: puedes aplicar este lote</T>
              </View>
            </Aparecer>
          )}
          {lote.vvm === 'descartar' && (
            <Aparecer>
              <View style={{ flexDirection: 'row', gap: 14 }}>
                <View style={{ width: 4, borderRadius: 2, backgroundColor: t.alerta }} />
                <View style={{ flex: 1, gap: 12 }}>
                  <T v="titulo" c="alerta">VVM no utilizable: no aplicar</T>
                  <Boton titulo="Marcar como descartado" icono="trash" variante="peligro" onPress={descartar} />
                </View>
              </View>
            </Aparecer>
          )}
        </>
      )}
    </Pantalla>
  );
}
