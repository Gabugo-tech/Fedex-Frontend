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
 */
export function getT(langCode) {
  return (LANGUAGES[langCode] || LANGUAGES.en).translations;
}
