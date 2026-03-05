import React from "react";
import "./styles/main.scss";
import "./styles/ProfileManager.scss";
import { ProfileManager } from "./components/ProfileManager";
import { InventoryView } from "./views/InventoryView";
import { WithdrawnView } from "./views/WithdrawnView";
import { BlacklistView } from "./views/BlacklistView";
import { ClearDataModal } from "./components/ClearDataModal";
import Loader from "./components/Loader";
import { useInventoryContext } from "./context/InventoryContext";
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from "./components/LanguageSwitcher";
import { ErrorBoundary } from "./components/ErrorBoundary";

const App: React.FC = () => {
  const { t } = useTranslation();
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
  } = useInventoryContext();

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
                {t('app.cancelSearch')}
              </button>
            )}
          </div>
        </div>
      )}
      <button
        className="clear-fab"
        title={t('app.clearAllData')}
        onClick={() => setShowClearModal(true)}
      >
        🧹
      </button>
      <header>
        <div className="header-top">
          <h1>{t('app.title')}</h1>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <LanguageSwitcher />
            <button className="theme-toggle" onClick={toggleTheme}>
              {theme === 'light' ? (
                <>
                  <span className="icon">🌙</span>
                  <span className="text">{t('app.darkMode')}</span>
                </>
              ) : (
                <>
                  <span className="icon">☀️</span>
                  <span className="text">{t('app.lightMode')}</span>
                </>
              )}
            </button>
          </div>
        </div>
        <nav>
          <button onClick={() => setView("inventory")} className={view === 'inventory' ? 'active' : ''}>{t('app.inventory')}</button>
          <button onClick={() => setView("withdrawn")} className={view === 'withdrawn' ? 'active' : ''}>{t('app.withdrawn')}</button>
          <button onClick={() => setView("blacklist")} className={view === 'blacklist' ? 'active' : ''}>{t('app.blacklist')}</button>
        </nav>
      </header>
      <main>
        <ProfileManager />
        {loading && !searching && <Loader />}
        <ErrorBoundary key={view}>
          {view === "inventory" && (
            <InventoryView />
          )}
          {view === "withdrawn" && (
            <WithdrawnView />
          )}
          {view === "blacklist" && (
            <BlacklistView />
          )}
        </ErrorBoundary>
      </main>
      <footer className="footer">
        <div className="made-by">{t('app.madeBy')}</div>
      </footer>
    </div>
  );
};

export default App;
