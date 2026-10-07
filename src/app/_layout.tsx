import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold, useFonts } from '@expo-google-fonts/inter';
import { Redirect, Stack, usePathname } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { VactyProvider, useVacty } from '../lib/estado';
import { useTema } from '../lib/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

function Rutas() {
  const { listo, sesion, perfil } = useVacty();
  const t = useTema();
  const ruta = usePathname();
  if (!listo || sesion === 'cargando') return null;
  if (sesion === 'fuera' && ruta !== '/login') return <Redirect href="/login" />;
  if (sesion === 'dentro' && ruta === '/login') return <Redirect href="/" />;
  if (sesion === 'dentro' && !perfil && ruta !== '/seleccion') return <Redirect href="/seleccion" />;
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.bg }, animation: 'fade_from_bottom' }} />;
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
