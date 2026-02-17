import React, { useState } from "react";
import { Produto } from "../utils/estoque";
import "../styles/ProductTable.scss";

interface Props {
  produtos: Produto[];
}

const ITEMS_PER_PAGE = 20;

const ProductTable: React.FC<Props> = ({ produtos }) => {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(produtos.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentProducts = produtos.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  if (produtos.length === 0) {
    return (
      <div className="product-table animated-fadein">
        <p className="empty-state">Nenhum produto em estoque.</p>
      </div>
    );
  }

  return (
    <div className="product-table animated-fadein">
      <h2>Produtos em Estoque <span className="count-badge">({produtos.length})</span></h2>
      <div className="table-responsive">
        <table>
          <thead>
            <tr>
              <th>Código</th>
              <th>Descrição</th>
              <th>Qtd.</th>
              <th>Unid.</th>
              <th>Preço</th>
            </tr>
          </thead>
          <tbody>
            {currentProducts.map((p, i) => (
              <tr key={`${p.Código}-${i}`}>
                <td className="code-cell">{p.Código}</td>
                <td className="desc-cell">{p.Descrição}</td>
                <td>{p.Quantidade}</td>
                <td>{p['Und.Sai.']}</td>
                <td className="price-cell">R$ {Number(p["Preço Venda"]).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="pagination-controls">
          <button 
            onClick={() => handlePageChange(currentPage - 1)} 
            disabled={currentPage === 1}
            className="page-btn"
          >
            Anterior
          </button>
          
          <span className="page-info">
            Página <strong>{currentPage}</strong> de <strong>{totalPages}</strong>
          </span>
          
          <button 
            onClick={() => handlePageChange(currentPage + 1)} 
            disabled={currentPage === totalPages}
            className="page-btn"
          >
            Próxima
          </button>
        </div>
      )}
    </div>
  );
};


export default ProductTable;