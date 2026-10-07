import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Boton, Card, Chip, s } from '../../components/ui';
import { diasParaVencer, estadoLote, fechaValida, type EstadoLote } from '../../lib/evaluar';
import { useVacty } from '../../lib/estado';
import { C } from '../../lib/theme';
import { PERFILES, perfilPorId } from '../../lib/vacunas';

const SECCIONES: { clave: EstadoLote; titulo: string; color: string }[] = [
  { clave: 'vencido', titulo: 'Vencidos (no usar)', color: C.alerta },
  { clave: 'porVencer', titulo: 'Por vencer (30 días o menos)', color: C.precaucion },
  { clave: 'vigente', titulo: 'Vigentes', color: C.ok },
];

export default function Lotes() {
  const { lotes, agregarLote, perfil } = useVacty();
  const [abierto, setAbierto] = useState(false);
  const [vacunaId, setVacunaId] = useState(perfil?.id ?? PERFILES[0].id);
  const [codigo, setCodigo] = useState('');
  const [venc, setVenc] = useState('');
  const error = venc && !fechaValida(venc) ? 'Fecha inválida. Usa AAAA-MM-DD' : '';

  const guardar = () => {
    if (!codigo.trim() || !fechaValida(venc)) return;
    agregarLote({ vacunaId, codigo: codigo.trim(), vencimiento: venc });
    setCodigo('');
    setVenc('');
    setAbierto(false);
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} keyboardShouldPersistTaps="handled">
      {abierto ? (
        <Card style={{ gap: 10 }}>
          <Text style={s.titulo}>Nuevo lote</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {PERFILES.map((p) => (
              <Chip key={p.id} texto={p.nombre} activo={vacunaId === p.id} onPress={() => setVacunaId(p.id)} />
            ))}
          </View>
          <TextInput placeholder="Código de lote" value={codigo} onChangeText={setCodigo} autoCapitalize="characters" style={entrada} />
          <TextInput placeholder="Vencimiento (AAAA-MM-DD)" value={venc} onChangeText={setVenc} keyboardType="numbers-and-punctuation" style={entrada} />
          {!!error && <Text style={{ color: C.alerta }}>{error}</Text>}
          <Boton titulo="Guardar lote" onPress={guardar} deshabilitado={!codigo.trim() || !fechaValida(venc)} />
          <Boton titulo="Cancelar" color={C.sub} onPress={() => setAbierto(false)} />
        </Card>
      ) : (
        <Boton titulo="+ Agregar lote" onPress={() => setAbierto(true)} />
      )}

      {lotes.length === 0 && <Text style={s.sub}>Aún no hay lotes. Agrega los lotes que llevas en el termo.</Text>}

      {SECCIONES.map(({ clave, titulo, color }) => {
        const items = lotes.filter((l) => estadoLote(l.vencimiento) === clave).sort((a, b) => a.vencimiento.localeCompare(b.vencimiento));
        if (!items.length) return null;
        return (
          <View key={clave} style={{ gap: 8 }}>
            <Text style={{ fontWeight: '800', color }}>{titulo}</Text>
            {items.map((l) => {
              const d = diasParaVencer(l.vencimiento);
              return (
                <Pressable key={l.id} onPress={() => router.push(`/lote/${l.id}`)}>
                  <Card style={{ borderColor: color }}>
                    <Text style={{ fontWeight: '700', color: C.texto }}>
                      {perfilPorId(l.vacunaId)?.nombre} · {l.codigo}
                    </Text>
                    <Text style={s.sub}>
                      Vence {l.vencimiento} ({d < 0 ? `hace ${-d} días` : d === 0 ? 'hoy' : `en ${d} días`})
                      {l.vvm ? ` · VVM: ${l.vvm}` : ''}
                    </Text>
                  </Card>
                </Pressable>
              );
            })}
          </View>
        );
      })}
    </ScrollView>
  );
}

const entrada = { borderWidth: 1, borderColor: C.borde, borderRadius: 10, padding: 12, color: C.texto } as const;
