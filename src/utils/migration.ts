const KEYS_PT = ['produtos', 'retirados', 'blacklist'];
const KEYS_EN = ['products', 'withdrawn', 'blacklist'];

/**
 * Checks if a profile (or legacy unprofiled storage) has any legacy Portuguese data keys.
 */
export const hasPortugueseData = (profile: string): boolean => {
  const hasProfiled = KEYS_PT.some((key, index) => {
    if (key === KEYS_EN[index]) return false; // Ignore keys that are identically named in both languages
    const storageKey = `profile_${profile}_${key}`;
    return !!(window.localStorage.getItem(storageKey) || window.localStorage.getItem(`${storageKey}_parts`));
  });

  if (hasProfiled) return true;

  // Only check unprofiled legacy keys if we are checking the Default profile
  if (profile === 'Default') {
    return KEYS_EN.some(key => !!(window.localStorage.getItem(key) || window.localStorage.getItem(`${key}_parts`))) ||
           KEYS_PT.some(key => !!(window.localStorage.getItem(key) || window.localStorage.getItem(`${key}_parts`)));
  }

  return false;
};

/**
 * Migrates Portuguese legacy data to English keys for a specific profile.
 * Handles both profiled (`profile_Name_key`) and unprofiled (`key`) legacy keys.
 */
export const migrateProfileData = (profile: string) => {
  try {
    KEYS_PT.forEach((oldKey, index) => {
      const newKey = KEYS_EN[index];
      const profiledOldKey = `profile_${profile}_${oldKey}`;
      const profiledNewKey = `profile_${profile}_${newKey}`;
      
      const unprofiledOldKey = oldKey;
      const unprofiledNewKey = newKey;

      // Helper to migrate a single pair of keys
      const migrateKeys = (fromKey: string, toKey: string) => {
        if (fromKey === toKey) return; // Prevent deleting the data it just copied if the keys are identical

        // 1. Chunked migration
        const oldPartsMeta = window.localStorage.getItem(`${fromKey}_parts`);
        if (oldPartsMeta) {
          const oldPartsCount = Number(oldPartsMeta);
          const newPartsMeta = window.localStorage.getItem(`${toKey}_parts`);
          
          if (!newPartsMeta || oldPartsCount >= Number(newPartsMeta)) {
            if (newPartsMeta) {
              const count = Number(newPartsMeta);
              for (let i = 0; i < count; i++) window.localStorage.removeItem(`${toKey}_part_${i}`);
            }
            window.localStorage.setItem(`${toKey}_parts`, oldPartsCount.toString());
            for (let i = 0; i < oldPartsCount; i++) {
              const data = window.localStorage.getItem(`${fromKey}_part_${i}`);
              if (data) {
                window.localStorage.setItem(`${toKey}_part_${i}`, data);
                window.localStorage.removeItem(`${fromKey}_part_${i}`);
              }
            }
            window.localStorage.removeItem(`${fromKey}_parts`);
          } else {
             // Just clear old chunks if new ones are more significant
             for (let i = 0; i < oldPartsCount; i++) window.localStorage.removeItem(`${fromKey}_part_${i}`);
             window.localStorage.removeItem(`${fromKey}_parts`);
          }
        }

        // 2. Single key migration
        const oldData = window.localStorage.getItem(fromKey);
        if (oldData) {
          const newData = window.localStorage.getItem(toKey);
          if (!newData || oldData.length >= newData.length) {
            window.localStorage.setItem(toKey, oldData);
          }
          window.localStorage.removeItem(fromKey);
        }
      };

      // First migrate profiled PT to profiled EN
      migrateKeys(profiledOldKey, profiledNewKey);

      // If Default profile, also migrate unprofiled PT to profiled EN
      if (profile === 'Default') {
        migrateKeys(unprofiledOldKey, profiledNewKey);
        // Also migrate unprofiled EN to profiled EN (legacy useStorage behavior moved here)
        migrateKeys(unprofiledNewKey, profiledNewKey);
      }
    });
  } catch (error) {
    console.error(`[Migration] Failed to migrate profile '${profile}'`, error);
  }
};
