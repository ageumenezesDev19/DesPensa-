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

const App: React.FC = () => {
  const [view, setView] = useState<"produtos" | "retirados" | "blacklist">("produtos");
  const [loading, setLoading] = useState(false);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [retirados, setRetirados] = useState<Retirado[]>([]);
  const [blacklist, setBlacklist] = useState<string[]>([]);
  const [searchResult, setSearchResult] = useState<any>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [preco, setPreco] = useState<string>("");
  const [searchMode, setSearchMode] = useState<"produto" | "combinacao">("produto");
  const [maxProdutos, setMaxProdutos] = useState<number>(5); // New state for maxProdutos

  // Persistência de dados: Carregar do localStorage ao iniciar
  useEffect(() => {
    const produtosStorage = localStorage.getItem("produtos");
    const retiradosStorage = localStorage.getItem("retirados");
    const blacklistStorage = localStorage.getItem("blacklist");
    if (produtosStorage) setProdutos(JSON.parse(produtosStorage));
    if (retiradosStorage) setRetirados(JSON.parse(retiradosStorage));
    if (blacklistStorage) setBlacklist(JSON.parse(blacklistStorage));
  }, []);

  // Persistência de dados: Salvar no localStorage sempre que mudar
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
      }, 3000); // Notification disappears after 3 seconds
      return () => clearTimeout(timer);
    }
  }, [notification]);

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
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showNotification(`${filename} foi baixado com sucesso!`);
  };

  const handleRetirar = (produtoParaRetirar: Produto) => {
    setLoading(true);
    const novosProdutos = produtos
      .map(p =>
        p.Código === produtoParaRetirar.Código
          ? { ...p, Quantidade: p.Quantidade - 1 }
          : p
      )
      .filter(p => p.Quantidade > 0);

    setProdutos(novosProdutos);

    const hoje = new Date();
    const dataFormatada = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')} ${String(hoje.getHours()).padStart(2, '0')}:${String(hoje.getMinutes()).padStart(2, '0')}:${String(hoje.getSeconds()).padStart(2, '0')}`;

    const produtoRetirado: Retirado = {
      Código: produtoParaRetirar.Código,
      Descrição: produtoParaRetirar.Descrição,
      "Quantidade Retirada": "1",
      "Preço Venda": String(produtoParaRetirar["Preço Venda"]),
      Data: dataFormatada,
    };

    setRetirados(prevRetirados => [...prevRetirados, produtoRetirado]);
    setLoading(false);
    showNotification(`Produto ${produtoParaRetirar.Descrição} retirado do estoque.`);
  };

  // Estado para controle de busca/cancelamento
  const [searching, setSearching] = useState(false);
  const [searchCancelled, setSearchCancelled] = useState(false);
  const [showCancel, setShowCancel] = useState(false);

  // Timer para mostrar botão cancelar
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

  // Função para cancelar busca
  const handleCancelSearch = () => {
    setSearchCancelled(true);
    setSearching(false); // Esconde loading local imediatamente
    setLoading(true);    // Mostra loading global até a busca finalizar
    showNotification("Busca cancelada.");
    // Garante que o loading global não fique travado
    setTimeout(() => setLoading(false), 1500);
  };

  // Função de busca com cancelamento
  const handleSearch = async () => {
    if (!preco) return;
    setLoading(true);
    setSearching(true);
    setSearchCancelled(false);
    const precoDesejado = Number(preco);

    // Pequeno delay para garantir renderização do loading
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
      // Busca combinatória assíncrona
      let combinacao = await (await import("./utils/busca")).buscarCombinacaoGulosaAsync(
        produtos, precoDesejado, 0.4, new Set(), blacklist, 5, () => searchCancelled
      );
      if (searchCancelled) {
        setLoading(false);
        setSearching(false);
        return;
      }
      if (!combinacao || combinacao.length === 0) {
        // Usar Web Worker para busca exaustiva
        const worker = new Worker(new URL('./workers/combinationWorker.ts', import.meta.url), { type: 'module' });
        let workerResult: Produto[] | null = null;

        const workerPromise = new Promise<Produto[] | null>((resolve) => {
          worker.onmessage = (event) => {
            const { type, result, error } = event.data;
            if (type === 'result') {
              resolve(result);
            } else if (type === 'cancelled') {
              resolve(null); // Resolva com null se for cancelado
            } else if (type === 'error') {
              console.error("Worker error:", error);
              resolve(null);
            }
          };

          // Enviar mensagem para o worker iniciar a busca
          worker.postMessage({
            type: 'startSearch',
            payload: {
              df: produtos,
              precoDesejado,
              tolerancia: 0.4,
              maxProdutos,
              usados: Array.from(new Set()), // Set não é serializável, converte para Array
              blacklist,
            },
          });
        });

        // Monitorar cancelamento da UI e enviar para o worker
        const cancellationCheckInterval = setInterval(() => {
          if (searchCancelled) {
            worker.postMessage({ type: 'cancel' });
            clearInterval(cancellationCheckInterval);
          }
        }, 100); // Checa a cada 100ms

        workerResult = await workerPromise;
        clearInterval(cancellationCheckInterval); // Limpa o intervalo após a promessa ser resolvida
        worker.terminate(); // Termina o worker após o uso

        combinacao = workerResult;
      }
      if (searchCancelled) {
        setLoading(false);
        setSearching(false);
        return;
      }
      if (combinacao && combinacao.length > 0) {
        setSearchResult({ status: 'ok', combinacao: combinacao });
      } else {
        setSearchResult({ status: 'not_found' });
      }
    }
    setLoading(false);
    setSearching(false);
  };

  // Estado para modal de confirmação do clear
  const [showClearModal, setShowClearModal] = useState(false);

  // Função para limpar todos os dados
  const handleClearAll = () => {
    setProdutos([]);
    setRetirados([]);
    setBlacklist([]);
    localStorage.removeItem("produtos");
    localStorage.removeItem("retirados");
    localStorage.removeItem("blacklist");
    setShowClearModal(false);
    showNotification("Todos os dados foram apagados.");
  };

  // Flag para mostrar loading global com botão cancelar
  const showGlobalCancel = searching && showCancel;

  return (
    <div className="app-container">
      {notification && (
        <div className="notification success">
          {notification}
        </div>
      )}
      {/* Modal de confirmação para limpar dados */}
      {showClearModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Tem certeza?</h3>
            <p>Esta ação irá apagar <b>todos</b> os dados do app. Deseja continuar?</p>
            <div className="modal-actions">
              <button className="danger" onClick={handleClearAll}>Apagar Tudo</button>
              <button onClick={() => setShowClearModal(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
      {/* Loader global com botão cancelar durante busca longa ou loading normal */}
      {(loading && (!searching || showGlobalCancel)) && (
        <div className="loader-overlay">
          <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
            <div className="loader"></div>
            {showGlobalCancel && (
              <button className="cancel-btn loading-cancel" onClick={handleCancelSearch} type="button" style={{marginTop: 32, minWidth: 180, fontSize: '1.1em', boxShadow: '0 2px 8px rgba(244,67,54,0.10)'}}>
                Cancelar Busca
              </button>
            )}
          </div>
        </div>
      )}
      {/* Botão flutuante para limpar dados */}
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
              onRetirar={handleRetirar}
              result={searchResult}
              setResult={setSearchResult}
              preco={preco}
              setPreco={setPreco}
              searchMode={searchMode}
              setSearchMode={setSearchMode}
              handleSearch={handleSearch}
              searching={searching && !showGlobalCancel}
              onCancelSearch={handleCancelSearch}
              showCancel={showCancel && !showGlobalCancel}
              showGlobalCancel={showGlobalCancel}
              maxProdutos={maxProdutos}
              setMaxProdutos={setMaxProdutos}
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