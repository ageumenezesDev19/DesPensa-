import React from 'react';
import FileUpload from '../components/FileUpload';
import WithdrawnTable from '../components/WithdrawnTable';
import { useEstoqueContext } from '../context/EstoqueContext';

export const RetiradosView: React.FC = () => {
  const {
    retirados,
    setLoading,
    handleLoadRetirados,
    handleDeleteRetirado
  } = useEstoqueContext();


  return (
    <>
      <div className="controls">
        <FileUpload
          setLoading={setLoading}
          onFileUpload={(content) => handleLoadRetirados(content)}
          label="Importar retirados.csv"
          accept=".csv"
        />
      </div>
      <WithdrawnTable produtos={retirados} handleDelete={handleDeleteRetirado} />
    </>
  );
};
