import React, { useState, useEffect } from "react";
import ProductTable from "./components/ProductTable";
import WithdrawnTable, { Retirado } from "./components/WithdrawnTable";
import SearchBar from "./components/SearchBar";
import BlacklistManager from "./components/BlacklistManager";
import Loader from "./components/Loader";
import FileUpload from "./components/FileUpload";
import { Produto } from "./utils/estoque";
import { carregarDadosHtmlFromString, tratarDados, carregarRetiradosFromString, exportarRetiradosParaCsv } from "./utils/db_utils";
import { loadBlacklistFromString, saveBlacklistToString } from "./utils/blacklist_utils";
import { buscarProdutoProximo } from "./utils/busca";
import "./styles/main.scss";

// O worker agora retorna este tipo, então vamos defini-lo aqui para type safety.
export interface ProdutoComQuantidade extends Produto {
  quantidadeUtilizada: number;
}

const App: React.FC = () => {
  const [view, setView] = useState<"produtos" | "retirados" | "blacklist">("produtos");
  const [loading, setLoading] = useState(false);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [retirados, setRetirados] = useState<Retirado[]>([]);
  const [blacklist, setBlacklist] = useState<string[]>([]);
  // O searchResult agora pode conter uma combinação de `ProdutoComQuantidade`.
  const [searchResult, setSearchResult] = useState<{ status: string; produto?: Produto; combinacao?: ProdutoComQuantidade[] } | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [preco, setPreco] = useState<string>("");
  const [searchMode, setSearchMode] = useState<"produto" | "combinacao">("produto");
  const [maxProdutos, setMaxProdutos] = useState<number>(5);
  const [previouslyFound, setPreviouslyFound] = useState<Set<string>>(new Set());
  const [focusSearchInput, setFocusSearchInput] = useState<boolean>(true);

  useEffect(() => {
    const produtosStorage = localStorage.getItem("produtos");
    const retiradosStorage = localStorage.getItem("retirados");
    const blacklistStorage = localStorage.getItem("blacklist");
    if (produtosStorage) setProdutos(JSON.parse(produtosStorage));
    if (retiradosStorage) setRetirados(JSON.parse(retiradosStorage));
    if (blacklistStorage) setBlacklist(JSON.parse(blacklistStorage));
  }, []);

  useEffect(() => {
    localStorage.setItem("produtos", JSON.stringify(produtos));
  }, [produtos]);

  useEffect(() => {
    localStorage.setItem("retirados", JSON.stringify(retirados));
  }, [retirados]);

  useEffect(() => {
    localStorage.setItem("blacklist", JSON.stringify(blacklist));
  }, [blacklist]);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) {
        switch (e.key) {
          case '1':
            setView('produtos');
            break;
          case '2':
            setView('retirados');
            break;
          case '3':
            setView('blacklist');
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const showNotification = (message: string) => {
    setNotification(message);
  };

  const handleLoadProducts = (htmlContent: string) => {
    setLoading(true);
    try {
      const { df } = carregarDadosHtmlFromString(htmlContent);
      const dadosTratados = tratarDados(df);
      setProdutos(dadosTratados);
      showNotification("Produtos carregados com sucesso!");
    } catch (error) {
      console.error("Failed to load products:", error);
      showNotification("Erro ao carregar produtos.");
    } finally {
      setLoading(false);
    }
  };

  const handleLoadRetirados = (csvContent: string) => {
    setLoading(true);
    try {
      const retiradosData = carregarRetiradosFromString(csvContent);
      setRetirados(retiradosData);
      showNotification("Retirados carregados com sucesso!");
    } catch (error) {
      console.error("Failed to load withdrawn products:", error);
      showNotification("Erro ao carregar retirados.");
    } finally {
      setLoading(false);
    }
  };

  const handleLoadBlacklist = (textContent: string) => {
    setLoading(true);
    try {
      const blacklistItems = loadBlacklistFromString(textContent);
      setBlacklist(blacklistItems);
      showNotification("Blacklist carregada com sucesso!");
    } catch (error) {
      console.error("Failed to load blacklist:", error);
      showNotification("Erro ao carregar blacklist.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (filename: string, content: string) => {
    try {
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showNotification(`${filename} foi salvo com sucesso!`);
    } catch (error) {
      console.error("Erro ao salvar o arquivo:", error);
      showNotification("Ocorreu um erro ao salvar o arquivo.");
    }
  };

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

    const hoje = new Date();
    const dataFormatada = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')} ${String(hoje.getHours()).padStart(2, '0')}:${String(hoje.getMinutes()).padStart(2, '0')}:${String(hoje.getSeconds()).padStart(2, '0')}`;

    const produtoRetirado: Retirado = {
      Código: produtoParaRetirar.Código,
      Descrição: produtoParaRetirar.Descrição,
      "Quantidade Retirada": String(quantidade),
      "Preço Venda": String(produtoParaRetirar["Preço Venda"]),
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
  }

  // Atualizado para usar a nova interface ProdutoComQuantidade
  const handleRetirarCombinacao = (combinacao: ProdutoComQuantidade[]) => {
    setLoading(true);
    let totalItems = 0;
    combinacao.forEach(p => {
      handleRetirar(p, p.quantidadeUtilizada);
      totalItems += p.quantidadeUtilizada;
    });
    setLoading(false);
    showNotification(`${totalItems} itens retirados do estoque.`);
    setFocusSearchInput(true);
    setPreco("");
    setSearchResult(null);
  };

  const [searching, setSearching] = useState(false);
  const [searchCancelled, setSearchCancelled] = useState(false);
  const [showCancel, setShowCancel] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (searching) {
      setShowCancel(false);
      timer = setTimeout(() => setShowCancel(true), 10000);
    } else {
      setShowCancel(false);
    }
    return () => clearTimeout(timer);
  }, [searching]);

  const handleCancelSearch = () => {
    setSearchCancelled(true);
    setSearching(false);
    setLoading(true);
    showNotification("Busca cancelada.");
    setTimeout(() => setLoading(false), 1500);
  };

  const handleRecalculate = () => {
    if (!searchResult) return;

    const newPreviouslyFound = new Set(previouslyFound);

    if (searchResult.combinacao) {
      searchResult.combinacao.forEach((p: Produto) => newPreviouslyFound.add(p.Código));
    } else if (searchResult.produto) {
      newPreviouslyFound.add(searchResult.produto.Código);
    }

    setPreviouslyFound(newPreviouslyFound);
    setSearchResult(null); 
    handleSearch(true, newPreviouslyFound);
  };

  const handleSearch = async (isRecalculation = false, previouslyFoundSet: Set<string> | null = null) => {
    if (!preco) return;

    if (!isRecalculation) {
      setPreviouslyFound(new Set());
    }

    setLoading(true);
    setSearching(true);
    setSearchCancelled(false);
    const precoDesejado = Number(preco.replace(',', '.'));

    await new Promise(resolve => setTimeout(resolve, 50));
    if (searchCancelled) {
      setLoading(false);
      setSearching(false);
      return;
    }

    if (searchMode === "produto") {
      const produtoEncontrado = buscarProdutoProximo(produtos, precoDesejado, blacklist);
      if (searchCancelled) {
        setLoading(false);
        setSearching(false);
        return;
      }
      if (produtoEncontrado) {
        setSearchResult({ status: 'ok', produto: produtoEncontrado });
      } else {
        setSearchResult({ status: 'not_found' });
      }
    } else {
      const currentPreviouslyFound = previouslyFoundSet || previouslyFound;
      const produtosFiltrados = produtos.filter(p => !currentPreviouslyFound.has(p.Código));
      
      // A busca gulosa foi removida para usar diretamente o worker, que é mais poderoso.
      const worker = new Worker(new URL('./workers/combinationWorker.ts', import.meta.url), { type: 'module' });
      let workerResult: ProdutoComQuantidade[] | null = null;

      const workerPromise = new Promise<ProdutoComQuantidade[] | null>((resolve) => {
        worker.onmessage = (event) => {
          const { type, result, error } = event.data;
          if (type === 'result') {
            resolve(result);
          } else if (type === 'cancelled') {
            resolve(null);
          } else if (type === 'error') {
            console.error("Worker error:", error);
            resolve(null);
          }
        };

        worker.postMessage({
          type: 'startSearch',
          payload: {
            df: produtosFiltrados,
            precoDesejado,
            tolerancia: 0.4,
            maxProdutos,
            usados: Array.from(currentPreviouslyFound), // Passa os produtos já usados
            blacklist,
          },
        });
      });

      const cancellationCheckInterval = setInterval(() => {
        if (searchCancelled) {
          worker.postMessage({ type: 'cancel' });
          clearInterval(cancellationCheckInterval);
        }
      }, 100);

      workerResult = await workerPromise;
      clearInterval(cancellationCheckInterval);
      worker.terminate();

      if (searchCancelled) {
        setLoading(false);
        setSearching(false);
        return;
      }

      if (workerResult && workerResult.length > 0) {
        // Não precisamos mais do groupAndCountProducts. O worker já retorna o formato correto.
        setSearchResult({ status: 'ok', combinacao: workerResult });
      } else {
        setSearchResult({ status: 'not_found' });
      }
    }
    setFocusSearchInput(true);
    setLoading(false);
    setSearching(false);
  };

  const [showClearModal, setShowClearModal] = useState(false);

  const handleClearData = (type: "produtos" | "retirados" | "all") => {
    if (type === "produtos" || type === "all") {
      setProdutos([]);
      localStorage.removeItem("produtos");
    }
    if (type === "retirados" || type === "all") {
      setRetirados([]);
      localStorage.removeItem("retirados");
    }
    if (type === "all") {
      setBlacklist([]);
      localStorage.removeItem("blacklist");
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
      {showClearModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>O que você deseja apagar?</h3>
            <p>Esta ação é irreversível. Selecione o que deseja limpar:</p>
            <div className="modal-actions vertical">
              <button className="danger" onClick={() => handleClearData("produtos")}>
                Apagar Estoque
              </button>
              <button className="danger" onClick={() => handleClearData("retirados")}>
                Apagar Retirados
              </button>
              <button className="danger" onClick={() => handleClearData("all")}>
                Apagar Tudo
              </button>
              <button onClick={() => setShowClearModal(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
      {(loading && (!searching || showGlobalCancel)) && (
        <div className="loader-overlay">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div className="loader"></div>
            {showGlobalCancel && (
              <button className="cancel-btn loading-cancel" onClick={handleCancelSearch} type="button" style={{ marginTop: 32, minWidth: 180, fontSize: '1.1em', boxShadow: '0 2px 8px rgba(244,67,54,0.10)' }}>
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
      </header>
      <main>
        {loading && !searching && <Loader />}
        {view === "produtos" && (
          <>
            <SearchBar
              produtos={produtos}
              onRetirar={handleRetirarSingleProduct}
              onRetirarCombinacao={handleRetirarCombinacao}
              result={searchResult}
              setResult={setSearchResult}
              preco={preco}
              setPreco={setPreco}
              searchMode={searchMode}
              setSearchMode={setSearchMode}
              handleSearch={() => handleSearch(false)}
              handleRecalculate={handleRecalculate}
              searching={searching && !showGlobalCancel}
              onCancelSearch={handleCancelSearch}
              showCancel={showCancel && !showGlobalCancel}
              showGlobalCancel={showGlobalCancel}
              maxProdutos={maxProdutos}
              setMaxProdutos={setMaxProdutos}
              focusInput={focusSearchInput}
              setFocusInput={setFocusSearchInput}
            />
            <div className="controls">
              <FileUpload
                setLoading={setLoading}
                onFileUpload={handleLoadProducts}
                label="Importar produtos.html"
                accept=".html"
              />
            </div>
            <ProductTable produtos={produtos} />
          </>
        )}
        {view === "retirados" && (
          <>
            <div className="controls">
              <FileUpload
                setLoading={setLoading}
                onFileUpload={handleLoadRetirados}
                label="Importar retirados.csv"
                accept=".csv"
              />
              <button onClick={() => handleDownload('retirados.csv', exportarRetiradosParaCsv(retirados, ['Código', 'Descrição', 'Quantidade Retirada', 'Preço Venda', 'Data']))} disabled={retirados.length === 0}>
                Salvar/Baixar Retirados
              </button>
            </div>
            <WithdrawnTable produtos={retirados} />
          </>
        )}
        {view === "blacklist" && (
          <>
            <div className="controls">
              <FileUpload
                setLoading={setLoading}
                onFileUpload={handleLoadBlacklist}
                label="Importar blacklist.txt"
                accept=".txt"
              />
              <button onClick={() => handleDownload('blacklist.txt', saveBlacklistToString(blacklist))} disabled={blacklist.length === 0}>
                Salvar/Baixar Blacklist
              </button>
            </div>
            <BlacklistManager
              blacklist={blacklist}
              setBlacklist={setBlacklist}
              showNotification={showNotification}
            />
          </>
        )}
      </main>
    </div>
  );
};

export default App;
