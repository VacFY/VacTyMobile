import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useRef, useState, type ComponentProps, type ReactNode } from 'react';
import { Animated, Easing, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View, type LayoutChangeEvent, type StyleProp, type TextInputProps, type TextStyle, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { F, useTema, type ColorTexto, type EstadoColor } from '../lib/theme';
import { Ambiente } from './Ambiente';

export type IconName = ComponentProps<typeof Ionicons>['name'];

const toque = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

// ---- Texto
type Variante = 'gigante' | 'display' | 'titulo' | 'subtitulo' | 'cuerpo' | 'etiqueta' | 'chico';
const ESTILOS: Record<Variante, TextStyle> = {
  gigante: { fontFamily: F.xbold, fontSize: 84, letterSpacing: -3, lineHeight: 88 },
  display: { fontFamily: F.xbold, fontSize: 34, letterSpacing: -1 },
  titulo: { fontFamily: F.bold, fontSize: 22, letterSpacing: -0.4 },
  subtitulo: { fontFamily: F.semi, fontSize: 16 },
  cuerpo: { fontFamily: F.reg, fontSize: 15, lineHeight: 22 },
  etiqueta: { fontFamily: F.semi, fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase' },
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

// ---- Movimiento
// Entrada escalonada: cada bloque aparece deslizandose un poco hacia arriba.
export function Aparecer({ children, i = 0, style }: { children: ReactNode; i?: number; style?: StyleProp<ViewStyle> }) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(a, { toValue: 1, duration: 520, delay: 60 + i * 80, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [a, i]);
  return (
    <Animated.View style={[{ opacity: a, transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }] }, style]}>{children}</Animated.View>
  );
}

// Cualquier cosa tocable con un pequeno rebote.
export function Toque({ children, onPress, style, silencio }: { children: ReactNode; onPress: () => void; style?: StyleProp<ViewStyle>; silencio?: boolean }) {
  const e = useRef(new Animated.Value(1)).current;
  const a = (v: number) => Animated.spring(e, { toValue: v, useNativeDriver: true, speed: 40, bounciness: 6 }).start();
  return (
    <Pressable onPressIn={() => a(0.96)} onPressOut={() => a(1)} onPress={() => { if (!silencio) toque(); onPress(); }}>
      <Animated.View style={[{ transform: [{ scale: e }] }, style]}>{children}</Animated.View>
    </Pressable>
  );
}

// ---- Estructura sin cajas: espacio, lineas finas y tipografia
export function Divisor({ style }: { style?: StyleProp<ViewStyle> }) {
  const t = useTema();
  return <View style={[{ height: StyleSheet.hairlineWidth, backgroundColor: t.borde }, style]} />;
}

export function Fila({ icono, titulo, detalle, derecha, onPress, color, ultimo }: { icono?: IconName; titulo: string; detalle?: string; derecha?: ReactNode; onPress?: () => void; color?: ColorTexto; ultimo?: boolean }) {
  const t = useTema();
  const contenido = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16, borderBottomWidth: ultimo ? 0 : StyleSheet.hairlineWidth, borderBottomColor: t.borde }}>
      {icono && <Ionicons name={icono} size={22} color={color ? t[color] : t.sub} />}
      <View style={{ flex: 1, gap: 2 }}>
        <T v="subtitulo" c={color ?? 'texto'}>{titulo}</T>
        {!!detalle && <T v="chico" c="sub">{detalle}</T>}
      </View>
      {derecha}
      {onPress && !derecha && <Ionicons name="arrow-forward" size={18} color={t.sub} />}
    </View>
  );
  return onPress ? <Toque onPress={onPress}>{contenido}</Toque> : contenido;
}

export function Seccion({ titulo, accion, children }: { titulo: string; accion?: ReactNode; children: ReactNode }) {
  return (
    <View style={{ gap: 6, marginTop: 10 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <T v="etiqueta" c="sub">{titulo}</T>
        {accion}
      </View>
      {children}
    </View>
  );
}

export function Encabezado({ titulo, subtitulo, atras }: { titulo: string; subtitulo?: string; atras?: boolean }) {
  const t = useTema();
  return (
    <View style={{ gap: 6 }}>
      {atras && (
        <Pressable onPress={() => router.back()} hitSlop={14} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
          <Ionicons name="arrow-back" size={22} color={t.texto} />
          <T v="chico" c="sub">Volver</T>
        </Pressable>
      )}
      <T v="display">{titulo}</T>
      {!!subtitulo && <T v="cuerpo" c="sub">{subtitulo}</T>}
    </View>
  );
}

export function Pantalla({ titulo, subtitulo, children, atras, onRefresh, refrescando, ambiente, sinTitulo }: { titulo?: string; subtitulo?: string; children: ReactNode; atras?: boolean; onRefresh?: () => void; refrescando?: boolean; ambiente?: EstadoColor; sinTitulo?: boolean }) {
  const t = useTema();
  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      {ambiente && <Ambiente estado={ambiente} />}
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 12, paddingBottom: 130, gap: 18 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          refreshControl={onRefresh ? <RefreshControl refreshing={!!refrescando} onRefresh={onRefresh} tintColor={t.sub} /> : undefined}
        >
          {!sinTitulo && titulo && (
            <Aparecer>
              <Encabezado titulo={titulo} subtitulo={subtitulo} atras={atras} />
            </Aparecer>
          )}
          {children}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// ---- Controles
type VarianteBoton = 'primario' | 'oscuro' | 'peligro' | 'texto';

export function Boton({ titulo, onPress, variante = 'primario', icono, deshabilitado }: { titulo: string; onPress: () => void; variante?: VarianteBoton; icono?: IconName; deshabilitado?: boolean }) {
  const t = useTema();
  const col = {
    primario: { bg: t.primario, fg: t.sobrePrimario },
    oscuro: { bg: t.esOscuro ? t.superficieAlt : t.texto, fg: t.esOscuro ? t.texto : '#FFF4D6' },
    peligro: { bg: t.alerta, fg: '#FFFFFF' },
    texto: { bg: 'transparent', fg: t.texto },
  }[variante];
  const cuerpo = (
    <View style={{ backgroundColor: col.bg, minHeight: 56, borderRadius: 999, paddingHorizontal: 26, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, opacity: deshabilitado ? 0.35 : 1, ...(variante === 'texto' ? { borderWidth: 1.5, borderColor: t.borde } : null) }}>
      {icono && <Ionicons name={icono} size={20} color={col.fg} />}
      <Text style={{ color: col.fg, fontFamily: F.bold, fontSize: 16 }}>{titulo}</Text>
    </View>
  );
  if (deshabilitado) return cuerpo;
  return <Toque onPress={onPress}>{cuerpo}</Toque>;
}

// Selector segmentado con un indicador que se desliza.
export function Segmentos<K extends string>({ opciones, valor, onChange }: { opciones: { clave: K; titulo: string }[]; valor: K; onChange: (k: K) => void }) {
  const t = useTema();
  const [ancho, setAncho] = useState(0);
  const x = useRef(new Animated.Value(0)).current;
  const idx = Math.max(0, opciones.findIndex((o) => o.clave === valor));
  const w = ancho / opciones.length;
  useEffect(() => {
    if (ancho) Animated.spring(x, { toValue: idx * w, useNativeDriver: true, speed: 18, bounciness: 8 }).start();
  }, [idx, w, ancho, x]);
  return (
    <View onLayout={(e: LayoutChangeEvent) => setAncho(e.nativeEvent.layout.width)} style={{ flexDirection: 'row', backgroundColor: t.superficieAlt, borderRadius: 999, padding: 4 }}>
      {ancho > 0 && <Animated.View style={{ position: 'absolute', top: 4, left: 4, width: w - 8 + 0, height: '100%', marginLeft: 0, borderRadius: 999, backgroundColor: t.primario, transform: [{ translateX: x }] }} />}
      {opciones.map((o) => (
        <Pressable key={o.clave} onPress={() => { toque(); onChange(o.clave); }} style={{ flex: 1, alignItems: 'center', paddingVertical: 10 }}>
          <Text style={{ fontFamily: o.clave === valor ? F.bold : F.semi, fontSize: 13, color: o.clave === valor ? t.sobrePrimario : t.sub }}>{o.titulo}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function Chip({ texto, activo, onPress }: { texto: string; activo: boolean; onPress: () => void }) {
  const t = useTema();
  return (
    <Toque onPress={onPress}>
      <View style={{ paddingVertical: 9, paddingHorizontal: 16, borderRadius: 999, backgroundColor: activo ? t.primario : 'transparent', borderWidth: 1.5, borderColor: activo ? t.primario : t.borde }}>
        <Text style={{ fontFamily: F.semi, fontSize: 14, color: activo ? t.sobrePrimario : t.texto }}>{texto}</Text>
      </View>
    </Toque>
  );
}

// Campo de texto con solo una linea inferior que se enciende al enfocar.
export function Campo({ icono, etiqueta, oscuro, ...rest }: { icono: IconName; etiqueta: string; oscuro?: boolean } & TextInputProps) {
  const t = useTema();
  const [foco, setFoco] = useState(false);
  const texto = oscuro ? t.sobreHero : t.texto;
  const sub = oscuro ? t.subHero : t.sub;
  return (
    <View style={{ gap: 4 }}>
      <Text style={{ fontFamily: F.semi, fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', color: foco ? t.primario : sub }}>{etiqueta}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 2, borderBottomColor: foco ? t.primario : oscuro ? 'rgba(255,244,214,0.25)' : t.borde }}>
        <Ionicons name={icono} size={20} color={foco ? t.primario : sub} />
        <TextInput {...rest} onFocus={() => setFoco(true)} onBlur={() => setFoco(false)} placeholderTextColor={sub} style={{ flex: 1, paddingVertical: 12, fontFamily: F.med, fontSize: 17, color: texto }} />
      </View>
    </View>
  );
}

// ---- Estado
export function Punto({ color, pulso, tam = 8 }: { color: string; pulso?: boolean; tam?: number }) {
  const a = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!pulso) return;
    const l = Animated.loop(Animated.sequence([Animated.timing(a, { toValue: 0.25, duration: 900, useNativeDriver: true }), Animated.timing(a, { toValue: 1, duration: 900, useNativeDriver: true })]));
    l.start();
    return () => l.stop();
  }, [pulso, a]);
  return <Animated.View style={{ width: tam, height: tam, borderRadius: tam / 2, backgroundColor: color, opacity: a }} />;
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
    <View style={{ gap: 8, paddingVertical: 24 }}>
      <Ionicons name={icono} size={38} color={t.primario === '#ffde59' && !t.esOscuro ? '#C9A400' : t.primario} />
      <T v="titulo">{titulo}</T>
      {!!texto && <T v="cuerpo" c="sub">{texto}</T>}
    </View>
  );
}
