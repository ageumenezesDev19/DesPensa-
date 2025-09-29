import React, { useState } from 'react';
import { useProfiles } from '../hooks/useProfiles';
import { ProfileManagementModal } from './ProfileManagementModal';
import { CustomDropdown } from './CustomDropdown';
import '../styles/CustomDropdown.scss';

export const ProfileManager: React.FC = () => {
  const { profiles, activeProfile, setActiveProfile } = useProfiles();
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <div className="profile-manager">
        <div className="profile-selector">
          <label>Perfil Ativo:</label>
          <CustomDropdown 
            options={profiles}
            selectedValue={activeProfile}
            onSelect={setActiveProfile}
          />
        </div>
        
        <div className="profile-actions">
          <button onClick={() => setIsModalOpen(true)}>Gerenciar Perfis</button>
        </div>
      </div>

      {isModalOpen && <ProfileManagementModal onClose={() => setIsModalOpen(false)} />}
    </>
  );
};
