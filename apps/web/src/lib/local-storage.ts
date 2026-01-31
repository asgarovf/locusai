import { STORAGE_KEY_MIGRATIONS } from './local-storage-keys';

/**
 * Safely get an item from localStorage with automatic migration from old keys
 * @param key - The new storage key
 * @returns The value from localStorage or null if not found
 */
export function getStorageItem(key: string): string | null {
  if (typeof window === 'undefined') return null;

  // First try to get the value with the new key
  let value = localStorage.getItem(key);

  // If not found, check if there's a migration path from an old key
  if (value === null) {
    // Find old key that maps to this new key
    const oldKey = Object.entries(STORAGE_KEY_MIGRATIONS).find(
      ([_, newKey]) => newKey === key || key.startsWith(newKey)
    )?.[0];

    if (oldKey) {
      // Try to get value from old key
      value = localStorage.getItem(oldKey);

      // If found, migrate the data
      if (value !== null) {
        localStorage.setItem(key, value);
        localStorage.removeItem(oldKey);
      }
    }
  }

  return value;
}

/**
 * Safely set an item in localStorage
 * @param key - The storage key
 * @param value - The value to store
 */
export function setStorageItem(key: string, value: string): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(key, value);
  } catch (error) {
    console.error('Failed to set localStorage item:', error);
  }
}

/**
 * Safely remove an item from localStorage
 * @param key - The storage key
 */
export function removeStorageItem(key: string): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Failed to remove localStorage item:', error);
  }
}

/**
 * Get a parsed JSON value from localStorage with automatic migration
 * @param key - The storage key
 * @param defaultValue - Default value if key doesn't exist or parsing fails
 * @returns The parsed value or default value
 */
export function getStorageJSON<T>(key: string, defaultValue: T): T {
  const value = getStorageItem(key);

  if (value === null) return defaultValue;

  try {
    return JSON.parse(value) as T;
  } catch {
    return defaultValue;
  }
}

/**
 * Set a JSON value in localStorage
 * @param key - The storage key
 * @param value - The value to store (will be JSON stringified)
 */
export function setStorageJSON<T>(key: string, value: T): void {
  try {
    setStorageItem(key, JSON.stringify(value));
  } catch (error) {
    console.error('Failed to stringify and set localStorage item:', error);
  }
}
