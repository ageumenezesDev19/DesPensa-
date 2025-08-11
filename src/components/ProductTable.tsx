import React from "react";
import { Produto } from "../utils/estoque";
import "../styles/ProductTable.scss";

interface Props {
  produtos: Produto[];
}

const ProductTable: React.FC<Props> = ({ produtos }) => {
  return (
    <div className="product-table animated-fadein">
      <h2>Produtos em Estoque</h2>
      <table>
        <thead>
          <tr>
            <th>Código</th>
            <th>Descrição</th>
            <th>Quantidade</th>
            <th>Preço Venda</th>
          </tr>
        </thead>
        <tbody>
          {produtos.map((p, i) => (
            <tr key={i}>
              <td>{p.Código}</td>
              <td>{p.Descrição}</td>
              <td>{p.Quantidade}</td>
              <td>R$ {Number(p["Preço Venda"]).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ProductTable;