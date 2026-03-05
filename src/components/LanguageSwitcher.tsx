import React from 'react';
import { useTranslation } from 'react-i18next';
import '../styles/LanguageSwitcher.scss';

export const LanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation();

  const currentLang = i18n.language.startsWith('pt') ? 'pt' : 'en';

  const changeLanguage = (lng: string) => {
    if (currentLang === lng) return;
    
    i18n.changeLanguage(lng);
    localStorage.setItem('i18nextLng', lng);
    
    // Reload to ensure all context / storage hooks grab the new keys
    window.location.reload();
  };

  return (
    <div className="language-switcher">
      <button 
        className={`lang-btn ${currentLang === 'pt' ? 'active' : ''}`}
        onClick={() => changeLanguage('pt')}
        title="Português"
      >
        PT
      </button>
      <span className="divider">|</span>
      <button 
        className={`lang-btn ${currentLang === 'en' ? 'active' : ''}`}
        onClick={() => changeLanguage('en')}
        title="English"
      >
        EN
      </button>
    </div>
  );
};
