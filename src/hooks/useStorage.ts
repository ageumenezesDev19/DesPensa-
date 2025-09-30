
import { useState, useEffect } from 'react';

const ACTIVE_PROFILE_KEY = 'active_user_profile';
const DEFAULT_PROFILE = 'Default';

// Helper function to get the active profile
const getActiveProfile = (): string => {
  try {
    return window.localStorage.getItem(ACTIVE_PROFILE_KEY) || DEFAULT_PROFILE;
  } catch (error) {
    console.error("Could not get active profile, defaulting to 'default'.", error);
    return DEFAULT_PROFILE;
  }
};

// Helper function to get the profiled key
const getProfiledKey = (key: string): string => {
  const activeProfile = getActiveProfile();
  return `profile_${activeProfile}_${key}`;
};

export function useStorage<T>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const profiledKey = getProfiledKey(key);
      const item = window.localStorage.getItem(profiledKey);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key “${getProfiledKey(key)}”:`, error);
      return initialValue;
    }
  });

  const setValue: React.Dispatch<React.SetStateAction<T>> = (value) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      const profiledKey = getProfiledKey(key);
      window.localStorage.setItem(profiledKey, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(`Error setting localStorage key “${getProfiledKey(key)}”:`, error);
    }
  };

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === getProfiledKey(key)) {
        try {
          setStoredValue(e.newValue ? JSON.parse(e.newValue) : initialValue);
        } catch (error) {
          console.error(`Error parsing new value for “${getProfiledKey(key)}”:`, error);
          setStoredValue(initialValue);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [key, initialValue]);

  return [storedValue, setValue];
}
