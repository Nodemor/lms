import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { LANGUAGES } from '../../i18n';
import { useAuth } from '../../context/AuthContext';

/** Segmented control: all three scripts are always visible, so anyone can find their language. */
export default function LanguageSwitcher({ dark = false }) {
  const { i18n, t } = useTranslation();
  const { changeLanguage } = useAuth();
  return (
    <div role="radiogroup" aria-label={t('common.language')}
      className={clsx('inline-flex rounded-xl p-1', dark ? 'bg-white/10' : 'bg-slate-100')}>
      {LANGUAGES.map((l) => {
        const active = i18n.language === l.code;
        return (
          <button key={l.code} role="radio" aria-checked={active} lang={l.code} title={l.label}
            onClick={() => changeLanguage(l.code)}
            className={clsx('h-8 rounded-lg px-2.5 text-xs font-semibold transition',
              active ? (dark ? 'bg-white text-ink' : 'bg-white text-ink shadow-sm') : (dark ? 'text-white/70 hover:text-white' : 'text-slate-500 hover:text-slate-900'))}>
            {l.short}
          </button>
        );
      })}
    </div>
  );
}
