import React, { useState, useRef } from 'react';
import { useProfiles } from '../hooks/useProfiles';
import { useNotification } from '../hooks/useNotification';
import { ConfirmationModal } from './ConfirmationModal'; // Import the new modal
import '../styles/Modal.scss';
import '../styles/ProfileManagementModal.scss';

interface Props {
  onClose: () => void;
}

export const ProfileManagementModal: React.FC<Props> = ({ onClose }) => {
  const { profiles, activeProfile, createProfile, deleteProfile, backupProfile, restoreProfile } = useProfiles();
  const { showNotification } = useNotification();

  const [newProfileName, setNewProfileName] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const restoreFileInputRef = useRef<HTMLInputElement>(null);

  const handleCreate = () => {
    if (newProfileName.trim()) {
      createProfile(newProfileName.trim());
      setNewProfileName('');
    }
  };

  const handleBackup = (profileName: string) => {
    const { success, isEmpty } = backupProfile(profileName);
    if (success) {
      if (isEmpty) {
        showNotification(`Backup do perfil "${profileName}" criado, mas o perfil está vazio.`);
      } else {
        showNotification(`Backup do perfil "${profileName}" criado com sucesso!`);
      }
    }
  };

  const handleDeleteClick = (profileName: string) => {
    setShowDeleteConfirm(profileName);
  };

  const confirmDelete = () => {
    if (showDeleteConfirm) {
      deleteProfile(showDeleteConfirm);
      setShowDeleteConfirm(null);
    }
  };

  const handleRestoreClick = () => {
    restoreFileInputRef.current?.click();
  };

  const handleFileRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      try {
        const content = await file.text();
        restoreProfile(content);
      } catch (err) {
        alert("Erro ao ler o arquivo de backup.");
        console.error("File reading error:", err);
      }
    }
    if (restoreFileInputRef.current) restoreFileInputRef.current.value = '';
  };

  return (
    <>
      <div className="modal-overlay">
        <div className="modal-content profile-management-modal">
          <h2>Gerenciar Perfis</h2>
          
          <div className="profile-list">
            {profiles.map(profile => (
              <div key={profile} className={`profile-item ${profile === activeProfile ? 'active' : ''}`}>
                <span className="profile-name">
                  {profile}
                  {profile === activeProfile && ' (Ativo)'}
                </span>
                <div className="profile-actions">
                  <button className="action-btn backup" onClick={() => handleBackup(profile)}>Backup</button>
                  <button className="action-btn delete" onClick={() => handleDeleteClick(profile)}>Excluir</button>
                </div>
              </div>
            ))}
          </div>

          <div className="modal-separator"></div>

          <div className="create-profile-section">
            <h3>Ações Globais</h3>
            <div className="global-actions">
              <div className="profile-creator">
                <input
                  type="text"
                  value={newProfileName}
                  onChange={(e) => setNewProfileName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleCreate()}
                  placeholder="Nome do novo perfil"
                />
                <button onClick={handleCreate}>Criar Perfil</button>
              </div>
              <button className="action-btn restore-global" onClick={handleRestoreClick}>
                Restaurar de um Backup...
              </button>
            </div>
          </div>

          <input
            type="file"
            accept=".json"
            ref={restoreFileInputRef}
            style={{ display: 'none' }}
            onChange={handleFileRestore}
          />

          <div className="modal-buttons">
            <button className="cancel-btn" onClick={onClose}>Fechar</button>
          </div>
        </div>
      </div>

      {showDeleteConfirm && (
        <ConfirmationModal
          message={
            <span>
              Tem certeza que deseja deletar o perfil <strong>"{showDeleteConfirm}"</strong>?
              <br />
              Todos os dados associados serão perdidos permanentemente.
            </span>
          }
          onConfirm={confirmDelete}
          onClose={() => setShowDeleteConfirm(null)}
          confirmText="Sim, Excluir"
        />
      )}
    </>
  );
};

