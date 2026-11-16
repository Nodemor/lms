import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { ShieldCheck } from 'lucide-react';
import api from '../../api/client';
import { useDebounced } from '../../lib/hooks';
import { fmtDateTime } from '../../lib/format';
import { Badge, EmptyState, Input, PageHeader, Pagination, Panel, QueryView, Tabs } from '../../components/ui';

const DANGER = ['LOGIN_FAILED', 'ACCOUNT_LOCKED', 'REFRESH_TOKEN_REUSE', 'PAYMENT_MISMATCH', 'USER_SUSPENDED'];

export default function AdminAudit() {
  const { t } = useTranslation();
  const [tab, setTab] = useState('security');
  const [action, setAction] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(0);
  const da = useDebounced(action);
  const dq = useDebounced(q);
  const query = useQuery({
    queryKey: ['audit', tab, da, dq, page],
    queryFn: () => (tab === 'security'
      ? api.get('/admin/security-events', { params: { page } })
      : api.get('/admin/audit-logs', { params: { action: da.trim().toUpperCase(), q: dq, page } })).then((r) => r.data),
    placeholderData: keepPreviousData,
  });
  return (
    <>
      <PageHeader title={t('nav.security')} subtitle={t('admin.auditSubtitle')} />
      <Tabs tabs={[{ id: 'security', label: t('admin.securityEvents') }, { id: 'all', label: t('admin.auditLog') }]} active={tab} onChange={(v) => { setTab(v); setPage(0); }} />
      <Panel padded={false} className="mt-5">
        {tab === 'all' && (
          <div className="grid gap-3 border-b border-slate-100 p-4 sm:grid-cols-2 lg:max-w-2xl">
            <Input aria-label={t('admin.action')} placeholder={t('admin.actionPlaceholder')} value={action} onChange={(e) => { setAction(e.target.value); setPage(0); }} />
            <Input aria-label={t('auth.email')} placeholder={t('admin.actorPlaceholder')} value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} />
          </div>
        )}
        <QueryView query={query}>
          {(d) => d.items.length === 0 ? <EmptyState icon={ShieldCheck} title={t('admin.noEvents')} /> : (
            <>
              <div className="table-wrap"><table className="table">
                <thead><tr><th>{t('payments.date')}</th><th>{t('admin.action')}</th><th>{t('admin.actor')}</th><th>{t('admin.details')}</th><th>IP</th></tr></thead>
                <tbody>{d.items.map((a) => (
                  <tr key={a.id}>
                    <td className="whitespace-nowrap text-slate-500">{fmtDateTime(a.createdAt)}</td>
                    <td><Badge tone={DANGER.includes(a.action) ? 'red' : 'gray'}>{a.action}</Badge></td>
                    <td className="max-w-[14rem] truncate">{a.actorEmail || '—'}</td>
                    <td className="max-w-[18rem] truncate text-slate-600" title={a.details}>{[a.entityType, a.details].filter(Boolean).join(' · ') || '—'}</td>
                    <td className="whitespace-nowrap text-xs text-slate-500">{a.ipAddress || '—'}</td>
                  </tr>
                ))}</tbody>
              </table></div>
              <Pagination page={d.page} totalPages={d.totalPages} onChange={setPage} />
            </>
          )}
        </QueryView>
      </Panel>
    </>
  );
}
