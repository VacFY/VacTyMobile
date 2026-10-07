import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useRef, useState, type ComponentProps, type ReactNode } from 'react';
import { Animated, Pressable, RefreshControl, ScrollView, Text, TextInput, View, type StyleProp, type TextInputProps, type TextStyle, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { F, suave, useTema, type ColorTexto, type EstadoColor } from '../lib/theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];

const toque = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

// ---- Texto
type Variante = 'display' | 'titulo' | 'subtitulo' | 'cuerpo' | 'etiqueta' | 'chico';
const ESTILOS: Record<Variante, TextStyle> = {
  display: { fontFamily: F.xbold, fontSize: 30, letterSpacing: -0.5 },
  titulo: { fontFamily: F.bold, fontSize: 20 },
  subtitulo: { fontFamily: F.semi, fontSize: 16 },
  cuerpo: { fontFamily: F.reg, fontSize: 15, lineHeight: 21 },
  etiqueta: { fontFamily: F.semi, fontSize: 12, letterSpacing: 0.8, textTransform: 'uppercase' },
  chico: { fontFamily: F.med, fontSize: 13 },
};

export function T({ v = 'cuerpo', c = 'texto', style, children, numberOfLines }: { v?: Variante; c?: ColorTexto; style?: StyleProp<TextStyle>; children?: ReactNode; numberOfLines?: number }) {
  const t = useTema();
  return (
    <Text numberOfLines={numberOfLines} style={[ESTILOS[v], { color: t[c] }, style]}>
      {children}
    </Text>
  );
}

// ---- Contenedores
export function Card({ children, style, onPress }: { children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void }) {
  const t = useTema();
  const base: ViewStyle = {
    backgroundColor: t.superficie,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: t.borde,
    shadowColor: '#390f07',
    shadowOpacity: t.esOscuro ? 0 : 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: t.esOscuro ? 0 : 1,
  };
  if (onPress) {
    return (
      <Pressable onPress={() => { toque(); onPress(); }} style={({ pressed }) => [base, style, pressed && { opacity: 0.85 }]}>
        {children}
      </Pressable>
    );
  }
  return <View style={[base, style]}>{children}</View>;
}

export function Encabezado({ titulo, subtitulo, atras }: { titulo: string; subtitulo?: string; atras?: boolean }) {
  const t = useTema();
  return (
    <View style={{ gap: 4 }}>
      {atras && (
        <Pressable onPress={() => router.back()} hitSlop={12} style={{ flexDirection: 'row', alignItems: 'center', marginLeft: -6, marginBottom: 4 }}>
          <Ionicons name="chevron-back" size={22} color={t.texto} />
          <T v="chico" c="sub">Volver</T>
        </Pressable>
      )}
      <T v="display">{titulo}</T>
      {!!subtitulo && <T v="cuerpo" c="sub">{subtitulo}</T>}
    </View>
  );
}

export function Pantalla({ titulo, subtitulo, children, atras, onRefresh, refrescando }: { titulo: string; subtitulo?: string; children: ReactNode; atras?: boolean; onRefresh?: () => void; refrescando?: boolean }) {
  const t = useTema();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 40, gap: 14 }}
        keyboardShouldPersistTaps="handled"
        refreshControl={onRefresh ? <RefreshControl refreshing={!!refrescando} onRefresh={onRefresh} tintColor={t.sub} /> : undefined}
      >
        <Encabezado titulo={titulo} subtitulo={subtitulo} atras={atras} />
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

// ---- Controles
type VarianteBoton = 'primario' | 'oscuro' | 'peligro' | 'suave';

export function Boton({ titulo, onPress, variante = 'primario', icono, deshabilitado }: { titulo: string; onPress: () => void; variante?: VarianteBoton; icono?: IconName; deshabilitado?: boolean }) {
  const t = useTema();
  const col = {
    primario: { bg: t.primario, fg: t.sobrePrimario },
    oscuro: { bg: t.esOscuro ? t.superficieAlt : t.texto, fg: t.esOscuro ? t.texto : '#FFF4D6' },
    peligro: { bg: t.alerta, fg: '#FFFFFF' },
    suave: { bg: t.superficieAlt, fg: t.texto },
  }[variante];
  return (
    <Pressable
      disabled={deshabilitado}
      onPress={() => { toque(); onPress(); }}
      style={({ pressed }) => ({ backgroundColor: col.bg, minHeight: 52, borderRadius: 16, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: deshabilitado ? 0.4 : pressed ? 0.85 : 1 })}
    >
      {icono && <Ionicons name={icono} size={20} color={col.fg} />}
      <Text style={{ color: col.fg, fontFamily: F.bold, fontSize: 16 }}>{titulo}</Text>
    </Pressable>
  );
}

export function Chip({ texto, activo, onPress }: { texto: string; activo: boolean; onPress: () => void }) {
  const t = useTema();
  return (
    <Pressable onPress={() => { toque(); onPress(); }} style={{ paddingVertical: 9, paddingHorizontal: 14, borderRadius: 999, backgroundColor: activo ? t.primario : t.superficieAlt, borderWidth: 1, borderColor: activo ? t.primario : t.borde }}>
      <Text style={{ fontFamily: F.semi, fontSize: 14, color: activo ? t.sobrePrimario : t.texto }}>{texto}</Text>
    </Pressable>
  );
}

export function Campo({ icono, etiqueta, ...rest }: { icono: IconName; etiqueta: string } & TextInputProps) {
  const t = useTema();
  const [foco, setFoco] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      <T v="etiqueta" c="sub">{etiqueta}</T>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: t.superficie, borderRadius: 14, borderWidth: 2, borderColor: foco ? t.primario : t.borde, paddingHorizontal: 14 }}>
        <Ionicons name={icono} size={20} color={t.sub} />
        <TextInput
          {...rest}
          onFocus={() => setFoco(true)}
          onBlur={() => setFoco(false)}
          placeholderTextColor={t.sub}
          style={{ flex: 1, paddingVertical: 14, fontFamily: F.med, fontSize: 16, color: t.texto }}
        />
      </View>
    </View>
  );
}

// ---- Estado
const ESTADO_ICONO: Record<EstadoColor, IconName> = { ok: 'checkmark-circle', precaucion: 'warning', alerta: 'alert-circle' };
const ESTADO_TEXTO: Record<EstadoColor, string> = { ok: 'En rango', precaucion: 'Cerca del límite', alerta: 'Fuera de rango' };

export function Pill({ estado, texto, sobreOscuro }: { estado: EstadoColor; texto?: string; sobreOscuro?: boolean }) {
  const t = useTema();
  const fondo = sobreOscuro ? t[estado] : suave(t, estado);
  const fg = sobreOscuro ? '#FFFFFF' : t[estado];
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: fondo, paddingVertical: 7, paddingHorizontal: 12, borderRadius: 999 }}>
      <Ionicons name={ESTADO_ICONO[estado]} size={16} color={fg} />
      <Text style={{ fontFamily: F.bold, fontSize: 13, color: fg }}>{texto ?? ESTADO_TEXTO[estado]}</Text>
    </View>
  );
}

export function Punto({ color, pulso }: { color: string; pulso?: boolean }) {
  const a = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!pulso) return;
    const l = Animated.loop(Animated.sequence([Animated.timing(a, { toValue: 0.3, duration: 900, useNativeDriver: true }), Animated.timing(a, { toValue: 1, duration: 900, useNativeDriver: true })]));
    l.start();
    return () => l.stop();
  }, [pulso, a]);
  return <Animated.View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color, opacity: a }} />;
}

// ---- Carga y vacios
export function Skeleton({ w, h, r = 12, style }: { w: number | `${number}%`; h: number; r?: number; style?: StyleProp<ViewStyle> }) {
  const t = useTema();
  const a = useRef(new Animated.Value(0.45)).current;
  useEffect(() => {
    const l = Animated.loop(Animated.sequence([Animated.timing(a, { toValue: 1, duration: 800, useNativeDriver: true }), Animated.timing(a, { toValue: 0.45, duration: 800, useNativeDriver: true })]));
    l.start();
    return () => l.stop();
  }, [a]);
  return <Animated.View style={[{ width: w, height: h, borderRadius: r, backgroundColor: t.esOscuro ? '#4A2A20' : '#E6D9B8', opacity: a }, style]} />;
}

export function Vacio({ icono, titulo, texto }: { icono: IconName; titulo: string; texto?: string }) {
  const t = useTema();
  return (
    <View style={{ alignItems: 'center', gap: 8, paddingVertical: 28, paddingHorizontal: 12 }}>
      <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: t.superficieAlt, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={icono} size={30} color={t.sub} />
      </View>
      <T v="subtitulo">{titulo}</T>
      {!!texto && <T v="cuerpo" c="sub" style={{ textAlign: 'center' }}>{texto}</T>}
    </View>
  );
}

export function Seccion({ titulo, color = 'sub', children }: { titulo: string; color?: ColorTexto; children: ReactNode }) {
  return (
    <View style={{ gap: 10 }}>
      <T v="etiqueta" c={color}>{titulo}</T>
      {children}
    </View>
  );
}
