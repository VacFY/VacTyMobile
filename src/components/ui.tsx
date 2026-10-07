import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { C } from '../lib/theme';

export const Card = ({ children, style }: { children: ReactNode; style?: ViewStyle }) => (
  <View style={[s.card, style]}>{children}</View>
);

export const Boton = ({ titulo, onPress, color = C.primario, deshabilitado }: { titulo: string; onPress: () => void; color?: string; deshabilitado?: boolean }) => (
  <Pressable onPress={onPress} disabled={deshabilitado} style={[s.boton, { backgroundColor: color, opacity: deshabilitado ? 0.4 : 1 }]}>
    <Text style={s.botonTxt}>{titulo}</Text>
  </Pressable>
);

export const Chip = ({ texto, activo, onPress }: { texto: string; activo: boolean; onPress: () => void }) => (
  <Pressable onPress={onPress} style={[s.chip, activo && { backgroundColor: C.primario, borderColor: C.primario }]}>
    <Text style={[s.chipTxt, activo && { color: '#fff' }]}>{texto}</Text>
  </Pressable>
);

export const s = StyleSheet.create({
  card: { backgroundColor: C.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: C.borde },
  boton: { paddingVertical: 14, paddingHorizontal: 18, borderRadius: 12, alignItems: 'center' },
  botonTxt: { color: '#fff', fontWeight: '700', fontSize: 16 },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1, borderColor: C.borde, backgroundColor: C.card },
  chipTxt: { color: C.texto, fontWeight: '600' },
  titulo: { fontSize: 22, fontWeight: '800', color: C.texto },
  sub: { color: C.sub, fontSize: 14 },
});
