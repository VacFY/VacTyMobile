import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { Aparecer, Boton, Pantalla, Seccion, T, Vacio } from '../../components/ui';
import { diasParaVencer, estadoDe } from '../../lib/evaluar';
import { useVacty } from '../../lib/estado';
import { F, useTema } from '../../lib/theme';

export default function VerificarLote() {
  const t = useTema();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { lotes, vvm, marcarVvm, cerrarLoteId } = useVacty();
  const [error, setError] = useState('');
  const lote = lotes.find((l) => String(l.id) === id);

  if (!lote) {
    return (
      <Pantalla titulo="Lote" atras>
        <Vacio icono="search" titulo="Lote no encontrado" texto="Quizá ya se cerró desde otro equipo." />
      </Pantalla>
    );
  }

  const estado = estadoDe(lote);
  const dias = diasParaVencer(lote.expiryDate);
  const vencido = estado === 'vencido';
  const revisado = vvm[lote.id];
  const color = vencido ? t.alerta : estado === 'porVencer' ? t.precaucion : t.ok;

  const cerrar = (status: 'USED' | 'DISCARDED') => {
    const texto = status === 'USED' ? 'Se usaron todos los frascos de este lote.' : 'El lote se retira del termo y se registra como descartado.';
    Alert.alert(status === 'USED' ? 'Lote terminado' : 'Descartar lote', texto, [
      { text: 'Cancelar' },
      {
        text: status === 'USED' ? 'Terminado' : 'Descartar',
        style: status === 'USED' ? 'default' : 'destructive',
        onPress: async () => {
          const motivo = status === 'USED' ? 'Se terminó' : vencido ? 'Vencido' : revisado === 'descartar' ? 'VVM en descarte' : 'Descartado';
          const e = await cerrarLoteId(lote.id, status, motivo);
          if (e) setError(e);
          else router.back();
        },
      },
    ]);
  };

  return (
    <Pantalla titulo={lote.vaccine.name} subtitulo={`Lote ${lote.lotNumber} · vence ${lote.expiryDate} · ${lote.vials} frasco(s)`} atras>
      <Aparecer i={1}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10 }}>
          <Text style={{ fontFamily: F.xbold, fontSize: 84, lineHeight: 88, letterSpacing: -3, color }}>{Math.abs(dias)}</Text>
          <Text style={{ fontFamily: F.bold, fontSize: 18, color: t.sub, paddingBottom: 12 }}>{vencido ? 'días vencido' : dias === 0 ? 'vence hoy' : 'días para vencer'}</Text>
        </View>
      </Aparecer>

      {(lote.vaccine.careProfileLabel || lote.vaccine.careInstructions.length > 0) && (
        <Aparecer i={2}>
          <Seccion titulo={lote.vaccine.careProfileLabel ? `Cuidados · ${lote.vaccine.careProfileLabel}` : 'Cuidados'}>
            {lote.vaccine.careInstructions.map((c) => (
              <T key={c} v="chico" c="sub">• {c}</T>
            ))}
            {!lote.vaccine.verified && <T v="chico" c="sub" style={{ marginTop: 4 }}>Datos por verificar con la ficha técnica del fabricante.</T>}
          </Seccion>
        </Aparecer>
      )}

      {vencido ? (
        <Aparecer i={3}>
          <View style={{ flexDirection: 'row', gap: 14 }}>
            <View style={{ width: 4, borderRadius: 2, backgroundColor: t.alerta }} />
            <View style={{ flex: 1, gap: 6 }}>
              <T v="titulo" c="alerta">Uso bloqueado</T>
              <T v="cuerpo" c="sub">Este lote está vencido: no lo apliques. Retíralo del termo y regístralo como descartado.</T>
            </View>
          </View>
          <View style={{ height: 18 }} />
          <Boton titulo="Marcar como descartado" icono="trash" variante="peligro" onPress={() => cerrar('DISCARDED')} />
        </Aparecer>
      ) : (
        <>
          <Aparecer i={3}>
            <Seccion titulo="1 · Vencimiento">
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Ionicons name={estado === 'porVencer' ? 'hourglass' : 'checkmark-circle'} size={26} color={color} />
                <T v="cuerpo" style={{ flex: 1 }}>{estado === 'porVencer' ? 'Vigente, pero vence pronto: úsalo primero.' : 'Vigente, sin riesgo de vencimiento próximo.'}</T>
              </View>
            </Seccion>
          </Aparecer>

          <Aparecer i={4}>
            <Seccion titulo="2 · Revisa el VVM del frasco">
              <T v="cuerpo" c="sub">Si el cuadrado interior es igual o más oscuro que el círculo, la vacuna no se usa. Se guarda en este celular.</T>
              <View style={{ height: 8 }} />
              <View style={{ gap: 12 }}>
                <Boton titulo="Cuadrado más claro: utilizable" icono="checkmark-circle" onPress={() => marcarVvm(lote.id, 'utilizable')} />
                <Boton titulo="Igual o más oscuro: descartar" icono="close-circle" variante="oscuro" onPress={() => marcarVvm(lote.id, 'descartar')} />
              </View>
            </Seccion>
          </Aparecer>

          {revisado === 'utilizable' && (
            <Aparecer>
              <View style={{ flexDirection: 'row', gap: 14 }}>
                <View style={{ width: 4, borderRadius: 2, backgroundColor: t.ok }} />
                <T v="titulo" c="ok" style={{ flex: 1 }}>Verificado: puedes aplicar este lote</T>
              </View>
            </Aparecer>
          )}
          {revisado === 'descartar' && (
            <Aparecer>
              <View style={{ flexDirection: 'row', gap: 14 }}>
                <View style={{ width: 4, borderRadius: 2, backgroundColor: t.alerta }} />
                <View style={{ flex: 1, gap: 12 }}>
                  <T v="titulo" c="alerta">VVM no utilizable: no aplicar</T>
                  <Boton titulo="Marcar como descartado" icono="trash" variante="peligro" onPress={() => cerrar('DISCARDED')} />
                </View>
              </View>
            </Aparecer>
          )}

          {revisado !== 'descartar' && (
            <Aparecer i={5}>
              <View style={{ gap: 12 }}>
                <Boton titulo="Se terminó el lote" icono="checkmark-done" variante="texto" onPress={() => cerrar('USED')} />
                <Boton titulo="Descartar lote" icono="trash" variante="texto" onPress={() => cerrar('DISCARDED')} />
              </View>
            </Aparecer>
          )}
        </>
      )}
      {!!error && <T v="chico" c="alerta">{error}</T>}
    </Pantalla>
  );
}
