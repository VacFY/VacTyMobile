import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { View } from 'react-native';
import type { IconName } from '../../components/ui';
import { F, useTema } from '../../lib/theme';

const PESTANAS: { nombre: string; titulo: string; icono: string }[] = [
  { nombre: 'index', titulo: 'Monitor', icono: 'speedometer' },
  { nombre: 'historial', titulo: 'Historial', icono: 'time' },
  { nombre: 'lotes', titulo: 'Lotes', icono: 'medkit' },
  { nombre: 'ajustes', titulo: 'Ajustes', icono: 'settings' },
];

export default function TabsLayout() {
  const t = useTema();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: t.texto,
        tabBarInactiveTintColor: t.sub,
        tabBarLabelStyle: { fontFamily: F.semi, fontSize: 11 },
        tabBarStyle: { backgroundColor: t.superficie, borderTopColor: t.borde },
      }}
    >
      {PESTANAS.map((p) => (
        <Tabs.Screen
          key={p.nombre}
          name={p.nombre}
          options={{
            title: p.titulo,
            tabBarIcon: ({ focused, color }) => (
              <View style={{ width: 52, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: focused ? t.primario : 'transparent' }}>
                <Ionicons name={(focused ? p.icono : `${p.icono}-outline`) as IconName} size={20} color={focused ? t.sobrePrimario : color} />
              </View>
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
