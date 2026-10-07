// Perfiles de ejemplo (referenciales). Validar rangos y margenes con la NTS 136-MINSA/2017.
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

export const PERFILES: PerfilVacuna[] = [
  { id: 'pentavalente', nombre: 'Pentavalente', min: 2, max: 8, margenFrio: 1, margenCalor: 0.5, sensibleCongelacion: true, nota: 'Se daña por congelación' },
  { id: 'hepb', nombre: 'Hepatitis B', min: 2, max: 8, margenFrio: 1, margenCalor: 0.5, sensibleCongelacion: true, nota: 'Se daña por congelación' },
  { id: 'hpv', nombre: 'VPH', min: 2, max: 8, margenFrio: 1, margenCalor: 0.5, sensibleCongelacion: true, nota: 'Se daña por congelación' },
  { id: 'spr', nombre: 'SPR', min: 2, max: 8, margenFrio: 0.5, margenCalor: 1, sensibleCongelacion: false, nota: 'Sensible al calor y a la luz' },
  { id: 'bcg', nombre: 'BCG', min: 2, max: 8, margenFrio: 0.5, margenCalor: 1, sensibleCongelacion: false, nota: 'Sensible al calor y a la luz' },
  { id: 'apo', nombre: 'Antipolio oral (APO)', min: -25, max: 8, margenFrio: 2, margenCalor: 1, sensibleCongelacion: false, nota: 'Tolera congelación; sensible al calor' },
];

export const perfilPorId = (id: string | null) => PERFILES.find((p) => p.id === id) ?? null;
