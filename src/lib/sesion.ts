import * as SecureStore from 'expo-secure-store';

export type Credenciales = { dni: string; password: string };
const CLAVE = 'vacty.credenciales';

export async function leerCredenciales(): Promise<Credenciales | null> {
  try {
    const v = await SecureStore.getItemAsync(CLAVE);
    return v ? (JSON.parse(v) as Credenciales) : null;
  } catch {
    return null;
  }
}

export async function guardarCredenciales(c: Credenciales) {
  try {
    await SecureStore.setItemAsync(CLAVE, JSON.stringify(c));
  } catch {}
}

export async function borrarCredenciales() {
  try {
    await SecureStore.deleteItemAsync(CLAVE);
  } catch {}
}
