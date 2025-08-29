
import React from 'react';
import FileUpload from '../components/FileUpload';
import WithdrawnTable, { Retirado } from '../components/WithdrawnTable';
import { exportarRetiradosParaCsv } from '../utils/db_utils';

interface RetiradosViewProps {
  retirados: Retirado[];
  setLoading: (loading: boolean) => void;
  onFileUpload: (content: string) => void;
  handleDownload: (filename: string, content: string) => void;
}

export const RetiradosView: React.FC<RetiradosViewProps> = ({
  retirados,
  setLoading,
  onFileUpload,
  handleDownload,
}) => {

  const onDownload = () => {
    const content = exportarRetiradosParaCsv(retirados, ['Código', 'Descrição', 'Quantidade Retirada', 'Preço Venda', 'Data']);
    handleDownload('retirados.csv', content);
  }

  return (
    <>
      <div className="controls">
        <FileUpload
          setLoading={setLoading}
          onFileUpload={onFileUpload}
          label="Importar retirados.csv"
          accept=".csv"
        />
        <button onClick={onDownload} disabled={retirados.length === 0}>
          Salvar/Baixar Retirados
        </button>
      </div>
      <WithdrawnTable produtos={retirados} />
    </>
  );
};
