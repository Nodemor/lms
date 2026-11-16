import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { LifeBuoy } from 'lucide-react';
import api from '../../api/client';
import { useAction } from '../../lib/hooks';
import { fmtDateTime } from '../../lib/format';
import ContactButtons from '../../components/ContactButtons';
import { Button, EmptyState, Input, PageHeader, Panel, QueryView, Select, StatusBadge, Textarea } from '../../components/ui';

export const TICKET_CATEGORIES = ['GENERAL', 'TECHNICAL', 'PAYMENT', 'ACCOUNT', 'COMPLAINT'];

export default function Support() {
  const { t } = useTranslation();
  const [f, setF] = useState({ category: 'GENERAL', subject: '', message: '' });
  const q = useQuery({ queryKey: ['my-tickets'], queryFn: () => api.get('/support/tickets').then((r) => r.data) });
  const create = useAction((body) => api.post('/support/tickets', body), {
    success: t('support.sent'), invalidate: [['my-tickets']], onSuccess: () => setF({ category: 'GENERAL', subject: '', message: '' }),
  });
  return (
    <>
      <PageHeader title={t('support.title')} subtitle={t('support.subtitle')} />
      <div className="mb-6 flex flex-col gap-4 rounded-panel border border-slate-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
        <div><p className="font-semibold">{t('contact.quickTitle')}</p><p className="text-sm text-slate-500">{t('contact.quickText')}</p></div>
        <ContactButtons />
      </div>
      <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
        <Panel title={t('support.newRequest')}>
          <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); create.mutate(f); }}>
            <Select label={t('support.category')} value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>
              {TICKET_CATEGORIES.map((c) => <option key={c} value={c}>{t(`support.categories.${c}`)}</option>)}
            </Select>
            <Input label={t('support.subject')} value={f.subject} maxLength={200} onChange={(e) => setF({ ...f, subject: e.target.value })} />
            <Textarea label={t('support.message')} rows={6} value={f.message} maxLength={5000} onChange={(e) => setF({ ...f, message: e.target.value })} />
            <Button type="submit" loading={create.isPending} disabled={!f.subject.trim() || !f.message.trim()}>{t('support.send')}</Button>
          </form>
        </Panel>
        <Panel title={t('support.myRequests')} padded={false}>
          <QueryView query={q}>
            {(list) => list.length === 0 ? <EmptyState icon={LifeBuoy} title={t('support.none')} /> : (
              <ul className="divide-y divide-slate-100">
                {list.map((tk) => (
                  <li key={tk.id} className="px-5 py-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold">{tk.subject}</h3><StatusBadge status={tk.status} />
                      <span className="text-xs text-slate-500">{t(`support.categories.${tk.category}`)} · {fmtDateTime(tk.createdAt)}</span>
                    </div>
                    <p className="mt-2 whitespace-pre-line text-sm text-slate-700">{tk.message}</p>
                    {tk.adminReply && (
                      <div className="mt-3 rounded-xl bg-violet-50 p-3 text-sm">
                        <p className="text-xs font-semibold text-violet-800">{t('support.reply')} · {fmtDateTime(tk.repliedAt)}</p>
                        <p className="mt-1 whitespace-pre-line text-slate-800">{tk.adminReply}</p>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </QueryView>
        </Panel>
      </div>
    </>
  );
}
