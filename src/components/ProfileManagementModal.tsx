import React, { useState, useRef, useEffect } from 'react';
import { useProfiles } from '../hooks/useProfiles';
import { useNotification } from '../hooks/useNotification';
import { ConfirmationModal } from './ConfirmationModal';
import '../styles/Modal.scss';
import '../styles/ProfileManagementModal.scss';

interface Props {
  onClose: () => void;
}

export const ProfileManagementModal: React.FC<Props> = ({ onClose }) => {
  const {
    profiles,
    activeProfile,
    createProfile,
    deleteProfile,
    backupProfile,
    restoreProfile,
    editProfileName
  } = useProfiles();

  const { showNotification } = useNotification();
  const [newProfileName, setNewProfileName] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [editingProfile, setEditingProfile] = useState<string | null>(null);
  const [editingProfileName, setEditingProfileName] = useState('');
  const restoreFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingProfile) {
      setEditingProfileName(editingProfile);
    } else {
      setEditingProfileName('');
    }
  }, [editingProfile]);

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

  const handleEdit = () => {
    if (editingProfileName.trim() && editingProfile) {
      editProfileName(editingProfile, editingProfileName.trim());
      setEditingProfile(null);
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
      <div className="modal-overlay animated-fadein">
        <div className="modal-content profile-management-modal">
          <div className="modal-header">
            <h2>Gerenciar Perfis</h2>
            <button className="close-btn" onClick={onClose} title="Fechar">×</button>
          </div>
          
          <div className="modal-body">
            <div className="section profiles-section">
              <h3 className="section-title">Seus Perfis</h3>
              <div className="profile-list">
                {profiles.map(profile => (
                  <div key={profile} className={`profile-item ${profile === activeProfile ? 'active' : ''}`}>
                    {editingProfile === profile ? (
                      <div className="profile-editor">
                        <input 
                          type="text" 
                          value={editingProfileName}
                          onChange={(e) => setEditingProfileName(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleEdit()}
                          autoFocus
                          placeholder="Nome do perfil"
                        />
                        <div className="editor-actions">
                          <button className="icon-btn save" onClick={handleEdit} title="Salvar">✓</button>
                          <button className="icon-btn cancel" onClick={() => setEditingProfile(null)} title="Cancelar">✕</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="profile-info">
                          <span className="profile-name">
                            {profile}
                          </span>
                          {profile === activeProfile && <span className="badge active-badge">Ativo</span>}
                        </div>
                        
                        <div className="profile-actions">
                          <button 
                            className="icon-btn edit" 
                            onClick={() => setEditingProfile(profile)} 
                            title="Renomear perfil"
                          >
                            ✎
                          </button>
                          <button 
                            className="icon-btn backup" 
                            onClick={() => handleBackup(profile)} 
                            title="Fazer backup deste perfil"
                          >
                            ⬇
                          </button>
                          <button 
                            className="icon-btn delete" 
                            onClick={() => handleDeleteClick(profile)}
                            disabled={profile === 'Default' || profile === activeProfile}
                            title={profile === 'Default' || profile === activeProfile ? "Não é possível excluir este perfil" : "Excluir perfil"}
                          >
                            🗑
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="section global-actions-section">
              <h3 className="section-title">Ações</h3>
              
              <div className="action-row create-row">
                <input
                  type="text"
                  value={newProfileName}
                  onChange={(e) => setNewProfileName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleCreate()}
                  placeholder="Nome do novo perfil"
                />
                <button className="primary-btn" onClick={handleCreate} disabled={!newProfileName.trim()}>
                  Criar Novo
                </button>
              </div>

              <div className="divider-text">ou</div>

              <div className="action-row restore-row">
                 <button className="secondary-btn restore-btn" onClick={handleRestoreClick}>
                  <span className="icon">⬆</span> Restaurar Backup
                </button>
                <p className="help-text">Restaure um arquivo .json salvo anteriormente.</p>
              </div>
            </div>
          </div>

          <input
            type="file"
            accept=".json"
            ref={restoreFileInputRef}
            style={{ display: 'none' }}
            onChange={handleFileRestore}
          />
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

