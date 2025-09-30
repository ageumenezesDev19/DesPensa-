import { useState, useEffect, useCallback } from 'react';

const PROFILES_KEY = 'user_profiles';
const ACTIVE_PROFILE_KEY = 'active_user_profile';
const DEFAULT_PROFILE = 'Default';
const PROFILE_DATA_KEYS = ['estoque', 'retirados', 'blacklist'];

// Helper to trigger file download
const downloadFile = (filename: string, content: string) => {
  try {
    const blob = new Blob([content], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Erro ao salvar o arquivo:", error);
    alert("Ocorreu um erro ao salvar o arquivo.");
  }
};

// Helper function to get the profiled key
const getProfiledKey = (profile: string, key: string): string => {
  return `profile_${profile}_${key}`;
};

export function useProfiles() {
  const [profiles, setProfiles] = useState<string[]>([]);
  const [activeProfile, setActiveProfileState] = useState<string>(DEFAULT_PROFILE);

  const refreshProfiles = useCallback(() => {
    try {
      const storedProfiles = window.localStorage.getItem(PROFILES_KEY);
      const storedActiveProfile = window.localStorage.getItem(ACTIVE_PROFILE_KEY);

      let parsedProfiles = storedProfiles ? JSON.parse(storedProfiles) : [DEFAULT_PROFILE];
      if (!Array.isArray(parsedProfiles) || parsedProfiles.length === 0) {
        parsedProfiles = [DEFAULT_PROFILE];
        window.localStorage.setItem(PROFILES_KEY, JSON.stringify(parsedProfiles));
      }
      setProfiles(parsedProfiles);

      if (storedActiveProfile && parsedProfiles.includes(storedActiveProfile)) {
        setActiveProfileState(storedActiveProfile);
      } else {
        const newActive = parsedProfiles[0];
        setActiveProfileState(newActive);
        window.localStorage.setItem(ACTIVE_PROFILE_KEY, newActive);
      }
    } catch (error) {
      console.error("Failed to load profiles from localStorage.", error);
      setProfiles([DEFAULT_PROFILE]);
      setActiveProfileState(DEFAULT_PROFILE);
      window.localStorage.setItem(PROFILES_KEY, JSON.stringify([DEFAULT_PROFILE]));
      window.localStorage.setItem(ACTIVE_PROFILE_KEY, DEFAULT_PROFILE);
    }
  }, []);

  useEffect(() => {
    refreshProfiles();
  }, [refreshProfiles]);

  const setActiveProfile = useCallback((profileName: string) => {
    if (profiles.includes(profileName)) {
      try {
        window.localStorage.setItem(ACTIVE_PROFILE_KEY, profileName);
        setActiveProfileState(profileName);
        window.location.reload();
      } catch (error) {
        console.error(`Failed to set active profile to "${profileName}".`, error);
      }
    }
  }, [profiles]);

  const createProfile = useCallback((profileName: string) => {
    if (profileName && !profiles.includes(profileName)) {
      try {
        const newProfiles = [...profiles, profileName];
        window.localStorage.setItem(PROFILES_KEY, JSON.stringify(newProfiles));
        alert(`Perfil "${profileName}" criado com sucesso! A aplicação será recarregada.`);
        window.location.reload();
      } catch (error) {
        console.error(`Failed to create new profile "${profileName}".`, error);
      }
    }
  }, [profiles]);

  const deleteProfile = useCallback((profileNameToDelete: string) => {
    if (profileNameToDelete === DEFAULT_PROFILE) {
      alert('Não é possível deletar o perfil padrão.');
      return;
    }
    if (profileNameToDelete === activeProfile) {
      alert('Não é possível deletar o perfil ativo. Mude de perfil primeiro.');
      return;
    }
    try {
      PROFILE_DATA_KEYS.forEach(key => {
        window.localStorage.removeItem(getProfiledKey(profileNameToDelete, key));
      });
      const newProfiles = profiles.filter(p => p !== profileNameToDelete);
      window.localStorage.setItem(PROFILES_KEY, JSON.stringify(newProfiles));
      alert(`Perfil "${profileNameToDelete}" deletado com sucesso! A aplicação será recarregada.`);
      window.location.reload();
    } catch (error) {
      console.error(`Failed to delete profile "${profileNameToDelete}".`, error);
    }
  }, [profiles, activeProfile]);

  const backupProfile = useCallback((profileNameToBackup: string): { success: boolean; isEmpty: boolean } => {
    try {
      let totalItems = 0;
      const backupData: { [key: string]: any } = {};
      PROFILE_DATA_KEYS.forEach(key => {
        const item = window.localStorage.getItem(getProfiledKey(profileNameToBackup, key));
        const data = item ? JSON.parse(item) : [];
        backupData[key] = data;
        if (Array.isArray(data)) {
          totalItems += data.length;
        }
      });

      const backupObject = {
        profileName: profileNameToBackup,
        backupDate: new Date().toISOString(),
        data: backupData,
      };

      const date = new Date().toISOString().split('T')[0];
      downloadFile(`backup-${profileNameToBackup}-${date}.json`, JSON.stringify(backupObject, null, 2));
      return { success: true, isEmpty: totalItems === 0 };
    } catch (error) {
      console.error(`Failed to backup profile "${profileNameToBackup}".`, error);
      return { success: false, isEmpty: true };
    }
  }, []);

  const restoreProfile = useCallback((backupContent: string) => {
    try {
      const backupObject = JSON.parse(backupContent);
      const profileNameFromBackup = backupObject.profileName;

      if (!backupObject.data || !profileNameFromBackup) {
        throw new Error("Arquivo de backup inválido ou corrompido.");
      }

      const profileExists = profiles.includes(profileNameFromBackup);
      let confirmation = true;

      if (profileExists) {
        confirmation = window.confirm(`Um perfil chamado "${profileNameFromBackup}" já existe. Deseja sobrescrevê-lo com os dados do backup?\n\nAVISO: Todos os dados atuais do perfil "${profileNameFromBackup}" serão substituídos.`);
      }

      if (!confirmation) return;

      if (!profileExists) {
        const newProfiles = [...profiles, profileNameFromBackup];
        window.localStorage.setItem(PROFILES_KEY, JSON.stringify(newProfiles));
      }

      PROFILE_DATA_KEYS.forEach(key => {
        if (backupObject.data[key]) {
          window.localStorage.setItem(getProfiledKey(profileNameFromBackup, key), JSON.stringify(backupObject.data[key]));
        }
      });

      alert(`Perfil "${profileNameFromBackup}" foi restaurado com sucesso! A aplicação será recarregada.`);
      window.location.reload();

    } catch (error) {
      alert("Falha ao restaurar o backup. Verifique o arquivo selecionado.");
      console.error(`Failed to restore profile.`, error);
    }
  }, [profiles]);

  const editProfileName = useCallback((oldName: string, newName: string) => {
    if (!newName || oldName === newName) return;
    if (oldName === DEFAULT_PROFILE) {
      alert('Não é possível renomear o perfil padrão.');
      return;
    }
    if (profiles.includes(newName)) {
      alert(`Um perfil com o nome "${newName}" já existe.`);
      return;
    }

    try {
      // Move data to new keys
      PROFILE_DATA_KEYS.forEach(key => {
        const data = window.localStorage.getItem(getProfiledKey(oldName, key));
        if (data) {
          window.localStorage.setItem(getProfiledKey(newName, key), data);
          window.localStorage.removeItem(getProfiledKey(oldName, key));
        }
      });

      // Update profile list
      const newProfiles = profiles.map(p => (p === oldName ? newName : p));
      window.localStorage.setItem(PROFILES_KEY, JSON.stringify(newProfiles));

      // Update active profile if it was the one being edited
      if (activeProfile === oldName) {
        window.localStorage.setItem(ACTIVE_PROFILE_KEY, newName);
      }

      alert(`Perfil "${oldName}" foi renomeado para "${newName}". A aplicação será recarregada.`);
      window.location.reload();

    } catch (error) {
      console.error(`Failed to rename profile "${oldName}".`, error);
      alert("Ocorreu um erro ao renomear o perfil.");
    }
  }, [profiles, activeProfile]);

  return { profiles, activeProfile, setActiveProfile, createProfile, deleteProfile, backupProfile, restoreProfile, editProfileName };
}
