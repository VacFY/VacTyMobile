import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Aparecer, Boton, Campo, T } from '../components/ui';
import { Vial } from '../components/Vial';
import { conAlfa } from '../lib/anim';
import { useVacty } from '../lib/estado';
import { F, MARCA, useTema } from '../lib/theme';

export default function Login() {
  const t = useTema();
  const insets = useSafeAreaInsets();
  const { entrar, url } = useVacty();
  const [dni, setDni] = useState('');
  const [password, setPassword] = useState('');
  const [servidor, setServidor] = useState(url);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const [avanzado, setAvanzado] = useState(false);

  // la abeja flota suavemente
  const flota = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const l = Animated.loop(Animated.sequence([Animated.timing(flota, { toValue: 1, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }), Animated.timing(flota, { toValue: 0, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true })]));
    l.start();
    return () => l.stop();
  }, [flota]);

  const enviar = async () => {
    setCargando(true);
    setError('');
    const e = await entrar(dni, password, servidor);
    setCargando(false);
    if (e) setError(e);
    else router.replace('/');
  };

  return (
    <View style={{ flex: 1, backgroundColor: MARCA.marron }}>
      <LinearGradient colors={[conAlfa(MARCA.amarillo, 0.22), conAlfa(MARCA.amarillo, 0.05), 'rgba(57,15,7,0)']} locations={[0, 0.5, 1]} style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 420 }} />
      <View pointerEvents="none" style={{ position: 'absolute', right: -6, top: insets.top + 30, opacity: 0.95, transform: [{ rotate: '12deg' }] }}>
        <Vial valor={5.2} min={2} max={8} estado="ok" ancho={168} />
      </View>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end', paddingHorizontal: 28, paddingTop: insets.top + 24, paddingBottom: insets.bottom + 28, gap: 22 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Aparecer>
            <Animated.View style={{ transform: [{ translateY: flota.interpolate({ inputRange: [0, 1], outputRange: [0, -8] }) }] }}>
              <Image source={require('../../assets/icon.png')} style={{ width: 84, height: 84, borderRadius: 26 }} />
            </Animated.View>
          </Aparecer>
          <Aparecer i={1}>
            <View style={{ gap: 6 }}>
              <Text style={{ fontFamily: F.xbold, fontSize: 58, letterSpacing: -2.5, color: MARCA.amarillo }}>VacTy</Text>
              <T v="subtitulo" c="subHero" style={{ lineHeight: 23 }}>Cada vacuna, a la temperatura correcta. Donde estés.</T>
            </View>
          </Aparecer>
          <Aparecer i={2} style={{ gap: 18 }}>
            <Campo oscuro icono="id-card" etiqueta="DNI" placeholder="12345678" value={dni} onChangeText={setDni} keyboardType="number-pad" />
            <Campo oscuro icono="lock-closed" etiqueta="Contraseña" placeholder="••••••••" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" />
            {avanzado && <Campo oscuro icono="server" etiqueta="Servidor" value={servidor} onChangeText={setServidor} autoCapitalize="none" autoCorrect={false} keyboardType="url" />}
            {!!error && (
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                <Ionicons name="alert-circle" size={18} color="#FF8A7E" />
                <Text style={{ flex: 1, fontFamily: F.med, fontSize: 13, color: '#FF8A7E' }}>{error}</Text>
              </View>
            )}
          </Aparecer>
          <Aparecer i={3} style={{ gap: 14 }}>
            <Boton titulo={cargando ? 'Entrando…' : 'Entrar'} icono="arrow-forward" onPress={enviar} deshabilitado={cargando || !dni.trim() || !password || !servidor.trim()} />
            <Text onPress={() => setAvanzado((v) => !v)} style={{ textAlign: 'center', fontFamily: F.med, fontSize: 13, color: t.subHero }}>
              {avanzado ? 'Ocultar servidor' : 'Cambiar servidor'}
            </Text>
          </Aparecer>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
