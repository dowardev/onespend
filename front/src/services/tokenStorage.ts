/**
 * Servicio de almacenamiento híbrido para tokens de autenticación.
 *
 * - Web/Electron: usa localStorage
 * - Capacitor (futuro): usar @capacitor/preferences
 */

const TOKEN_KEY = 'auth_token';

/**
 * Detecta si estamos en un entorno Capacitor nativo
 */
function isCapacitorNative(): boolean {
  return typeof window !== 'undefined' && !!(window as any).Capacitor?.isNativePlatform?.();
}

/**
 * Guarda el token de autenticación
 */
export async function saveToken(token: string): Promise<void> {
  if (isCapacitorNative()) {
    // Futuro: usar @capacitor/preferences
    // const { Preferences } = await import('@capacitor/preferences');
    // await Preferences.set({ key: TOKEN_KEY, value: token });
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.setItem(TOKEN_KEY, token);
  }
}

/**
 * Obtiene el token de autenticación
 */
export async function getToken(): Promise<string | null> {
  if (isCapacitorNative()) {
    // Futuro: usar @capacitor/preferences
    // const { Preferences } = await import('@capacitor/preferences');
    // const { value } = await Preferences.get({ key: TOKEN_KEY });
    // return value;
    return localStorage.getItem(TOKEN_KEY);
  } else {
    return localStorage.getItem(TOKEN_KEY);
  }
}

/**
 * Elimina el token de autenticación
 */
export async function removeToken(): Promise<void> {
  if (isCapacitorNative()) {
    // Futuro: usar @capacitor/preferences
    // const { Preferences } = await import('@capacitor/preferences');
    // await Preferences.remove({ key: TOKEN_KEY });
    localStorage.removeItem(TOKEN_KEY);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

/**
 * Verifica si existe un token guardado
 */
export async function hasToken(): Promise<boolean> {
  const token = await getToken();
  return token !== null && token !== '';
}
