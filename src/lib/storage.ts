import AsyncStorage from '@react-native-async-storage/async-storage';

export async function cargar<T>(clave: string, defecto: T): Promise<T> {
  try {
    const v = await AsyncStorage.getItem(clave);
    return v ? (JSON.parse(v) as T) : defecto;
  } catch {
    return defecto;
  }
}

export async function guardar(clave: string, valor: unknown) {
  try {
    await AsyncStorage.setItem(clave, JSON.stringify(valor));
  } catch {}
}

export const CLAVES = {
  vacuna: 'vacty.vacuna',
  historial: 'vacty.historial',
  alertas: 'vacty.alertas',
  lotes: 'vacty.lotes',
  url: 'vacty.url',
  monitoreo: 'vacty.monitoreo',
};
