import { Redirect, Stack, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { VactyProvider, useVacty } from '../lib/estado';
import { C } from '../lib/theme';

function Rutas() {
  const { listo, sesion, perfil } = useVacty();
  const ruta = usePathname();
  if (!listo || sesion === 'cargando') return null;
  if (sesion === 'fuera' && ruta !== '/login') return <Redirect href="/login" />;
  if (sesion === 'dentro' && ruta === '/login') return <Redirect href="/" />;
  if (sesion === 'dentro' && !perfil && ruta !== '/seleccion') return <Redirect href="/seleccion" />;
  return (
    <Stack screenOptions={{ headerTintColor: C.texto, headerStyle: { backgroundColor: C.bg }, contentStyle: { backgroundColor: C.bg } }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="seleccion" options={{ title: 'Tipo de vacuna', headerBackVisible: !!perfil }} />
      <Stack.Screen name="lote/[id]" options={{ title: 'Verificar lote' }} />
    </Stack>
  );
}

export default function Raiz() {
  return (
    <SafeAreaProvider>
      <VactyProvider>
        <StatusBar style="dark" />
        <Rutas />
      </VactyProvider>
    </SafeAreaProvider>
  );
}
