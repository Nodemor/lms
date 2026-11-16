import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';

/**
 * Back button for inner pages. Uses browser history when the user navigated inside the app,
 * otherwise (opened from a link/bookmark) goes up one level, so it never leaves the site.
 */
export default function BackButton({ roots = [] }) {
  const { t } = useTranslation();
  const nav = useNavigate();
  const { pathname } = useLocation();
  if (roots.includes(pathname)) return null;
  const goBack = () => {
    if ((window.history.state?.idx ?? 0) > 0) { nav(-1); return; }
    const parent = pathname.replace(/\/[^/]+\/?$/, '') || '/';
    nav(parent === '' ? '/' : parent);
  };
  return (
    <button onClick={goBack} className="btn-ghost h-10 gap-1.5 px-2.5" aria-label={t('common.back')}>
      <ArrowLeft className="h-5 w-5" /><span className="hidden sm:inline">{t('common.back')}</span>
    </button>
  );
}
