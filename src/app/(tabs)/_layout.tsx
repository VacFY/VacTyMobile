import { Tabs } from 'expo-router';
import { C } from '../../lib/theme';

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: C.primario, headerStyle: { backgroundColor: C.bg }, headerTitleStyle: { color: C.texto } }}>
      <Tabs.Screen name="index" options={{ title: 'Monitor', tabBarLabel: 'Monitor' }} />
      <Tabs.Screen name="historial" options={{ title: 'Historial', tabBarLabel: 'Historial' }} />
      <Tabs.Screen name="lotes" options={{ title: 'Lotes', tabBarLabel: 'Lotes' }} />
      <Tabs.Screen name="ajustes" options={{ title: 'Ajustes', tabBarLabel: 'Ajustes' }} />
    </Tabs>
  );
}
