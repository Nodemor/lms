import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function NotFound() {
  const { t } = useTranslation();
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <p className="font-display text-7xl font-bold text-violet-500">404</p>
      <h1 className="mt-4 text-2xl font-bold">{t('notFound.title')}</h1>
      <p className="mt-2 text-slate-500">{t('notFound.text')}</p>
      <Link to="/" className="btn-primary mt-6">{t('notFound.home')}</Link>
    </div>
  );
}
