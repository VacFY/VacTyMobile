import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Aparecer, Pantalla, T, Toque } from '../components/ui';
import { useVacty } from '../lib/estado';
import { F, useTema } from '../lib/theme';
import { PERFILES } from '../lib/vacunas';

export default function Seleccion() {
  const t = useTema();
  const { perfil, elegirVacuna } = useVacty();
  return (
    <Pantalla titulo="¿Qué vacuna lleva el termo?" subtitulo="Define el rango sano y cuándo se activan las alertas." atras={!!perfil}>
      <View>
        {PERFILES.map((p, i) => {
          const activo = perfil?.id === p.id;
          return (
            <Aparecer key={p.id} i={i + 1}>
              <Toque
                onPress={() => {
                  elegirVacuna(p.id);
                  router.replace('/');
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 20, borderBottomWidth: i === PERFILES.length - 1 ? 0 : StyleSheet.hairlineWidth, borderBottomColor: t.borde }}>
                  <View style={{ width: 4, alignSelf: 'stretch', borderRadius: 2, backgroundColor: activo ? t.primario : 'transparent' }} />
                  <View style={{ flex: 1, gap: 3 }}>
                    <T v="titulo">{p.nombre}</T>
                    <T v="chico" c="sub">{p.nota}</T>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontFamily: F.xbold, fontSize: 26, letterSpacing: -1, color: t.texto }}>
                      {p.min < 0 ? `−${Math.abs(p.min)}` : p.min} – {p.max}
                      <Text style={{ fontFamily: F.bold, fontSize: 14, color: t.sub }}> °C</Text>
                    </Text>
                  </View>
                  {activo && <Ionicons name="checkmark-circle" size={24} color={t.ok} />}
                </View>
              </Toque>
            </Aparecer>
          );
        })}
      </View>
      <T v="chico" c="sub">Perfiles de ejemplo: los rangos finales deben validarse con la norma técnica (NTS 136).</T>
    </Pantalla>
  );
}
