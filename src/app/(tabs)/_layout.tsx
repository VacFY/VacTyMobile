import { Redirect, Tabs } from 'expo-router';
import { BarraFlotante } from '../../components/BarraFlotante';
import { useVacty } from '../../lib/estado';

export default function TabsLayout() {
  const { termo, termosListos } = useVacty();
  // Sin termo todavia: primero vincular uno (o elegirlo, si es supervisor). Mientras carga la lista, se espera.
  if (!termo) return termosListos ? <Redirect href="/termos" /> : null;
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <BarraFlotante {...props} />}>
      <Tabs.Screen name="index" options={{ title: 'Monitor' }} />
      <Tabs.Screen name="historial" options={{ title: 'Historial' }} />
      <Tabs.Screen name="lotes" options={{ title: 'Lotes' }} />
      <Tabs.Screen name="ajustes" options={{ title: 'Ajustes' }} />
    </Tabs>
  );
}
