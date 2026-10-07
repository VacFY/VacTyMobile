import { nombreTermo, type Termo } from './api';

// Rango que vigila la app: el que calcula el backend para el termo (con sus lotes activos o el perfil estándar).
export type PerfilVacuna = {
  id: string;
  nombre: string;
  min: number;
  max: number;
  margenFrio: number; // aviso de precaucion cuando temp < min + margenFrio
  margenCalor: number; // aviso de precaucion cuando temp > max - margenCalor
  sensibleCongelacion: boolean; // el servidor lo usa para marcar la alerta como critica
  nota: string;
};

/** El margen de precaución es mayor del lado que daña a las vacunas del termo. */
export function perfilDeTermo(t: Termo): PerfilVacuna {
  const r = t.range ?? { minTemp: 2, maxTemp: 8, basedOn: 'PROFILE', profileName: null, freezeSensitive: true, heatSensitive: false };
  const nota =
    r.basedOn === 'LOTS'
      ? `Rango calculado con los lotes del termo${r.freezeSensitive ? ' · se daña si se congela' : ''}`
      : `Sin lotes: rango ${r.profileName ?? 'estándar 2–8 °C'}`;
  return {
    id: t.contenedor,
    nombre: nombreTermo(t),
    min: r.minTemp,
    max: r.maxTemp,
    margenFrio: r.freezeSensitive ? 1 : 0.5,
    margenCalor: r.heatSensitive ? 1 : 0.5,
    sensibleCongelacion: r.freezeSensitive,
    nota,
  };
}
