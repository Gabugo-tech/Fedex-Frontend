import React, { createContext, useContext, useState, useEffect } from 'react';
import { detectLanguage, getT, LANGUAGES } from './index';

const LanguageContext = createContext(null);

const STORAGE_KEY = 'gbt-lang';

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => {
    // 1. Check if user previously chose a language
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && LANGUAGES[saved]) return saved;
    // 2. Otherwise auto-detect from browser
    return detectLanguage();
  });

  // Persist choice
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, lang);
    // Set html lang attribute for accessibility
    document.documentElement.lang = lang;
  }, [lang]);

  const t = getT(lang);

  function switchLang(code) {
    if (LANGUAGES[code]) setLang(code);
  }

  return (
    <LanguageContext.Provider value={{ lang, t, switchLang, LANGUAGES }}>
      {children}
    </LanguageContext.Provider>
  );
}

/** Hook — use anywhere: const { t, lang, switchLang } = useLang(); */
export function useLang() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLang must be used inside LanguageProvider');
  return ctx;
}
