import { FlatList, Text, View } from 'react-native';
import { AlertaCard } from '../../components/AlertaCard';
import { Card, s } from '../../components/ui';
import { Grafico } from '../../components/Grafico';
import { useVacty } from '../../lib/estado';

export default function Historial() {
  const { perfil, historial, alertas, reconocer } = useVacty();
  if (!perfil) return null;
  const temps = historial.map((h) => h.temperatura);
  const min = temps.length ? Math.min(...temps) : null;
  const max = temps.length ? Math.max(...temps) : null;

  return (
    <FlatList
      contentContainerStyle={{ padding: 16, gap: 12 }}
      data={alertas}
      keyExtractor={(a) => String(a.id)}
      ListHeaderComponent={
        <View style={{ gap: 12 }}>
          <Card>
            <Text style={[s.sub, { marginBottom: 8 }]}>Registro automático ({historial.length} lecturas)</Text>
            <Grafico valores={temps.slice(-300)} min={perfil.min} max={perfil.max} alto={200} />
            <Text style={[s.sub, { marginTop: 8 }]}>
              Mínima {min?.toFixed(1) ?? '--'} °C · Máxima {max?.toFixed(1) ?? '--'} °C
            </Text>
          </Card>
          <Text style={s.titulo}>Alertas del servidor</Text>
          {alertas.length === 0 && <Text style={s.sub}>Sin alertas registradas.</Text>}
        </View>
      }
      renderItem={({ item }) => <AlertaCard a={item} onReconocer={reconocer} />}
    />
  );
}
