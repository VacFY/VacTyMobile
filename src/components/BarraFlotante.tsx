import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import type { Tabs } from 'expo-router';
import { useEffect, useRef, type ComponentProps } from 'react';
import { Animated, Easing, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { F, useTema } from '../lib/theme';
import type { IconName } from './ui';

type Props = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

const ICONOS: Record<string, { icono: string; titulo: string }> = {
  index: { icono: 'water', titulo: 'Monitor' },
  historial: { icono: 'pulse', titulo: 'Historial' },
  lotes: { icono: 'medkit', titulo: 'Lotes' },
  ajustes: { icono: 'options', titulo: 'Ajustes' },
};

function Item({ activo, nombre, onPress }: { activo: boolean; nombre: string; onPress: () => void }) {
  const t = useTema();
  const a = useRef(new Animated.Value(activo ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(a, { toValue: activo ? 1 : 0, duration: 380, easing: Easing.out(Easing.back(1.4)), useNativeDriver: false }).start();
  }, [activo, a]);
  const info = ICONOS[nombre] ?? { icono: 'ellipse', titulo: nombre };
  const reposo = t.esOscuro ? 'rgba(255,244,214,0.55)' : 'rgba(255,244,214,0.6)';
  return (
    <Pressable onPress={onPress} hitSlop={6}>
      <Animated.View style={{ height: 48, borderRadius: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, overflow: 'hidden', width: a.interpolate({ inputRange: [0, 1], outputRange: [48, 62 + info.titulo.length * 8.6] }), backgroundColor: a.interpolate({ inputRange: [0, 1], outputRange: ['rgba(255,222,89,0)', 'rgba(255,222,89,1)'] }) }}>
        <Ionicons name={(activo ? info.icono : `${info.icono}-outline`) as IconName} size={22} color={activo ? '#390f07' : reposo} />
        <Animated.Text numberOfLines={1} style={{ fontFamily: F.bold, fontSize: 14, color: '#390f07', opacity: a, width: a.interpolate({ inputRange: [0, 1], outputRange: [0, info.titulo.length * 8.6] }) }}>
          {info.titulo}
        </Animated.Text>
      </Animated.View>
    </Pressable>
  );
}

// Barra de navegacion flotante: la pestana activa se expande con su nombre.
export function BarraFlotante({ state, navigation }: Props) {
  const t = useTema();
  const insets = useSafeAreaInsets();
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: Math.max(insets.bottom, 12) + 4, alignItems: 'center' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, padding: 8, borderRadius: 40, backgroundColor: t.esOscuro ? '#2F130B' : '#390f07', shadowColor: '#000', shadowOpacity: 0.28, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 10 }}>
        {state.routes.map((r, i) => (
          <Item
            key={r.key}
            nombre={r.name}
            activo={state.index === i}
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              const ev = navigation.emit({ type: 'tabPress', target: r.key, canPreventDefault: true });
              if (state.index !== i && !ev.defaultPrevented) navigation.navigate(r.name, r.params);
            }}
          />
        ))}
      </View>
      <Text style={{ position: 'absolute', opacity: 0 }}>{''}</Text>
    </View>
  );
}
