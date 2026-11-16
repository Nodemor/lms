import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useContact, whatsappLink } from '../../lib/contact';
import ContactButtons from '../../components/ContactButtons';
import { fmtBytes, fmtDate, fmtMoney } from '../../lib/format';
import { Badge, PageHeader, Panel, ProgressBar, QueryView } from '../../components/ui';
import { PlanFeatures } from '../public/Pricing';

export default function Subscription() {
  const { t } = useTranslation();
  const sub = useQuery({ queryKey: ['subscription'], queryFn: () => api.get('/teacher/subscription').then((r) => r.data) });
  const plans = useQuery({ queryKey: ['plans'], queryFn: () => api.get('/public/plans').then((r) => r.data) });
  const { user } = useAuth();
  const contact = useContact();
  const requestMessage = (plan) => t('subscription.whatsappMessage', { plan: plan.name, name: user.fullName, email: user.email });
  return (
    <>
      <PageHeader title={t('nav.subscription')} subtitle={t('subscription.subtitle')} />
      <QueryView query={sub}>
        {(s) => {
          const p = s.effectivePlan;
          const usage = [
            { label: t('nav.myClasses'), used: s.usage.classes, max: p.maxClasses, text: `${s.usage.classes}/${p.maxClasses}` },
            { label: t('nav.students'), used: s.usage.students, max: p.maxStudents, text: `${s.usage.students}/${p.maxStudents}` },
            { label: t('subscription.storage'), used: s.usage.storageBytes, max: p.storageMb * 1024 * 1024, text: `${fmtBytes(s.usage.storageBytes)} / ${fmtBytes(p.storageMb * 1024 * 1024)}` },
          ];
          return (
            <div className="grid gap-6">
              <Panel>
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="font-display text-2xl font-bold">{p.name}</h2>
                  {s.status === 'PAST_DUE' && <Badge tone="red">{t('status.PAST_DUE')}</Badge>}
                  {s.currentPeriodEnd && <span className="text-sm text-slate-500">{t('subscription.renews', { date: fmtDate(s.currentPeriodEnd) })}</span>}
                </div>
                {s.subscribedPlan.code !== p.code && <p className="mt-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{t('subscription.lapsed', { plan: s.subscribedPlan.name })}</p>}
                <div className="mt-6 grid gap-5 sm:grid-cols-3">
                  {usage.map((u) => (
                    <div key={u.label}><div className="mb-1.5 flex justify-between text-sm"><span className="font-medium">{u.label}</span><span className="text-slate-500">{u.text}</span></div>
                      <ProgressBar value={(u.used / u.max) * 100} tone={u.used / u.max > 0.9 ? 'amber' : 'violet'} /></div>
                  ))}
                </div>
              </Panel>
              <QueryView query={plans}>
                {(list) => (
                  <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                    {list.map((pl) => {
                      const current = pl.code === p.code;
                      return (
                        <div key={pl.id} className={clsx('flex flex-col rounded-panel border bg-white p-6', current ? 'border-violet-500 ring-2 ring-violet-200' : 'border-slate-200')}>
                          <div className="flex items-center justify-between"><h3 className="text-lg font-semibold">{pl.name}</h3>{current && <Badge tone="violet">{t('subscription.current')}</Badge>}</div>
                          <p className="mt-2 font-display text-2xl font-bold">{Number(pl.priceMonthly) === 0 ? t('class.free') : fmtMoney(pl.priceMonthly, pl.currency)}</p>
                          <p className="text-sm text-slate-500">{t('pricing.perMonth')}</p>
                          <div className="mt-5 flex-1"><PlanFeatures p={pl} /></div>
                          {Number(pl.priceMonthly) > 0 && (
                            <a href={whatsappLink(contact.whatsapp, requestMessage(pl))} target="_blank" rel="noopener noreferrer"
                              className={clsx('mt-6', current ? 'btn-outline' : 'btn-primary')}>
                              {current ? t('subscription.renewWhatsapp') : t('subscription.requestWhatsapp')}
                            </a>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </QueryView>
              <Panel title={t('subscription.howTitle')}>
                <ol className="list-decimal space-y-1.5 pl-5 text-sm text-slate-600">
                  <li>{t('subscription.how1')}</li><li>{t('subscription.how2')}</li><li>{t('subscription.how3')}</li>
                </ol>
                <ContactButtons className="mt-4" message={t('subscription.whatsappGeneral', { name: user.fullName, email: user.email })} />
              </Panel>
              <p className="text-sm text-slate-500">{t('subscription.note')}</p>
            </div>
          );
        }}
      </QueryView>
    </>
  );
}
