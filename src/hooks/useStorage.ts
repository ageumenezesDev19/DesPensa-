
import { useState } from 'react';

const ACTIVE_PROFILE_KEY = 'active_user_profile';
const DEFAULT_PROFILE = 'default';

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
  const profiledKey = getProfiledKey(key);

  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(profiledKey);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key “${profiledKey}”:`, error);
      return initialValue;
    }
  });

  const setValue: React.Dispatch<React.SetStateAction<T>> = (value) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(profiledKey, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(`Error setting localStorage key “${profiledKey}”:`, error);
    }
  };

  return [storedValue, setValue];
}
