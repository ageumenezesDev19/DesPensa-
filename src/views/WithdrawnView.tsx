import React, { useMemo } from 'react';
import FileUpload from '../components/FileUpload';
import WithdrawnTable from '../components/WithdrawnTable';
import { useInventoryContext } from '../context/InventoryContext';
import { useTranslation } from 'react-i18next';

export const WithdrawnView: React.FC = () => {
  const { t } = useTranslation();
  const {
    withdrawn,
    setLoading,
    handleLoadWithdrawn,
    handleDeleteWithdrawn,
    handleFlagProduct,
    flaggedProducts,
    activeProfileSettings,
  } = useInventoryContext();

  const flaggedCodes = useMemo(
    () => new Set(flaggedProducts.map(f => f.code)),
    [flaggedProducts]
  );

  return (
    <>
      <div className="controls">
        <FileUpload
          setLoading={setLoading}
          onFileUpload={(content) => handleLoadWithdrawn(content)}
          label={t('withdrawn.importCsv', 'Importar retirados.csv')}
          accept=".csv"
        />
      </div>
      <WithdrawnTable
        products={withdrawn}
        handleDelete={handleDeleteWithdrawn}
        handleFlag={handleFlagProduct}
        flagFunctionEnabled={activeProfileSettings.flagFunctionEnabled}
        flaggedCodes={flaggedCodes}
      />
    </>
  );
};
