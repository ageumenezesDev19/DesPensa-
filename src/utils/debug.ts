// Arquivo de DEBUG para diagnosticar problemas com localStorage
// Descomente as funções abaixo no console do navegador para debugar

export function debugLocalStorage() {
  console.log("=== DEBUG LOCALSTORAGE ===");
  const keys = Object.keys(localStorage);
  console.log("Total de items no localStorage:", keys.length);
  
  const profiles: Record<string, any> = {};
  
  keys.forEach(key => {
    if (key.startsWith('profile_')) {
      const [_, profile, dataKey] = key.split('_');
      if (!profiles[profile]) {
        profiles[profile] = {};
      }
      const value = localStorage.getItem(key);
      try {
        const parsed = JSON.parse(value || '');
        profiles[profile][dataKey] = {
          length: parsed?.length || 'N/A',
          sample: parsed?.[0] ? `${parsed[0]['Código']} - ${parsed[0]['Descrição']}` : 'vazio'
        };
      } catch (e) {
        profiles[profile][dataKey] = value?.substring(0, 50) || 'erro ao parsear';
      }
    }
  });
  
  console.log("Profiles encontrados:", Object.keys(profiles));
  console.table(profiles);
  
  const activeProfile = localStorage.getItem('active_user_profile');
  console.log("Perfil ativo:", activeProfile);
  
  return { profiles, activeProfile };
}

export function debugClearProfile(profileName: string) {
  console.log(`Limpando perfil: ${profileName}`);
  const keys = Object.keys(localStorage);
  const keysToDelete = keys.filter(k => k.startsWith(`profile_${profileName}_`));
  keysToDelete.forEach(k => {
    console.log(`  Deletando: ${k}`);
    localStorage.removeItem(k);
  });
  console.log(`Total removido: ${keysToDelete.length} items`);
}

export function debugSetActiveProfile(profileName: string) {
  console.log(`Setando perfil ativo para: ${profileName}`);
  localStorage.setItem('active_user_profile', profileName);
  window.dispatchEvent(new CustomEvent('profileChanged'));
  console.log("Event 'profileChanged' disparado");
}

// Para usar no console:
// import { debugLocalStorage, debugClearProfile, debugSetActiveProfile } from './debug'
// debugLocalStorage()  // Ver estado do localStorage
// debugClearProfile('Default')  // Limpar um perfil
// debugSetActiveProfile('Perfil2')  // Trocar perfil ativo
