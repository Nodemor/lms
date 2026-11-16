import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { Archive, School, Search } from 'lucide-react';
import api from '../../api/client';
import { useAction, useDebounced } from '../../lib/hooks';
import { fmtDate } from '../../lib/format';
import { Price } from '../../components/ClassCard';
import { Button, ConfirmDialog, EmptyState, PageHeader, Pagination, Panel, QueryView, Select, StatusBadge } from '../../components/ui';

export default function AdminClasses() {
  const { t } = useTranslation();
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(0);
  const [archiveId, setArchiveId] = useState(null);
  const dq = useDebounced(q);
  const list = useQuery({ queryKey: ['admin-classes', status, dq, page], queryFn: () => api.get('/admin/classes', { params: { status: status || undefined, q: dq, page } }).then((r) => r.data), placeholderData: keepPreviousData });
  const archive = useAction((id) => api.post(`/admin/classes/${id}/archive`), { success: t('admin.classArchived'), invalidate: [['admin-classes']], onSuccess: () => setArchiveId(null) });
  return (
    <>
      <PageHeader title={t('nav.classes')} subtitle={t('admin.classesSubtitle')} />
      <Panel padded={false}>
        <div className="grid gap-3 border-b border-slate-100 p-4 md:grid-cols-[1fr_200px]">
          <label className="relative"><span className="sr-only">{t('common.search')}</span><Search className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
            <input className="input pl-10" placeholder={t('explore.searchPlaceholder')} value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} /></label>
          <Select aria-label={t('common.status')} value={status} onChange={(e) => { setStatus(e.target.value); setPage(0); }}>
            <option value="">{t('common.all')}</option>{['DRAFT', 'PUBLISHED', 'ARCHIVED'].map((s) => <option key={s} value={s}>{t(`status.${s}`)}</option>)}
          </Select>
        </div>
        <QueryView query={list}>
          {(d) => d.items.length === 0 ? <EmptyState icon={School} title={t('admin.noClasses')} /> : (
            <>
              <div className="table-wrap"><table className="table">
                <thead><tr><th>{t('class.title')}</th><th>{t('admin.teacher')}</th><th>{t('nav.students')}</th><th>{t('class.billing')}</th><th>{t('common.status')}</th><th>{t('admin.created')}</th><th /></tr></thead>
                <tbody>{d.items.map((c) => (
                  <tr key={c.id}>
                    <td><Link to={`/classes/${c.id}`} className="font-medium text-violet-800">{c.title}</Link><p className="text-xs text-slate-500">{c.subject}</p></td>
                    <td><Link to={`/admin/users/${c.teacherId}`} className="hover:underline">{c.teacherName}</Link></td>
                    <td>{c.studentCount}</td>
                    <td className="whitespace-nowrap"><Price c={c} /></td>
                    <td><StatusBadge status={c.status} /></td>
                    <td className="whitespace-nowrap text-slate-500">{fmtDate(c.createdAt)}</td>
                    <td>{c.status !== 'ARCHIVED' && <Button size="sm" variant="ghost" onClick={() => setArchiveId(c.id)}><Archive className="h-4 w-4" />{t('classes.archive')}</Button>}</td>
                  </tr>
                ))}</tbody>
              </table></div>
              <Pagination page={d.page} totalPages={d.totalPages} onChange={setPage} />
            </>
          )}
        </QueryView>
      </Panel>
      <ConfirmDialog open={!!archiveId} danger title={t('classes.archive')} text={t('admin.archiveConfirm')} confirmLabel={t('classes.archive')} loading={archive.isPending}
        onConfirm={() => archive.mutate(archiveId)} onClose={() => setArchiveId(null)} />
    </>
  );
}
