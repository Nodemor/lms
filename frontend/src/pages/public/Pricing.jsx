import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Check, Minus } from 'lucide-react';
import clsx from 'clsx';
import api from '../../api/client';
import { fmtMoney } from '../../lib/format';
import { QueryView } from '../../components/ui';
import ContactButtons from '../../components/ContactButtons';
import { useContact, whatsappLink } from '../../lib/contact';

export function PlanFeatures({ p }) {
  const { t } = useTranslation();
  const row = (ok, text) => (
    <li className={clsx('flex gap-2', !ok && 'text-slate-400')}>
      {ok ? <Check className="h-4 w-4 shrink-0 text-violet-600" /> : <Minus className="h-4 w-4 shrink-0" />}{text}
    </li>
  );
  return (
    <ul className="space-y-2 text-sm">
      {row(true, t('plans.classes', { count: p.maxClasses }))}
      {row(true, t('plans.students', { count: p.maxStudents }))}
      {row(true, t('plans.storage', { gb: Math.round(p.storageMb / 1024) }))}
      {row(true, t('plans.liveAndLessons'))}
      {row(p.advancedAnalytics, t('plans.analytics'))}
      {row(p.prioritySupport, t('plans.priority'))}
      {row(p.customBranding, t('plans.branding'))}
    </ul>
  );
}

export default function Pricing() {
  const { t } = useTranslation();
  const contact = useContact();
  const q = useQuery({ queryKey: ['plans'], queryFn: () => api.get('/public/plans').then((r) => r.data) });
  return (
    <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
      <h1 className="text-4xl font-bold tracking-tight">{t('pricing.title')}</h1>
      <p className="mt-2 max-w-2xl text-slate-600">{t('pricing.subtitle')}</p>
      <QueryView query={q}>
        {(plans) => (
          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {plans.map((p) => {
              const featured = p.code === 'PROFESSIONAL';
              return (
                <div key={p.id} className={clsx('flex flex-col rounded-panel border p-6', featured ? 'border-ink bg-ink text-white' : 'border-slate-200 bg-white')}>
                  <h2 className="text-lg font-semibold">{p.name}</h2>
                  <p className="mt-3 font-display text-3xl font-bold">{Number(p.priceMonthly) === 0 ? t('class.free') : fmtMoney(p.priceMonthly, p.currency)}</p>
                  <p className={clsx('text-sm', featured ? 'text-white/60' : 'text-slate-500')}>{t('pricing.perMonth')}</p>
                  <div className={clsx('mt-6 flex-1', featured && '[&_li]:text-white/90')}><PlanFeatures p={p} /></div>
                  {Number(p.priceMonthly) === 0
                    ? <Link to="/register?role=TEACHER" className={clsx('mt-6', featured ? 'btn-primary' : 'btn-outline')}>{t('pricing.start')}</Link>
                    : <a href={whatsappLink(contact.whatsapp, t('pricing.whatsappMessage', { plan: p.name }))} target="_blank" rel="noopener noreferrer"
                        className={clsx('mt-6', featured ? 'btn-primary' : 'btn-outline')}>{t('pricing.contactWhatsapp')}</a>}
                </div>
              );
            })}
          </div>
        )}
      </QueryView>
      <div className="mt-10 rounded-panel border border-slate-200 bg-mist p-6">
        <h2 className="text-lg font-semibold">{t('pricing.howTitle')}</h2>
        <p className="mt-1 text-sm text-slate-600">{t('pricing.howText')}</p>
        <ContactButtons className="mt-4" message={t('pricing.whatsappGeneral')} />
      </div>
      <p className="mt-6 text-sm text-slate-500">{t('pricing.note')}</p>
    </div>
  );
}
