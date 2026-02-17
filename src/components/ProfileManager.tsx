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
      <div className="profile-manager animated-fadein">
        <div className="profile-info">
          <h3>Gerenciar Perfil</h3>
          <p className="subtitle">Alterne entre estoques ou gerencie backups</p>
        </div>

        <div className="profile-controls">
          <div className="select-wrapper">
             <CustomDropdown 
                options={profiles}
                selectedValue={activeProfile}
                onSelect={setActiveProfile}
              />
          </div>
          
          <button className="manage-btn" onClick={() => setIsModalOpen(true)}>
            <span className="icon">⚙️</span>
            Gerenciar
          </button>
        </div>
      </div>

      {isModalOpen && <ProfileManagementModal onClose={() => setIsModalOpen(false)} />}
    </>
  );
};
