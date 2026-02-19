import React from "react";
import "./styles/main.scss";
import "./styles/ProfileManager.scss";
import { ProfileManager } from "./components/ProfileManager";
import { ProdutosView } from "./views/ProdutosView";
import { RetiradosView } from "./views/RetiradosView";
import { BlacklistView } from "./views/BlacklistView";
import { ClearDataModal } from "./components/ClearDataModal";
import Loader from "./components/Loader";
import { useEstoqueContext } from "./context/EstoqueContext";

const App: React.FC = () => {
  const [theme, setTheme] = React.useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('theme');
    return (saved as 'light' | 'dark') || 'light';
  });

  React.useEffect(() => {
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const {
    loading,
    notification,
    view,
    setView,
    searching,
    showCancel,
    handleCancelSearch,
    handleClearData
  } = useEstoqueContext();

  const [showClearModal, setShowClearModal] = React.useState(false);

  const showGlobalCancel = searching && showCancel;

  return (
    <div className="app-container" data-theme={theme}>
      {notification && (
        <div className="notification success">
          {notification}
        </div>
      )}
      {showClearModal && <ClearDataModal onClose={() => setShowClearModal(false)} onClear={(type) => { handleClearData(type); setShowClearModal(false); }} />}
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
        <div className="header-top">
          <h1>DesPensa</h1>
          <button className="theme-toggle" onClick={toggleTheme}>
            {theme === 'light' ? (
              <>
                <span className="icon">🌙</span>
                <span className="text">Modo Escuro</span>
              </>
            ) : (
              <>
                <span className="icon">☀️</span>
                <span className="text">Modo Claro</span>
              </>
            )}
          </button>
        </div>
        <nav>
          <button onClick={() => setView("produtos")} className={view === 'produtos' ? 'active' : ''}>Estoque</button>
          <button onClick={() => setView("retirados")} className={view === 'retirados' ? 'active' : ''}>Retirados</button>
          <button onClick={() => setView("blacklist")} className={view === 'blacklist' ? 'active' : ''}>Blacklist</button>
        </nav>
      </header>
      <main>
        <ProfileManager />
        {loading && !searching && <Loader />}
        {view === "produtos" && (
          <ProdutosView />
        )}
        {view === "retirados" && (
          <RetiradosView />
        )}
        {view === "blacklist" && (
          <BlacklistView />
        )}
      </main>
      <footer className="footer">
        <div className="made-by">Made by Ageu M. Costa</div>
      </footer>
    </div>
  );
};

export default App;
