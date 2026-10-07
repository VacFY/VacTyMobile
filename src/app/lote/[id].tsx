import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView, Text } from 'react-native';
import { Boton, Card, s } from '../../components/ui';
import { diasParaVencer, estadoLote } from '../../lib/evaluar';
import { useVacty } from '../../lib/estado';
import { C } from '../../lib/theme';
import { perfilPorId } from '../../lib/vacunas';

export default function VerificarLote() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { lotes, actualizarLote, quitarLote } = useVacty();
  const lote = lotes.find((l) => l.id === id);
  if (!lote) return <Text style={{ padding: 16 }}>Lote no encontrado.</Text>;

  const estado = estadoLote(lote.vencimiento);
  const vencido = estado === 'vencido';
  const descartar = () => {
    quitarLote(lote.id);
    router.back();
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Card>
        <Text style={s.titulo}>{perfilPorId(lote.vacunaId)?.nombre}</Text>
        <Text style={s.sub}>Lote {lote.codigo} · vence {lote.vencimiento}</Text>
      </Card>

      {vencido ? (
        <Card style={{ borderColor: C.alerta, gap: 10 }}>
          <Text style={{ color: C.alerta, fontWeight: '800', fontSize: 18 }}>LOTE VENCIDO: uso bloqueado</Text>
          <Text style={s.sub}>Venció hace {-diasParaVencer(lote.vencimiento)} días. No lo apliques; descártalo según el protocolo.</Text>
          <Boton titulo="Marcar como descartado" color={C.alerta} onPress={descartar} />
        </Card>
      ) : (
        <>
          <Card style={{ borderColor: estado === 'porVencer' ? C.precaucion : C.ok }}>
            <Text style={{ fontWeight: '700', color: C.texto }}>Vencimiento: vigente</Text>
            <Text style={s.sub}>{estado === 'porVencer' ? `Por vencer: quedan ${diasParaVencer(lote.vencimiento)} días. Úsalo primero.` : 'Sin riesgo de vencimiento próximo.'}</Text>
          </Card>

          <Card style={{ gap: 10 }}>
            <Text style={{ fontWeight: '700', color: C.texto }}>Revisa el VVM del frasco</Text>
            <Text style={s.sub}>Si el cuadrado interior es igual o más oscuro que el círculo, la vacuna no se usa.</Text>
            <Boton titulo="Cuadrado más claro: utilizable" color={C.ok} onPress={() => actualizarLote(lote.id, { vvm: 'utilizable' })} />
            <Boton titulo="Igual o más oscuro: descartar" color={C.alerta} onPress={() => actualizarLote(lote.id, { vvm: 'descartar' })} />
          </Card>

          {lote.vvm === 'utilizable' && <Text style={{ color: C.ok, fontWeight: '800', fontSize: 16 }}>Verificado: puedes aplicar este lote.</Text>}
          {lote.vvm === 'descartar' && (
            <Card style={{ borderColor: C.alerta, gap: 10 }}>
              <Text style={{ color: C.alerta, fontWeight: '800' }}>VVM no utilizable: no aplicar. Descartar el frasco.</Text>
              <Boton titulo="Marcar como descartado" color={C.alerta} onPress={descartar} />
            </Card>
          )}
        </>
      )}
      <Boton titulo="Volver" color={C.sub} onPress={() => router.back()} />
    </ScrollView>
  );
}
