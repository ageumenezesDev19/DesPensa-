import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import translationEN from './locales/en/translation.json';
import translationPT from './locales/pt/translation.json';

// Get the user's preferred language from localStorage or fallback to standard browser language
const savedLanguage = localStorage.getItem('i18nextLng');
const browserLang = navigator.language.split('-')[0];
const defaultLang = savedLanguage || (browserLang === 'pt' ? 'pt' : 'en');

const resources = {
  en: {
    translation: translationEN,
  },
  pt: {
    translation: translationPT,
  },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: defaultLang,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
