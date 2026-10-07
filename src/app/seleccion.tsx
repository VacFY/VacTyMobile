import { router } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, s } from '../components/ui';
import { useVacty } from '../lib/estado';
import { C } from '../lib/theme';
import { PERFILES } from '../lib/vacunas';

export default function Seleccion() {
  const { perfil, elegirVacuna } = useVacty();
  return (
    <SafeAreaView style={{ flex: 1 }} edges={['bottom', 'top']}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <Text style={s.titulo}>¿Qué vacuna lleva el termo?</Text>
        <Text style={s.sub}>El rango sano y las alertas dependen de la vacuna que elijas.</Text>
        {PERFILES.map((p) => (
          <Pressable
            key={p.id}
            onPress={() => {
              elegirVacuna(p.id);
              router.replace('/');
            }}
          >
            <Card style={perfil?.id === p.id ? { borderColor: C.primario, borderWidth: 2 } : undefined}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 17, fontWeight: '700', color: C.texto }}>{p.nombre}</Text>
                <Text style={{ color: C.primario, fontWeight: '700' }}>
                  {p.min} a {p.max} °C
                </Text>
              </View>
              <Text style={s.sub}>{p.nota}</Text>
            </Card>
          </Pressable>
        ))}
        <Text style={[s.sub, { fontSize: 12 }]}>Perfiles de ejemplo; los rangos finales deben validarse con la norma técnica.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}
