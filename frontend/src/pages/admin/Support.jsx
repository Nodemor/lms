import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { LifeBuoy } from 'lucide-react';
import api from '../../api/client';
import { useAction } from '../../lib/hooks';
import { fmtDateTime } from '../../lib/format';
import { Badge, Button, EmptyState, Modal, PageHeader, Pagination, Panel, QueryView, Select, StatusBadge, Textarea } from '../../components/ui';

export default function AdminSupport() {
  const { t } = useTranslation();
  const [status, setStatus] = useState('OPEN');
  const [page, setPage] = useState(0);
  const [open, setOpen] = useState(null);
  const q = useQuery({ queryKey: ['admin-tickets', status, page], queryFn: () => api.get('/admin/support/tickets', { params: { status: status || undefined, page } }).then((r) => r.data), placeholderData: keepPreviousData });
  const reply = useAction(() => api.post(`/admin/support/tickets/${open.id}/reply`, { reply: open.reply, status: open.status }), { success: t('common.saved'), invalidate: [['admin-tickets'], ['admin-stats']], onSuccess: () => setOpen(null) });
  return (
    <>
      <PageHeader title={t('nav.support')} subtitle={t('admin.supportSubtitle')} />
      <Panel padded={false} action={null}>
        <div className="border-b border-slate-100 p-4">
          <Select aria-label={t('common.status')} value={status} onChange={(e) => { setStatus(e.target.value); setPage(0); }} className="max-w-xs">
            <option value="">{t('common.all')}</option>{['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].map((s) => <option key={s} value={s}>{t(`status.${s}`)}</option>)}
          </Select>
        </div>
        <QueryView query={q}>
          {(d) => d.items.length === 0 ? <EmptyState icon={LifeBuoy} title={t('admin.noTickets')} /> : (
            <>
              <ul className="divide-y divide-slate-100">{d.items.map((tk) => (
                <li key={tk.id}><button className="w-full px-5 py-4 text-left hover:bg-mist" onClick={() => setOpen({ ...tk, reply: tk.adminReply || '' })}>
                  <div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{tk.subject}</p><StatusBadge status={tk.status} /><Badge tone="violet">{t(`support.categories.${tk.category}`)}</Badge></div>
                  <p className="mt-1 line-clamp-2 text-sm text-slate-600">{tk.message}</p>
                  <p className="mt-1 text-xs text-slate-500">{tk.userName} · {tk.userEmail} · {fmtDateTime(tk.createdAt)}</p>
                </button></li>
              ))}</ul>
              <Pagination page={d.page} totalPages={d.totalPages} onChange={setPage} />
            </>
          )}
        </QueryView>
      </Panel>
      <Modal open={!!open} onClose={() => setOpen(null)} title={open?.subject || ''} size="lg"
        footer={<><Button variant="outline" onClick={() => setOpen(null)}>{t('common.cancel')}</Button><Button loading={reply.isPending} onClick={() => reply.mutate()}>{t('admin.sendReply')}</Button></>}>
        {open && (
          <div className="grid gap-4">
            <p className="text-xs text-slate-500">{open.userName} · {open.userEmail} · {fmtDateTime(open.createdAt)}</p>
            <p className="whitespace-pre-line rounded-xl bg-mist p-4 text-sm">{open.message}</p>
            <Textarea label={t('support.reply')} rows={5} value={open.reply} onChange={(e) => setOpen({ ...open, reply: e.target.value })} />
            <Select label={t('common.status')} value={open.status} onChange={(e) => setOpen({ ...open, status: e.target.value })}>
              {['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].map((s) => <option key={s} value={s}>{t(`status.${s}`)}</option>)}
            </Select>
          </div>
        )}
      </Modal>
    </>
  );
}
