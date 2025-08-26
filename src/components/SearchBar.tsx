import React, { useEffect, useRef } from "react";
import { Produto } from "../utils/estoque";
import AnimatedButton from "./AnimatedButton";
import "../styles/SearchBar.scss";

import { ProdutoComQuantidade } from "../App"; // Importando o novo tipo

interface Props {
  produtos: Produto[];
  onRetirar: (produto: Produto) => void;
  onRetirarCombinacao: (combinacao: ProdutoComQuantidade[]) => void; // Tipo atualizado
  result: { status: string; produto?: Produto; combinacao?: ProdutoComQuantidade[] } | null; // Tipo atualizado
  setResult: (result: any) => void;
  preco: string;
  setPreco: (preco: string) => void;
  searchMode: "produto" | "combinacao";
  setSearchMode: (mode: "produto" | "combinacao") => void;
  handleSearch: (isRecalculation: boolean, previouslyFoundSet: Set<string> | null) => void;
  handleRecalculate: () => void;
  searching?: boolean;
  onCancelSearch?: () => void;
  showCancel?: boolean;
  showGlobalCancel?: boolean;
  maxProdutos: number;
  setMaxProdutos: React.Dispatch<React.SetStateAction<number>>;
  focusInput?: boolean;
  setFocusInput?: (focus: boolean) => void;
}

const SearchBar: React.FC<Props> = ({ produtos, onRetirar, onRetirarCombinacao, result, setResult, preco, setPreco, searchMode, setSearchMode, handleSearch, handleRecalculate, searching, onCancelSearch, showCancel, maxProdutos, setMaxProdutos, focusInput, setFocusInput }) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (focusInput && inputRef.current) {
      inputRef.current.focus();
      setFocusInput?.(false);
    }
  }, [focusInput, setFocusInput]);

  const handleRetirarClick = (produto: Produto) => {
    onRetirar(produto);
    setResult(null);
  };

  const handleRetirarCombinacaoClick = (combinacao: ProdutoComQuantidade[]) => {
    onRetirarCombinacao(combinacao);
    setResult(null);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (result && result.status === 'ok') {
        if (searchMode === 'produto' && result.produto) {
          handleRetirarClick(result.produto);
        } else if (searchMode === 'combinacao' && result.combinacao) {
          handleRetirarCombinacaoClick(result.combinacao);
        }
      } else {
        handleSearch(false, null);
      }
    }
  };

  return (
    <div className="search-bar animated-fadein">
      <div className="search-controls">
        <input
          ref={inputRef}
          type="text"
          pattern="[0-9,.]*"
          placeholder="Pesquisar por preço (R$)"
          value={preco}
          onChange={e => setPreco(e.target.value)}
          onKeyPress={handleKeyPress}
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
        <button onClick={() => handleSearch(false, null)} disabled={produtos.length === 0 || !preco || !!searching}>
          Buscar
        </button>
      </div>
      {searchMode === "combinacao" && (
        <div className="slider-container">
          <label htmlFor="maxProdutos">Max. Itens:</label>
          <input
            type="range"
            id="maxProdutos"
            min="5"
            max="50"
            value={maxProdutos}
            onChange={(e) => setMaxProdutos(Number(e.target.value))}
            disabled={!!searching}
          />
          <span>{maxProdutos}</span>
        </div>
      )}

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

      {!searching && result && result.status === "ok" && searchMode === "produto" && result.produto && (
        <div className="search-result">
          <p>
            <b>{result.produto.Descrição}</b> - R$ {Number(result.produto["Preço Venda"]).toFixed(2)} (Estoque: {result.produto.Quantidade})
          </p>
          <div className="comb-actions single-product-actions">
            <button onClick={() => handleRetirarClick(result.produto!)}>
              Retirar 1 unidade
            </button>
            <AnimatedButton onClick={handleRecalculate} title="Buscar outro produto" className="recalculate-btn">
              Recalcular
            </AnimatedButton>
          </div>
        </div>
      )}
      {!searching && result && result.status === "ok" && searchMode === "combinacao" && result.combinacao && (
        <div className="search-result">
          <h4>Combinação encontrada:</h4>
          <ul>
            {result.combinacao.map((p: any, i: number) => (
              <li key={i}>
                {p.Descrição} (<b>x{p.quantidadeUtilizada}</b>) - R$ {Number(p["Preço Venda"]).toFixed(2)} (un)
                {p.quantidadeUtilizada > 1 && <span className="total-item-price"> / Total: R$ {(Number(p["Preço Venda"]) * p.quantidadeUtilizada).toFixed(2)}</span>}
                <span className="stock-info"> (Estoque: {p.Quantidade})</span>
              </li>
            ))}
          </ul>
          <div className="comb-row">
            <b>Total da Combinação: R$ {result.combinacao.reduce((acc: number, p: any) => acc + p["Preço Venda"] * p.quantidadeUtilizada, 0).toFixed(2)}</b>
            <div className="comb-actions">
              <button onClick={() => handleRetirarCombinacaoClick(result.combinacao!)}>
                Retirar Combinação
              </button>
              <AnimatedButton onClick={handleRecalculate} title="Buscar outra combinação" className="recalculate-btn">
                Recalcular
              </AnimatedButton>
            </div>
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