import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold, useFonts } from '@expo-google-fonts/inter';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { VactyProvider, useVacty } from '../lib/estado';
import { useTema } from '../lib/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

function Rutas() {
  const { listo, sesion } = useVacty();
  const t = useTema();
  if (!listo || sesion === 'cargando') return null;
  // Sin sesion solo existe el login; con sesion, el resto. Expo Router redirige solo cuando cambia la guarda.
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.bg }, animation: 'fade_from_bottom' }}>
      <Stack.Protected guard={sesion === 'fuera'}>
        <Stack.Screen name="login" />
      </Stack.Protected>
      <Stack.Protected guard={sesion === 'dentro'}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="seleccion" />
        <Stack.Screen name="lote/[id]" />
        <Stack.Screen name="historial-completo" />
      </Stack.Protected>
    </Stack>
  );
}

export default function Raiz() {
  const [fuentes, errorFuentes] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold });
  useEffect(() => {
    if (fuentes || errorFuentes) SplashScreen.hideAsync().catch(() => {});
  }, [fuentes, errorFuentes]);
  if (!fuentes && !errorFuentes) return null;
  return (
    <SafeAreaProvider>
      <VactyProvider>
        <StatusBar style="auto" />
        <Rutas />
      </VactyProvider>
    </SafeAreaProvider>
  );
}
