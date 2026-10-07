export const C = {
  bg: '#F4F8F8',
  card: '#FFFFFF',
  texto: '#12303A',
  sub: '#5C7480',
  borde: '#DCE6E8',
  primario: '#0E7C86',
  ok: '#1E9E5A',
  precaucion: '#E59A12',
  alerta: '#D6362F',
};
export const colorEstado = (e: 'ok' | 'precaucion' | 'alerta') => C[e];
