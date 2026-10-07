import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { View } from 'react-native';
import { Card, Pantalla, T } from '../components/ui';
import { useVacty } from '../lib/estado';
import { useTema } from '../lib/theme';
import { PERFILES } from '../lib/vacunas';

export default function Seleccion() {
  const t = useTema();
  const { perfil, elegirVacuna } = useVacty();
  return (
    <Pantalla titulo="¿Qué vacuna lleva el termo?" subtitulo="Define el rango sano y cuándo se activan las alertas." atras={!!perfil}>
      {PERFILES.map((p) => {
        const activo = perfil?.id === p.id;
        return (
          <Card
            key={p.id}
            onPress={() => {
              elegirVacuna(p.id);
              router.replace('/');
            }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 2, borderColor: activo ? t.primario : t.borde }}
          >
            <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: t.primario, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="medical" size={24} color={t.sobrePrimario} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <T v="subtitulo">{p.nombre}</T>
              <T v="chico" c="sub">{p.nota}</T>
              <T v="chico" style={{ marginTop: 2 }}>{p.min} a {p.max} °C</T>
            </View>
            {activo && <Ionicons name="checkmark-circle" size={26} color={t.ok} />}
          </Card>
        );
      })}
      <T v="chico" c="sub">Perfiles de ejemplo: los rangos finales deben validarse con la norma técnica (NTS 136).</T>
    </Pantalla>
  );
}
