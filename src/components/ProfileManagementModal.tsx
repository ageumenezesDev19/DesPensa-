import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useProfiles } from '../hooks/useProfiles';
import { useNotification } from '../hooks/useNotification';
import { ConfirmationModal } from './ConfirmationModal';
import '../styles/Modal.scss';
import '../styles/ProfileManagementModal.scss';

interface Props {
  onClose: () => void;
}

export const ProfileManagementModal: React.FC<Props> = ({ onClose }) => {
  const { t } = useTranslation();
  const {
    profiles,
    activeProfile,
    createProfile,
    deleteProfile,
    backupProfile,
    restoreProfile,
    editProfileName,
    activeProfileSettings,
    updateActiveProfileSettings,
  } = useProfiles();

  const { showNotification } = useNotification();
  const [newProfileName, setNewProfileName] = useState('');
  const [newProfileFlagEnabled, setNewProfileFlagEnabled] = useState(false);
  const [newProfileQuantityLimit, setNewProfileQuantityLimit] = useState<number | undefined>(undefined);
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
      createProfile(newProfileName.trim(), { flagFunctionEnabled: newProfileFlagEnabled, quantityLimit: newProfileQuantityLimit });
      setNewProfileName('');
      setNewProfileFlagEnabled(false);
      setNewProfileQuantityLimit(undefined);
    }
  };

  const handleBackup = async (profileName: string) => {
    const { success, isEmpty } = await backupProfile(profileName);
    if (success) {
      if (isEmpty) {
        showNotification(t('profile.backupEmpty', { name: profileName, defaultValue: `Backup do perfil "${profileName}" criado, mas o perfil está vazio.` }));
      } else {
        showNotification(t('profile.backupSuccess', { name: profileName, defaultValue: `Backup do perfil "${profileName}" criado com sucesso!` }));
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
        alert(t('common.errorReadingFile', { error: (err instanceof Error ? err.message : String(err)), defaultValue: "Erro ao ler o arquivo de backup." }));
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
            <h2>{t('profile.modalTitle', 'Gerenciar Perfis')}</h2>
            <button className="close-btn" onClick={onClose} title={t('profile.cancel', 'Fechar')}>×</button>
          </div>
          
          <div className="modal-body">
            <div className="section profiles-section">
              <h3 className="section-title">{t('profile.yourProfiles', 'Seus Perfis')}</h3>
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
                          placeholder={t('profile.namePlaceholder', 'Nome do perfil')}
                        />
                        <div className="editor-actions">
                          <button className="icon-btn save" onClick={handleEdit} title={t('profile.save', 'Salvar')}>✓</button>
                          <button className="icon-btn cancel" onClick={() => setEditingProfile(null)} title={t('profile.cancel', 'Cancelar')}>✕</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="profile-main-row">
                          <div className="profile-info">
                            <span className="profile-name">
                              {profile}
                            </span>
                            {profile === activeProfile && <span className="badge active-badge">{t('profile.active', 'Ativo')}</span>}
                          </div>

                          <div className="profile-actions">
                            <button
                              className="icon-btn edit"
                              onClick={() => setEditingProfile(profile)}
                              title={t('profile.edit', 'Renomear perfil')}
                            >
                              ✎
                            </button>
                            <button
                              className="icon-btn backup"
                              onClick={() => handleBackup(profile)}
                              title={t('profile.backup', 'Fazer backup deste perfil')}
                            >
                              ⬇
                            </button>
                            <button
                              className="icon-btn delete"
                              onClick={() => handleDeleteClick(profile)}
                              disabled={profile === 'Default' || profile === activeProfile}
                              title={profile === 'Default' || profile === activeProfile ? t('profile.cannotDelete', "Não é possível excluir este perfil") : t('profile.delete', "Excluir perfil")}
                            >
                              🗑
                            </button>
                          </div>
                        </div>
                        {profile === activeProfile && (
                          <>
                            <label className="flag-function-toggle small">
                              <input
                                type="checkbox"
                                checked={activeProfileSettings.flagFunctionEnabled}
                                onChange={(e) => updateActiveProfileSettings({ ...activeProfileSettings, flagFunctionEnabled: e.target.checked })}
                              />
                              {t('profile.flagFunctionLabel', 'Função Alerta')}
                            </label>
                            <label className="flag-function-toggle small">
                              <input
                                type="checkbox"
                                checked={activeProfileSettings.quantityLimit !== undefined}
                                onChange={(e) =>
                                  updateActiveProfileSettings({
                                    ...activeProfileSettings,
                                    quantityLimit: e.target.checked ? 10 : undefined,
                                  })
                                }
                              />
                              {t('profile.quantityLimitLabel', 'Limitar Quantidade')}
                            </label>
                            {activeProfileSettings.quantityLimit !== undefined && (
                              <div className="quantity-limit-input small">
                                <span className="qty-limit-label">{t('profile.quantityLimitMax', 'Máx. por produto')}</span>
                                <input
                                  type="number"
                                  min={1}
                                  max={9999}
                                  value={activeProfileSettings.quantityLimit}
                                  onChange={(e) =>
                                    updateActiveProfileSettings({
                                      ...activeProfileSettings,
                                      quantityLimit: Math.max(1, Number(e.target.value) || 1),
                                    })
                                  }
                                />
                              </div>
                            )}
                          </>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="section global-actions-section">
              <h3 className="section-title">{t('profile.actions', 'Ações')}</h3>
              
              <div className="action-row create-row">
                <input
                  type="text"
                  value={newProfileName}
                  onChange={(e) => setNewProfileName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleCreate()}
                  placeholder={t('profile.namePlaceholder', 'Nome do novo perfil')}
                />
                <button className="primary-btn" onClick={handleCreate} disabled={!newProfileName.trim()}>
                  {t('profile.create', 'Criar Novo')}
                </button>
              </div>
              <label className="flag-function-toggle">
                <input
                  type="checkbox"
                  checked={newProfileFlagEnabled}
                  onChange={(e) => setNewProfileFlagEnabled(e.target.checked)}
                />
                {t('profile.flagFunctionLabel', 'Função Alerta')}
              </label>
              <label className="flag-function-toggle">
                <input
                  type="checkbox"
                  checked={newProfileQuantityLimit !== undefined}
                  onChange={(e) => setNewProfileQuantityLimit(e.target.checked ? 10 : undefined)}
                />
                {t('profile.quantityLimitLabel', 'Limitar Quantidade')}
              </label>
              {newProfileQuantityLimit !== undefined && (
                <div className="quantity-limit-input">
                  <span className="qty-limit-label">{t('profile.quantityLimitMax', 'Máx. por produto')}</span>
                  <input
                    type="number"
                    min={1}
                    max={9999}
                    value={newProfileQuantityLimit}
                    onChange={(e) => setNewProfileQuantityLimit(Math.max(1, Number(e.target.value) || 1))}
                  />
                </div>
              )}

              <div className="divider-text">{t('profile.or', 'ou')}</div>

              <div className="action-row restore-row">
                 <button className="secondary-btn restore-btn" onClick={handleRestoreClick}>
                  <span className="icon">⬆</span> {t('profile.restore', 'Restaurar Backup')}
                </button>
                <p className="help-text">{t('profile.restoreHelp', 'Restaure um arquivo .json salvo anteriormente.')}</p>
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
              {t('profile.deleteConfirm', { name: showDeleteConfirm, defaultValue: `Tem certeza que deseja deletar o perfil "${showDeleteConfirm}"?` })}
              <br />
              {t('profile.deleteWarning', 'Todos os dados associados serão perdidos permanentemente.')}
            </span>
          }
          onConfirm={confirmDelete}
          onClose={() => setShowDeleteConfirm(null)}
          confirmText={t('profile.confirmDelete', 'Sim, Excluir')}
        />
      )}
    </>
  );
};

