import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { Search, Users } from 'lucide-react';
import api from '../../api/client';
import { useDebounced } from '../../lib/hooks';
import { fmtDate } from '../../lib/format';
import { Avatar, Badge, EmptyState, PageHeader, Pagination, Panel, QueryView, Select, StatusBadge } from '../../components/ui';

export default function AdminUsers() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const [role, setRole] = useState('');
  const [status, setStatus] = useState(params.get('status') || '');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(0);
  const dq = useDebounced(q);
  const list = useQuery({ queryKey: ['admin-users', role, status, dq, page], queryFn: () => api.get('/admin/users', { params: { role: role || undefined, status: status || undefined, q: dq, page } }).then((r) => r.data), placeholderData: keepPreviousData });
  return (
    <>
      <PageHeader title={t('nav.users')} />
      <Panel padded={false}>
        <div className="grid gap-3 border-b border-slate-100 p-4 md:grid-cols-[1fr_180px_200px]">
          <label className="relative"><span className="sr-only">{t('common.search')}</span><Search className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
            <input className="input pl-10" placeholder={t('admin.searchUsers')} value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} /></label>
          <Select aria-label={t('admin.role')} value={role} onChange={(e) => { setRole(e.target.value); setPage(0); }}>
            <option value="">{t('admin.allRoles')}</option>{['TEACHER', 'STUDENT', 'SUPER_ADMIN'].map((r) => <option key={r} value={r}>{t(`roles.${r}`)}</option>)}
          </Select>
          <Select aria-label={t('common.status')} value={status} onChange={(e) => { setStatus(e.target.value); setPage(0); }}>
            <option value="">{t('common.all')}</option>{['ACTIVE', 'PENDING_VERIFICATION', 'SUSPENDED'].map((s) => <option key={s} value={s}>{t(`status.${s}`)}</option>)}
          </Select>
        </div>
        <QueryView query={list}>
          {(d) => d.items.length === 0 ? <EmptyState icon={Users} title={t('admin.noUsers')} /> : (
            <>
              <div className="table-wrap"><table className="table">
                <thead><tr><th>{t('admin.user')}</th><th>{t('admin.role')}</th><th>{t('common.status')}</th><th>{t('admin.joined')}</th><th>{t('admin.lastLogin')}</th></tr></thead>
                <tbody>{d.items.map((u) => (
                  <tr key={u.id} className="hover:bg-mist">
                    <td><Link to={`/admin/users/${u.id}`} className="flex items-center gap-3"><Avatar name={u.fullName} size="sm" /><div><p className="font-medium text-violet-800">{u.fullName}</p><p className="text-xs text-slate-500">{u.email}</p></div></Link></td>
                    <td><Badge tone={u.role === 'TEACHER' ? 'violet' : u.role === 'SUPER_ADMIN' ? 'blue' : 'gray'}>{t(`roles.${u.role}`)}</Badge></td>
                    <td><StatusBadge status={u.status} /></td>
                    <td className="whitespace-nowrap text-slate-500">{fmtDate(u.createdAt)}</td>
                    <td className="whitespace-nowrap text-slate-500">{fmtDate(u.lastLoginAt)}</td>
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
