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

// Better approach: Re-export from context or types.
// But checking the codebase, `ProdutosView` imported it from `../App`.
// We should update `ProdutosView` to import from context or a shared types file.
// For now, let's just leave a re-export or similar if needed.
// Actually, I'll remove it from here and update the imports in other files.
// But wait, `App.tsx` does not need to export it anymore if it's not using it.
// Let's check who imports it. `ProdutosView` does.
// I will fix `ProdutosView` imports in the next step.

const App: React.FC = () => {
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
    <div className="app-container">
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
        <h1>DesPensa</h1>
        <nav>
          <button onClick={() => setView("produtos")} className={view === 'produtos' ? 'active' : ''}>Estoque</button>
          <button onClick={() => setView("retirados")} className={view === 'retirados' ? 'active' : ''}>Retirados</button>
          <button onClick={() => setView("blacklist")} className={view === 'blacklist' ? 'active' : ''}>Blacklist</button>
        </nav>
        <div className="made-by">Made by Ageu M. Costa</div>
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
    </div>
  );
};

export default App;
