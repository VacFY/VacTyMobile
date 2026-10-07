import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Boton, Campo, T } from '../components/ui';
import { useVacty } from '../lib/estado';
import { useTema } from '../lib/theme';

export default function Login() {
  const t = useTema();
  const insets = useSafeAreaInsets();
  const { entrar, url } = useVacty();
  const [dni, setDni] = useState('');
  const [password, setPassword] = useState('');
  const [servidor, setServidor] = useState(url);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const enviar = async () => {
    setCargando(true);
    setError('');
    const e = await entrar(dni, password, servidor);
    setCargando(false);
    if (e) setError(e);
    else router.replace('/');
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: t.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View style={{ backgroundColor: t.hero, paddingTop: insets.top + 48, paddingBottom: 44, paddingHorizontal: 28, borderBottomLeftRadius: 36, borderBottomRightRadius: 36, gap: 14 }}>
          <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: t.primario, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="snow" size={34} color={t.sobrePrimario} />
          </View>
          <T v="display" c="sobreHero" style={{ fontSize: 40 }}>VacTy</T>
          <T v="cuerpo" c="subHero">Cuida cada vacuna: monitoreo de la cadena de frío en tu puesto de salud.</T>
        </View>

        <View style={{ padding: 24, gap: 16 }}>
          <T v="titulo">Inicia sesión</T>
          <Campo icono="id-card" etiqueta="DNI" placeholder="12345678" value={dni} onChangeText={setDni} keyboardType="number-pad" />
          <Campo icono="lock-closed" etiqueta="Contraseña" placeholder="••••••••" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" />
          <Campo icono="server" etiqueta="Servidor" value={servidor} onChangeText={setServidor} autoCapitalize="none" autoCorrect={false} keyboardType="url" />
          {!!error && (
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              <Ionicons name="alert-circle" size={18} color={t.alerta} />
              <T v="chico" c="alerta" style={{ flex: 1 }}>{error}</T>
            </View>
          )}
          <Boton titulo={cargando ? 'Entrando…' : 'Iniciar sesión'} icono="log-in" onPress={enviar} deshabilitado={cargando || !dni.trim() || !password || !servidor.trim()} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
