import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Boton, Card, s } from '../components/ui';
import { useVacty } from '../lib/estado';
import { C } from '../lib/theme';

export default function Login() {
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
    <SafeAreaView style={{ flex: 1 }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12, flexGrow: 1, justifyContent: 'center' }} keyboardShouldPersistTaps="handled">
          <Text style={[s.titulo, { fontSize: 34, color: C.primario }]}>VacTy</Text>
          <Text style={s.sub}>Monitoreo de la cadena de frío en tu puesto de salud.</Text>
          <Card style={{ gap: 10 }}>
            <TextInput placeholder="DNI" value={dni} onChangeText={setDni} keyboardType="number-pad" style={entrada} />
            <TextInput placeholder="Contraseña" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" style={entrada} />
            <Text style={s.sub}>Servidor</Text>
            <TextInput value={servidor} onChangeText={setServidor} autoCapitalize="none" autoCorrect={false} keyboardType="url" style={entrada} />
            {!!error && <Text style={{ color: C.alerta, fontWeight: '600' }}>{error}</Text>}
            <Boton titulo={cargando ? 'Entrando…' : 'Iniciar sesión'} onPress={enviar} deshabilitado={cargando || !dni.trim() || !password || !servidor.trim()} />
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const entrada = { borderWidth: 1, borderColor: C.borde, borderRadius: 10, padding: 12, color: C.texto } as const;
