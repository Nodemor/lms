import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import si from './locales/si.json';
import ta from './locales/ta.json';

/**
 * To add or change any text: add the key to en.json, si.json and ta.json.
 * `npm run i18n:check` (also run automatically before every build) fails if a key or a
 * {{placeholder}} is missing in any language, or if the code uses a key that does not exist.
 * Missing keys fall back to English at runtime, so a new feature never shows a blank label.
 */
export const LANGUAGES = [
  { code: 'en', label: 'English', short: 'EN', intl: 'en-LK' },
  { code: 'si', label: 'සිංහල', short: 'සිං', intl: 'si-LK' },
  { code: 'ta', label: 'தமிழ்', short: 'தமி', intl: 'ta-LK' },
];
const STORAGE_KEY = 'nm_lang';

function initialLanguage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (LANGUAGES.some((l) => l.code === saved)) return saved;
  } catch { /* storage unavailable */ }
  const nav = (navigator.language || 'en').slice(0, 2);
  return LANGUAGES.some((l) => l.code === nav) ? nav : 'en';
}

i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, si: { translation: si }, ta: { translation: ta } },
  lng: initialLanguage(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  returnNull: false,
});

function applyLang(lng) {
  document.documentElement.lang = lng;
  document.documentElement.dataset.lang = lng;
  try { localStorage.setItem(STORAGE_KEY, lng); } catch { /* ignore */ }
}
applyLang(i18n.language);
i18n.on('languageChanged', applyLang);

export function intlLocale(lng = i18n.language) {
  return LANGUAGES.find((l) => l.code === lng)?.intl || 'en-LK';
}

export default i18n;
