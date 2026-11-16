import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Search, Users } from 'lucide-react';
import api from '../../api/client';
import { Avatar, EmptyState, PageHeader, Panel, QueryView } from '../../components/ui';
import ExportButton from '../../components/ExportButton';
import { downloadCsv, today } from '../../lib/csv';

export default function TeacherStudents() {
  const { t } = useTranslation();
  const [q, setQ] = useState('');
  const query = useQuery({ queryKey: ['teacher-students'], queryFn: () => api.get('/teacher/students').then((r) => r.data) });
  const filter = useMemo(() => q.trim().toLowerCase(), [q]);
  return (
    <>
      <PageHeader title={t('nav.students')} subtitle={t('students.allSubtitle')}
        actions={query.data?.length > 0 && <ExportButton size="md" run={async () => downloadCsv(`all-students-${today()}`, [
          { label: t('students.student'), value: (s) => s.name },
          { label: t('auth.email'), value: (s) => s.email },
          { label: t('auth.phone'), value: (s) => s.phone || '' },
          { label: t('nav.classes'), value: (s) => s.classes.join('; ') },
        ], query.data)} />} />
      <Panel padded={false}>
        <div className="border-b border-slate-100 p-4">
          <label className="relative block max-w-md"><span className="sr-only">{t('common.search')}</span><Search className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
            <input className="input pl-10" placeholder={t('students.search')} value={q} onChange={(e) => setQ(e.target.value)} /></label>
        </div>
        <QueryView query={query}>
          {(list) => {
            const rows = list.filter((s) => !filter || s.name.toLowerCase().includes(filter) || s.email.toLowerCase().includes(filter));
            return rows.length === 0 ? <EmptyState icon={Users} title={t('students.none')} text={t('students.allEmpty')} /> : (
              <div className="table-wrap"><table className="table">
                <thead><tr><th>{t('students.student')}</th><th>{t('auth.phone')}</th><th>{t('nav.classes')}</th></tr></thead>
                <tbody>{rows.map((s) => (
                  <tr key={s.id}>
                    <td><div className="flex items-center gap-3"><Avatar name={s.name} size="sm" /><div><p className="font-medium">{s.name}</p><p className="text-xs text-slate-500">{s.email}</p></div></div></td>
                    <td className="whitespace-nowrap">{s.phone || '—'}</td>
                    <td><div className="flex flex-wrap gap-1">{s.classes.map((c) => <span key={c} className="chip bg-violet-50 text-violet-800">{c}</span>)}</div></td>
                  </tr>
                ))}</tbody>
              </table></div>
            );
          }}
        </QueryView>
      </Panel>
    </>
  );
}
