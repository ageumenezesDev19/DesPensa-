import React from 'react';
import { useTranslation } from 'react-i18next';
import FileUpload from '../components/FileUpload';
import BlacklistManager from '../components/BlacklistManager';
import { useInventoryContext } from '../context/InventoryContext';

export const BlacklistView: React.FC = () => {
  const { t } = useTranslation();
  const {
    blacklist,
    setBlacklist,
    setLoading,
    handleLoadBlacklist,
    showNotification,
    flaggedProducts,
    handleUnflagProduct,
    activeProfileSettings,
  } = useInventoryContext();

  return (
    <>
      <div className="controls">
        <FileUpload
          setLoading={setLoading}
          onFileUpload={(content) => handleLoadBlacklist(content)}
          label={t('blacklist.importTxt', 'Importar blacklist.txt')}
          accept=".txt"
        />
      </div>
      <BlacklistManager
        blacklist={blacklist}
        setBlacklist={setBlacklist}
        showNotification={showNotification}
        flaggedProducts={flaggedProducts}
        onUnflag={handleUnflagProduct}
        flagFunctionEnabled={activeProfileSettings.flagFunctionEnabled}
      />
    </>
  );
};
