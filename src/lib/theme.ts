import { useColorScheme } from 'react-native';

// Marca: amarillo #ffde59 y marron #390f07. El amarillo se usa para acentos y botones (nunca como texto sobre
// fondo claro) y se reserva el verde / naranja / rojo para los estados, asi no se confunde con "precaucion".
export const MARCA = { amarillo: '#ffde59', marron: '#390f07' };

const claro = {
  esOscuro: false,
  bg: '#FBF6E9',
  superficie: '#FFFFFF',
  superficieAlt: '#F4EBD0',
  borde: '#EADFC4',
  texto: '#390f07',
  sub: '#7A5C52',
  primario: '#ffde59',
  sobrePrimario: '#390f07',
  hero: '#390f07',
  sobreHero: '#FFF4D6',
  subHero: '#D9BFAE',
  ok: '#2E9E6B',
  precaucion: '#F08A24',
  alerta: '#D93A2F',
  okSuave: '#E3F4EB',
  precaucionSuave: '#FDEBD7',
  alertaSuave: '#FBE0DD',
};

const oscuro: typeof claro = {
  esOscuro: true,
  bg: '#1A0804',
  superficie: '#2A100A',
  superficieAlt: '#381810',
  borde: '#4A2A20',
  texto: '#FFF4D6',
  sub: '#C9AFA0',
  primario: '#ffde59',
  sobrePrimario: '#390f07',
  hero: '#3A140B',
  sobreHero: '#FFF4D6',
  subHero: '#D9BFAE',
  ok: '#3DBB85',
  precaucion: '#FFA040',
  alerta: '#FF6B5E',
  okSuave: '#16352A',
  precaucionSuave: '#43280F',
  alertaSuave: '#46201C',
};

export type Tema = typeof claro;
export type ColorTexto = { [K in keyof Tema]: Tema[K] extends string ? K : never }[keyof Tema];
export type EstadoColor = 'ok' | 'precaucion' | 'alerta';

export const useTema = (): Tema => (useColorScheme() === 'dark' ? oscuro : claro);

export const suave = (t: Tema, e: EstadoColor) => t[`${e}Suave` as const];

export const F = {
  reg: 'Inter_400Regular',
  med: 'Inter_500Medium',
  semi: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  xbold: 'Inter_800ExtraBold',
};
