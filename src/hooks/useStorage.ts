import { useState, useEffect, useRef } from 'react';

const ACTIVE_PROFILE_KEY = 'active_user_profile';
const DEFAULT_PROFILE = 'Default';

// Helper function to get the active profile
const getActiveProfile = (): string => {
  try {
    return (typeof window !== 'undefined' && window.localStorage?.getItem(ACTIVE_PROFILE_KEY)) || DEFAULT_PROFILE;
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

// Check if running in Tauri
const isTauriEnvironment = () => {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
};

// Helper for Tauri FS
const getTauriFs = async () => {
  if (isTauriEnvironment()) {
    try {
      const fs = await import('@tauri-apps/plugin-fs');
      return fs;
    } catch (e) {
      console.warn("Tauri environment detected but fs plugin load failed.", e);
      return null;
    }
  }
  return null;
};

export function useStorage<T>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const CHUNK_SIZE = 500; // items per chunk when chunking arrays
  const initialValueRef = useRef(initialValue);
  const [storedValue, setStoredValue] = useState<T>(initialValueRef.current);

  // Initialization Effect
  useEffect(() => {
    let isMounted = true;
    const loadInitialData = async () => {
      try {
        if (typeof window === 'undefined') return;
        const profiledKey = getProfiledKey(key);

        const fs = await getTauriFs();
        if (fs) {
          try {
            const hasDir = await fs.exists('', { baseDir: fs.BaseDirectory.AppLocalData });
            if (!hasDir) {
              await fs.mkdir('', { baseDir: fs.BaseDirectory.AppLocalData, recursive: true });
            }
            
            const fileExists = await fs.exists(`${profiledKey}.json`, { baseDir: fs.BaseDirectory.AppLocalData });
            if (fileExists) {
              const fileContent = await fs.readTextFile(`${profiledKey}.json`, { baseDir: fs.BaseDirectory.AppLocalData });
              if (isMounted) setStoredValue(JSON.parse(fileContent) ?? initialValueRef.current);
              console.log(`[useStorage] Loaded ${key} from Tauri FS. Profile: ${getActiveProfile()}`);
            } else {
              if (isMounted) setStoredValue(initialValueRef.current);
            }
          } catch (e) {
            console.error(`[useStorage] Tauri FS read error for ${profiledKey}:`, e);
            if (isMounted) setStoredValue(initialValueRef.current);
          }
        } else {
          // Web Fallback: localStorage chunking
          const partsMeta = window.localStorage.getItem(`${profiledKey}_parts`);
          if (partsMeta) {
            try {
              const partsCount = Number(partsMeta);
              const items: any[] = [];
              for (let i = 0; i < partsCount; i++) {
                const part = window.localStorage.getItem(`${profiledKey}_part_${i}`);
                if (!part) continue;
                try {
                  const parsedPart = JSON.parse(part);
                  if (Array.isArray(parsedPart)) items.push(...parsedPart);
                  else items.push(parsedPart);
                } catch (e) {
                  // Skip bad chunk
                }
              }
              console.log(`[useStorage] Reconstructed ${key} from ${items.length} items across ${partsCount} parts. Profile: ${getActiveProfile()}`);
              if (isMounted) setStoredValue((items.length ? items : initialValueRef.current) as unknown as T);
            } catch (e) {
              console.warn('[useStorage] Failed to reconstruct chunks, falling back to single key', e);
            }
          } else {
            const item = window.localStorage.getItem(profiledKey);
            const parsed = item ? JSON.parse(item) : initialValueRef.current;
            console.log(`[useStorage] Loaded ${key} from localStorage single key. Profile: ${getActiveProfile()}`);
            if (isMounted) setStoredValue(parsed ?? initialValueRef.current);
          }
        }
      } catch (error) {
        console.error(`[useStorage] Error initializing key "${getProfiledKey(key)}":`, error);
        if (isMounted) setStoredValue(initialValueRef.current);
      } finally {
        // initialization complete
      }
    };

    loadInitialData();
    return () => { isMounted = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);


  const setValue: React.Dispatch<React.SetStateAction<T>> = async (value) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      
      if (typeof window !== 'undefined') {
        const profiledKey = getProfiledKey(key);
        
        const fs = await getTauriFs();
        if (fs) {
          try {
            await fs.writeTextFile(`${profiledKey}.json`, JSON.stringify(valueToStore), { baseDir: fs.BaseDirectory.AppLocalData });
            console.log(`[useStorage] Saved ${key} to Tauri FS. Profile: ${getActiveProfile()}.`);
          } catch (err) {
            console.error(`[useStorage] Tauri FS write failed for ${profiledKey}:`, err);
          }
        } else {
          // Web Fallback: chunked localStorage
          try {
            const existingParts = window.localStorage.getItem(`${profiledKey}_parts`);
            if (existingParts) {
              const existingCount = Number(existingParts);
              for (let i = 0; i < existingCount; i++) window.localStorage.removeItem(`${profiledKey}_part_${i}`);
              window.localStorage.removeItem(`${profiledKey}_parts`);
            }
            try { window.localStorage.removeItem(profiledKey); } catch (e) {}

            if (Array.isArray(valueToStore) && (valueToStore as any[]).length > CHUNK_SIZE) {
              const arr = valueToStore as any[];
              const partsCount = Math.ceil(arr.length / CHUNK_SIZE);
              let success = true;
              for (let i = 0; i < partsCount; i++) {
                const slice = arr.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
                try {
                  window.localStorage.setItem(`${profiledKey}_part_${i}`, JSON.stringify(slice));
                } catch (e) {
                  console.warn(`[useStorage] localStorage capacity reached at chunk ${i}. Items: ${arr.length}`);
                  success = false;
                  break;
                }
              }
              if (success) {
                window.localStorage.setItem(`${profiledKey}_parts`, String(partsCount));
              } else {
                for (let i = 0; i < partsCount; i++) window.localStorage.removeItem(`${profiledKey}_part_${i}`);
              }
            } else {
              window.localStorage.setItem(profiledKey, JSON.stringify(valueToStore));
            }
          } catch (err) {
            console.warn(`[useStorage] localStorage.setItem operation failed for ${profiledKey}:`, err);
          }
        }
      }
    } catch (error) {
      console.error(`Error setting key "${getProfiledKey(key)}":`, error);
    }
  };


  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === getProfiledKey(key)) {
        try {
          setStoredValue(e.newValue === null ? initialValueRef.current : (JSON.parse(e.newValue) ?? initialValueRef.current));
        } catch (error) {
          setStoredValue(initialValueRef.current);
        }
      }
    };

    const handleProfileChange = async () => {
      try {
        if (typeof window === 'undefined') return;
        const profiledKey = getProfiledKey(key);
        
        const fs = await getTauriFs();
        if (fs) {
          const fileExists = await fs.exists(`${profiledKey}.json`, { baseDir: fs.BaseDirectory.AppLocalData });
          if (fileExists) {
             const fileContent = await fs.readTextFile(`${profiledKey}.json`, { baseDir: fs.BaseDirectory.AppLocalData });
             setStoredValue(JSON.parse(fileContent) ?? initialValueRef.current);
          } else {
             setStoredValue(initialValueRef.current);
          }
          return;
        }

        // Default: read from localStorage
        const partsMeta = window.localStorage.getItem(`${profiledKey}_parts`);
        if (partsMeta) {
          const partsCount = Number(partsMeta);
          const items: any[] = [];
          for (let i = 0; i < partsCount; i++) {
            const part = window.localStorage.getItem(`${profiledKey}_part_${i}`);
            if (!part) continue;
            try {
              const parsedPart = JSON.parse(part);
              if (Array.isArray(parsedPart)) items.push(...parsedPart);
              else items.push(parsedPart);
            } catch (e) {}
          }
          setStoredValue((items.length ? items : initialValueRef.current) as unknown as T);
          return;
        }

        const item = window.localStorage.getItem(profiledKey);
        const parsed = item ? JSON.parse(item) : initialValueRef.current;
        setStoredValue(parsed ?? initialValueRef.current);
      } catch (error) {
        setStoredValue(initialValueRef.current);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('profileChanged', handleProfileChange as EventListener);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('profileChanged', handleProfileChange as EventListener);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return [storedValue, setValue];
}
