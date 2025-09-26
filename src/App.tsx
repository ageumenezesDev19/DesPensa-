import React, { useState } from "react";
import "./styles/main.scss";
import { Produto } from "./utils/estoque";
import { Retirado } from "./components/WithdrawnTable";
import { useNotification } from "./hooks/useNotification";
import { useEstoque } from "./hooks/useEstoque";
import { useViewManager } from "./hooks/useViewManager";
import { useFileHandlers } from "./hooks/useFileHandlers";
import { useSearch } from "./hooks/useSearch";
import { ProdutosView } from "./views/ProdutosView";
import { RetiradosView } from "./views/RetiradosView";
import { BlacklistView } from "./views/BlacklistView";
import { ClearDataModal } from "./components/ClearDataModal";
import Loader from "./components/Loader";
import { formatDateForDB } from "./utils/date";

export interface ProdutoComQuantidade extends Produto {
  quantidadeUtilizada: number;
}

const App: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [preco, setPreco] = useState<string>("");
  const [searchMode, setSearchMode] = useState<"produto" | "combinacao">("combinacao");
  const [focusSearchInput, setFocusSearchInput] = useState<boolean>(true);
  const [showClearModal, setShowClearModal] = useState(false);

  const { notification, showNotification } = useNotification();
  const { produtos, setProdutos, retirados, setRetirados, blacklist, setBlacklist } = useEstoque();
  const { view, setView } = useViewManager("produtos");

  const {
    handleLoadProducts, handleLoadRetirados, handleLoadBlacklist, handleDownload
  } = useFileHandlers({
    setLoading,
    setProdutos,
    produtos,
    setRetirados,
    setBlacklist,
    showNotification,
  });

  const {
    searchResult,
    setSearchResult,
    searching,
    showCancel,
    handleCancelSearch,
    handleRecalculate,
    handleSearch
  } = useSearch({
    produtos,
    blacklist,
    preco,
    searchMode,
    showNotification,
  });

  const handleRetirar = (produtoParaRetirar: Produto, quantidade: number = 1) => {
    setProdutos(prevProdutos => {
      const novosProdutos = prevProdutos
        .map(p =>
          p.Código === produtoParaRetirar.Código
            ? { ...p, Quantidade: p.Quantidade - quantidade }
            : p
        )
        .filter(p => p.Quantidade > 0);
      return novosProdutos;
    });

    const dataFormatada = formatDateForDB(new Date());

    const produtoRetirado: Retirado = {
      id: `${produtoParaRetirar.Código}-${Date.now()}`,
      produto: produtoParaRetirar,
      quantidadeRetirada: quantidade,
      Data: dataFormatada,
    };

    setRetirados(prevRetirados => [...prevRetirados, produtoRetirado]);
  };

  const handleRetirarSingleProduct = (produto: Produto) => {
    setLoading(true);
    handleRetirar(produto, 1);
    setLoading(false);
    showNotification(`Produto ${produto.Descrição} retirado do estoque.`);
    setFocusSearchInput(true);
    setPreco("");
    setSearchResult(null);
  };

  const handleRetirarCombinacao = (combinacao: ProdutoComQuantidade[]) => {
    setLoading(true);

    const produtosRetiradosMap = new Map<string, number>();
    combinacao.forEach(p => {
      produtosRetiradosMap.set(p.Código, (produtosRetiradosMap.get(p.Código) || 0) + p.quantidadeUtilizada);
    });

    setProdutos(prevProdutos => {
      return prevProdutos
        .map(p => {
          if (produtosRetiradosMap.has(p.Código)) {
            return { ...p, Quantidade: p.Quantidade - produtosRetiradosMap.get(p.Código)! };
          }
          return p;
        })
        .filter(p => p.Quantidade > 0);
    });

    const hoje = new Date();
    const dataFormatada = formatDateForDB(hoje);
    const novosRetirados: Retirado[] = combinacao.map(p => ({
      id: `${p.Código}-${Date.now()}`,
      produto: p,
      quantidadeRetirada: p.quantidadeUtilizada,
      Data: dataFormatada,
    }));

    setRetirados(prevRetirados => [...prevRetirados, ...novosRetirados]);

    const totalItems = combinacao.reduce((acc, p) => acc + p.quantidadeUtilizada, 0);

    setLoading(false);
    showNotification(`${totalItems} itens retirados do estoque.`);
    setFocusSearchInput(true);
    setPreco("");
    setSearchResult(null);
  };

  const handleDeleteRetirado = (id: string) => {
    const retiradoParaRestaurar = retirados.find(r => r.id === id);
    if (!retiradoParaRestaurar) return;

    setProdutos(prevProdutos => {
      const produtoExistente = prevProdutos.find(p => p.Código === retiradoParaRestaurar.produto.Código);
      if (produtoExistente) {
        return prevProdutos.map(p => 
          p.Código === retiradoParaRestaurar.produto.Código 
            ? { ...p, Quantidade: p.Quantidade + retiradoParaRestaurar.quantidadeRetirada } 
            : p
        );
      } else {
        return [...prevProdutos, { ...retiradoParaRestaurar.produto, Quantidade: retiradoParaRestaurar.quantidadeRetirada }];
      }
    });

    setRetirados(prevRetirados => prevRetirados.filter(r => r.id !== id));
    showNotification("Item retornado ao estoque.");
  };

  const handleClearData = (type: "produtos" | "retirados" | "all") => {
    if (type === "produtos" || type === "all") {
      setProdutos([]);
    }
    if (type === "retirados" || type === "all") {
      setRetirados([]);
    }
    if (type === "all") {
      setBlacklist([]);
    }
    setShowClearModal(false);
    const message = {
      produtos: "Dados do estoque apagados.",
      retirados: "Dados de retirados apagados.",
      all: "Todos os dados foram apagados."
    };
    showNotification(message[type]);
  };

  const showGlobalCancel = searching && showCancel;

  return (
    <div className="app-container">
      {notification && (
        <div className="notification success">
          {notification}
        </div>
      )}
      {showClearModal && <ClearDataModal onClose={() => setShowClearModal(false)} onClear={handleClearData} />}
      {(loading && (!searching || showGlobalCancel)) && (
        <div className="loader-overlay">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div className="loader"></div>
            {showGlobalCancel && (
              <button
                className="cancel-btn loading-cancel"
                onClick={handleCancelSearch}
                type="button"
                style={
                  {
                    marginTop: 32,
                    minWidth: 180,
                    fontSize: '1.1em',
                    boxShadow: '0 2px 8px rgba(244,67,54,0.10)' }
                }
              >
                Cancelar Busca
              </button>
            )}
          </div>
        </div>
      )}
      <button
        className="clear-fab"
        title="Limpar todos os dados"
        onClick={() => setShowClearModal(true)}
      >
        🧹
      </button>
      <header>
        <h1>DesPensa</h1>
        <nav>
          <button onClick={() => setView("produtos")} className={view === 'produtos' ? 'active' : ''}>Estoque</button>
          <button onClick={() => setView("retirados")} className={view === 'retirados' ? 'active' : ''}>Retirados</button>
          <button onClick={() => setView("blacklist")} className={view === 'blacklist' ? 'active' : ''}>Blacklist</button>
        </nav>
        <div className="made-by">Made by Ageu M. Costa</div>
      </header>
      <main>
        {loading && !searching && <Loader />}
        {view === "produtos" && (
          <ProdutosView
            produtos={produtos}
            handleRetirarSingleProduct={handleRetirarSingleProduct}
            handleRetirarCombinacao={handleRetirarCombinacao}
            searchResult={searchResult}
            setSearchResult={setSearchResult}
            preco={preco}
            setPreco={setPreco}
            searchMode={searchMode}
            setSearchMode={setSearchMode}
            handleSearch={handleSearch}
            handleRecalculate={handleRecalculate}
            searching={searching}
            onCancelSearch={handleCancelSearch}
            showCancel={showCancel}
            showGlobalCancel={showGlobalCancel}
            focusInput={focusSearchInput}
            setFocusInput={setFocusSearchInput}
            setLoading={setLoading}
            onFileUpload={handleLoadProducts}
          />
        )}
        {view === "retirados" && (
          <RetiradosView
            retirados={retirados}
            setLoading={setLoading}
            onFileUpload={handleLoadRetirados}
            handleDownload={(filename, content) => handleDownload(filename, content)}
            handleDelete={handleDeleteRetirado}
          />
        )}
        {view === "blacklist" && (
          <BlacklistView
            blacklist={blacklist}
            setBlacklist={setBlacklist}
            setLoading={setLoading}
            onFileUpload={handleLoadBlacklist}
            handleDownload={(filename, content) => handleDownload(filename, content)}
            showNotification={showNotification}
          />
        )}
      </main>
    </div>
  );
};

export default App;