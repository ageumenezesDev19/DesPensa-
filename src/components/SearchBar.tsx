import React from "react";
import { Produto } from "../utils/estoque";
import "../styles/SearchBar.scss";

interface Props {
  produtos: Produto[];
  onRetirar: (produto: Produto) => void;
  result: any;
  setResult: (result: any) => void;
  preco: string;
  setPreco: (preco: string) => void;
  searchMode: "produto" | "combinacao";
  setSearchMode: (mode: "produto" | "combinacao") => void;
  handleSearch: () => void;
  searching?: boolean;
  onCancelSearch?: () => void;
  showCancel?: boolean;
  showGlobalCancel?: boolean;
}

const SearchBar: React.FC<Props> = ({ produtos, onRetirar, result, setResult, preco, setPreco, searchMode, setSearchMode, handleSearch, searching, onCancelSearch, showCancel }) => {

  const handleRetirarClick = (produto: Produto) => {
    onRetirar(produto);
    setResult(null); // Clear result after withdrawal
  };

  const handleRetirarCombinacaoClick = (combinacao: Produto[]) => {
    combinacao.forEach(produto => {
      onRetirar(produto);
    });
    setResult(null); // Clear result after withdrawal
  };

  // Usa apenas a prop showCancel do App para exibir o botão cancelar

  return (
    <div className="search-bar animated-fadein">
      <div className="search-controls">
        <input
          type="number"
          placeholder="Pesquisar por preço (R$)"
          value={preco}
          onChange={e => setPreco(e.target.value)}
          onKeyPress={e => e.key === 'Enter' && handleSearch()}
          disabled={!!searching}
        />
        <select
          value={searchMode}
          onChange={e => {
            setSearchMode(e.target.value as any);
            setResult(null);
          }}
          disabled={!!searching}
        >
          <option value="produto">Buscar Produto</option>
          <option value="combinacao">Buscar Combinação</option>
        </select>
        <button onClick={handleSearch} disabled={produtos.length === 0 || !preco || !!searching}>
          Buscar
        </button>
        </div>

      {searching && (
        <div className="search-loading">
          <span className="loader-inline" /> Buscando produtos...
          {showCancel && (
            <button className="cancel-btn loading-cancel" onClick={onCancelSearch} type="button">
              Cancelar
            </button>
          )}
        </div>
      )}

      {produtos.length === 0 && <p>Por favor, importe o arquivo `produtos.html` para começar.</p>}

      {!searching && result && result.status === "ok" && searchMode === "produto" && (
        <div className="search-result">
          <p>
            <b>{result.produto.Descrição}</b> - R$ {Number(result.produto["Preço Venda"]).toFixed(2)}
          </p>
          <button onClick={() => handleRetirarClick(result.produto)}>
            Retirar 1 unidade
          </button>
        </div>
      )}
      {!searching && result && result.status === "ok" && searchMode === "combinacao" && (
        <div className="search-result">
          <h4>Combinação encontrada:</h4>
          <ul>
            {result.combinacao.map((p: any, i: number) => (
              <li key={i}>
                {p.Descrição} - R$ {Number(p["Preço Venda"]).toFixed(2)}
              </li>
            ))}
          </ul>
          <div className="comb-row">
            <b>Total: R$ {result.combinacao.reduce((acc: number, p: any) => acc + p["Preço Venda"], 0).toFixed(2)}</b>
            <button onClick={() => handleRetirarCombinacaoClick(result.combinacao)}>
              Retirar Combinação
            </button>
          </div>
        </div>
      )}
      {!searching && result && result.status !== "ok" && (
        <div className="search-result">
          <p>Nenhum produto ou combinação encontrada para o preço desejado.</p>
        </div>
      )}
    </div>
  );
};

export default SearchBar;
