import en from './en';
import ko from './ko';

export const LANGUAGES = {
  en: { label: 'English', flag: '🇺🇸', translations: en },
  ko: { label: '한국어',   flag: '🇰🇷', translations: ko },
};

/**
 * Detect the user's preferred language from the browser.
 * Falls back to 'en' if not supported.
 */
export function detectLanguage() {
  const raw = navigator.language || navigator.userLanguage || 'en';
  const code = raw.toLowerCase().split('-')[0]; // 'ko-KR' → 'ko'
  return LANGUAGES[code] ? code : 'en';
}

/**
 * Get translation strings for a given language code.
 * Missing keys fall back to English so the UI never renders blank strings.
 */
export function getT(langCode) {
  const base = LANGUAGES.en.translations;
  const lang = (LANGUAGES[langCode] || LANGUAGES.en).translations;
  // Merge: use English as fallback for any key missing in the target language
  return new Proxy(lang, {
    get(target, key) {
      return key in target ? target[key] : base[key];
    },
  });
}
