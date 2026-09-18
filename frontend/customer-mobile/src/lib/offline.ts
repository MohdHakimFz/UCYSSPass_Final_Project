import AsyncStorage from '@react-native-async-storage/async-storage'

const PREFIX = 'sp:'

export async function saveCache(key: string, value: unknown) {
  try {
    await AsyncStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch {
    /* a full or unavailable disk just means no offline copy */
  }
}

export async function loadCache<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(PREFIX + key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

// Passes and QR codes are personal, so they are wiped on sign out.
export async function clearCache() {
  try {
    const keys = (await AsyncStorage.getAllKeys()).filter((k) => k.startsWith(PREFIX))
    await AsyncStorage.multiRemove(keys)
  } catch {
    /* nothing to clear */
  }
}
