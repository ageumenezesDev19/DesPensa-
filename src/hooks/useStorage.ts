
import { useState, useEffect } from 'react';

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

export function useStorage<T>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const CHUNK_SIZE = 1000; // items per chunk when chunking arrays

  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      // Check if we're in a browser environment
      if (typeof window === 'undefined') {
        return initialValue;
      }
      const profiledKey = getProfiledKey(key);
      // Migration: if profiled key doesn't exist but legacy key does, migrate it
      const legacyItem = window.localStorage.getItem(key);
      if (!window.localStorage.getItem(profiledKey) && legacyItem) {
        try {
          window.localStorage.setItem(profiledKey, legacyItem);
          window.localStorage.removeItem(key);
          console.log(`[useStorage] Migrated legacy key '${key}' to '${profiledKey}'`);
        } catch (e) {
          console.warn('[useStorage] Failed to migrate legacy key:', e);
        }
      }
      // synchronous initial load: read from localStorage; later effects may override from file
      // If chunked parts exist, reconstruct
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
              if (Array.isArray(parsedPart)) {
                items.push(...parsedPart);
              } else {
                items.push(parsedPart);
              }
            } catch (e) {
              console.warn(`[useStorage] Failed to parse chunk ${i}`, e);
              // if a chunk fails to parse, skip it
            }
          }
          console.log(`[useStorage] Reconstructed ${key} from ${items.length} items across ${partsCount} parts. Perfil: ${getActiveProfile()}`);
          return (items.length ? items : initialValue) as unknown as T;
        } catch (e) {
          console.warn('[useStorage] Failed to reconstruct chunks, falling back to single key', e);
        }
      }

      const item = window.localStorage.getItem(profiledKey);
      const parsed = item ? JSON.parse(item) : initialValue;
      console.log(`[useStorage] Loaded ${key} from localStorage. Perfil: ${getActiveProfile()}`, parsed);
      return parsed;
    } catch (error) {
      console.error(`Error reading localStorage key "${getProfiledKey(key)}":`, error);
      return initialValue;
    }
  });

  const setValue: React.Dispatch<React.SetStateAction<T>> = (value) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      if (typeof window !== 'undefined') {
        const profiledKey = getProfiledKey(key);
        try {
          // If storing a large array, chunk it into multiple keys
          if (Array.isArray(valueToStore) && (valueToStore as any[]).length > CHUNK_SIZE) {
            // remove single key if exists
            try { window.localStorage.removeItem(profiledKey); } catch (e) { /* ignore */ }
            const arr = valueToStore as any[];
            const partsCount = Math.ceil(arr.length / CHUNK_SIZE);
            for (let i = 0; i < partsCount; i++) {
              const slice = arr.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
              try {
                window.localStorage.setItem(`${profiledKey}_part_${i}`, JSON.stringify(slice));
              } catch (e) {
                console.warn(`[useStorage] localStorage.setItem failed for chunk ${i}`, e);
                throw e;
              }
            }
            // write meta
            window.localStorage.setItem(`${profiledKey}_parts`, String(partsCount));
            console.log(`[useStorage] Saved ${key} as ${partsCount} parts. Perfil: ${getActiveProfile()}. Total items:`, arr.length);
          } else {
            // remove any existing parts
            const existingParts = window.localStorage.getItem(`${profiledKey}_parts`);
            if (existingParts) {
              try {
                const existingCount = Number(existingParts);
                for (let i = 0; i < existingCount; i++) {
                  window.localStorage.removeItem(`${profiledKey}_part_${i}`);
                }
              } catch (e) { /* ignore */ }
              window.localStorage.removeItem(`${profiledKey}_parts`);
            }
            window.localStorage.setItem(profiledKey, JSON.stringify(valueToStore));
            console.log(`[useStorage] Saved ${key} to localStorage. Perfil: ${getActiveProfile()}. Items count:`, 
              valueToStore instanceof Array ? (valueToStore as any[]).length : 'N/A');
          }
        } catch (err) {
          console.warn(`[useStorage] localStorage.setItem failed for ${profiledKey}:`, err);
        }

        // For Tauri desktop and for large 'produtos' data, always write to file as primary persistence
        const isTauri = (window as any).__TAURI__;
        if (isTauri && profiledKey.endsWith('_produtos')) {
          (async () => {
            try {
              const fsModule: any = await (new Function("return import('@tauri-apps/api/fs')")());
              const pathModule: any = await (new Function("return import('@tauri-apps/api/path')")());
              const { writeFile, createDir } = fsModule;
              const { appLocalDataDir } = pathModule;
              const dir = await appLocalDataDir();
              try { await createDir(dir, { recursive: true }); } catch (e) { /* ignore */ }
              const filePath = `${dir}${profiledKey}.json`;
              await writeFile({ path: filePath, contents: JSON.stringify(valueToStore) });
              console.log(`[useStorage] Wrote produtos to Tauri file: ${filePath}`);
            } catch (fsErr) {
              console.error('[useStorage] Failed to write produtos fallback file:', fsErr);
            }
          })();
        }
      }
    } catch (error) {
      console.error(`Error setting localStorage key "${getProfiledKey(key)}":`, error);
    }
  };

  // On mount, if no profiled localStorage entry exists and running under Tauri,
  // try to read fallback file from appLocalDataDir and populate state.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const profiledKey = getProfiledKey(key);
    const isTauri = (window as any).__TAURI__;
    // If running in Tauri, always attempt to read produtos file and override localStorage
    if (isTauri && profiledKey.endsWith('_produtos')) {
      (async () => {
        try {
          const fsModule: any = await (new Function("return import('@tauri-apps/api/fs')")());
          const pathModule: any = await (new Function("return import('@tauri-apps/api/path')")());
          const { readTextFile } = fsModule;
          const { appLocalDataDir } = pathModule;
          const dir = await appLocalDataDir();
          const filePath = `${dir}${profiledKey}.json`;
          try {
            const fileContent = await readTextFile(filePath);
            if (fileContent) {
              const parsed = JSON.parse(fileContent);
              setStoredValue(parsed);
              console.log(`[useStorage] Loaded ${key} from Tauri fallback file: ${filePath}`);
            }
          } catch (e) {
            // file not found or parse error - ignore
          }
        } catch (e) {
          // modules not available or other error
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === getProfiledKey(key)) {
        try {
          setStoredValue(e.newValue ? JSON.parse(e.newValue) : initialValue);
        } catch (error) {
          console.error(`Error parsing new value for "${getProfiledKey(key)}":`, error);
          setStoredValue(initialValue);
        }
      }
    };

    const handleProfileChange = () => {
      // When profile changes, reload the appropriate storage for this key.
      try {
        if (typeof window === 'undefined') return;
        const profiledKey = getProfiledKey(key);

        // First try synchronous reconstruction from localStorage chunks (if present)
        try {
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
              } catch (e) {
                console.warn(`[useStorage] Failed to parse chunk ${i} on profile change`, e);
              }
            }
            console.log(`[useStorage] Profile changed, reconstructed ${key} from ${items.length} items across ${partsCount} parts. New perfil: ${getActiveProfile()}`);
            setStoredValue((items.length ? items : initialValue) as unknown as T);
            return;
          }
        } catch (e) {
          console.warn('[useStorage] Error reconstructing chunks on profile change', e);
        }

        // If running in Tauri and this is produtos, attempt async file read to populate state
        const isTauri = (window as any).__TAURI__;
        if (isTauri && profiledKey.endsWith('_produtos')) {
          (async () => {
            try {
              const fsModule: any = await (new Function("return import('@tauri-apps/api/fs')")());
              const pathModule: any = await (new Function("return import('@tauri-apps/api/path')")());
              const { readTextFile } = fsModule;
              const { appLocalDataDir } = pathModule;
              const dir = await appLocalDataDir();
              const filePath = `${dir}${profiledKey}.json`;
              try {
                const fileContent = await readTextFile(filePath);
                if (fileContent) {
                  const parsedFile = JSON.parse(fileContent);
                  console.log(`[useStorage] Profile changed, loaded ${key} from Tauri file: ${filePath}`);
                  setStoredValue(parsedFile);
                  return;
                }
              } catch (e) {
                // file not found or parse error -> fall through to localStorage
              }
            } catch (e) {
              // dynamic import failed -> fall through
            }

            // Fallback to localStorage single key
            try {
              const item = window.localStorage.getItem(profiledKey);
              const parsed = item ? JSON.parse(item) : initialValue;
              console.log(`[useStorage] Profile changed, reloading ${key} from localStorage. New perfil: ${getActiveProfile()}`, parsed);
              setStoredValue(parsed);
            } catch (err) {
              console.error(`Error reloading data for new profile:`, err);
              setStoredValue(initialValue);
            }
          })();
          return;
        }

        // Default: read single key from localStorage
        try {
          const item = window.localStorage.getItem(profiledKey);
          const parsed = item ? JSON.parse(item) : initialValue;
          console.log(`[useStorage] Profile changed, reloading ${key}. New perfil: ${getActiveProfile()}`, parsed);
          setStoredValue(parsed);
        } catch (error) {
          console.error(`Error reloading data for new profile:`, error);
          setStoredValue(initialValue);
        }
      } catch (error) {
        console.error(`Error handling profile change for key ${key}:`, error);
        setStoredValue(initialValue);
      }
    };

    // Listen for both storage events and custom profile change events
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('profileChanged', handleProfileChange as EventListener);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('profileChanged', handleProfileChange as EventListener);
    };
  }, [key, initialValue]);

  return [storedValue, setValue];
}
