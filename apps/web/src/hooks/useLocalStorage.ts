import { useState } from "react";
import { getStorageJSON, setStorageJSON } from "@/lib/local-storage";

export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((val: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === "undefined") {
      return initialValue;
    }
    return getStorageJSON<T>(key, initialValue);
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore =
        value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      if (typeof window !== "undefined") {
        setStorageJSON(key, valueToStore);
      }
    } catch (error) {
      console.warn("Error setting localStorage key:", key, error);
    }
  };

  return [storedValue, setValue];
}
