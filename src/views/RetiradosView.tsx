import React from 'react';
import FileUpload from '../components/FileUpload';
import WithdrawnTable from '../components/WithdrawnTable';
import { exportarRetiradosParaCsv } from '../utils/db_utils';
import { useEstoqueContext } from '../context/EstoqueContext';

export const RetiradosView: React.FC = () => {
  const {
    retirados,
    setLoading,
    handleLoadRetirados,
    handleDownload,
    handleDeleteRetirado
  } = useEstoqueContext();

  const onDownload = () => {
    const retiradosParaExportar = retirados.map(r => ({
      id: r.id,
      Código: r.produto.Código,
      Descrição: r.produto.Descrição,
      'Quantidade Retirada': r.quantidadeRetirada,
      'Preço Venda': r.produto['Preço Venda'],
      Data: r.Data,
    }));
    const content = exportarRetiradosParaCsv(retiradosParaExportar, ['id', 'Código', 'Descrição', 'Quantidade Retirada', 'Preço Venda', 'Data']);
    handleDownload('retirados.csv', content);
  }

  return (
    <>
      <div className="controls">
        <FileUpload
          setLoading={setLoading}
          onFileUpload={(content) => handleLoadRetirados(content)}
          label="Importar retirados.csv"
          accept=".csv"
        />
        <button onClick={onDownload} disabled={retirados.length === 0}>
          Salvar/Baixar Retirados
        </button>
      </div>
      <WithdrawnTable produtos={retirados} handleDelete={handleDeleteRetirado} />
    </>
  );
};
