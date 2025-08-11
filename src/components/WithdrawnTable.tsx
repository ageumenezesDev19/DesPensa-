import React from "react";
import "../styles/WithdrawnTable.scss";

export interface Retirado {
  Código: string;
  Descrição: string;
  "Quantidade Retirada": string;
  "Preço Venda": string;
  Data: string;
}

interface Props {
  produtos: Retirado[];
}

const WithdrawnTable: React.FC<Props> = ({ produtos }) => {
  return (
    <div className="withdrawn-table animated-fadein">
      <h2>Produtos Retirados</h2>
      <table>
        <thead>
          <tr>
            <th>Código</th>
            <th>Descrição</th>
            <th>Quantidade Retirada</th>
            <th>Preço Venda</th>
            <th>Data</th>
          </tr>
        </thead>
        <tbody>
          {produtos.map((p, i) => (
            <tr key={i}>
              <td>{p.Código}</td>
              <td>{p.Descrição}</td>
              <td>{p["Quantidade Retirada"]}</td>
              <td>R$ {Number(p["Preço Venda"]).toFixed(2)}</td>
              <td>{p.Data}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default WithdrawnTable;

