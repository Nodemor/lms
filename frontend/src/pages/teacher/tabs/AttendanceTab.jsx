import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { UserCheck } from 'lucide-react';
import api from '../../../api/client';
import { EmptyState, Panel, ProgressBar, QueryView } from '../../../components/ui';
import ExportButton from '../../../components/ExportButton';
import { downloadCsv, today } from '../../../lib/csv';

export default function AttendanceTab({ cls }) {
  const { t } = useTranslation();
  const q = useQuery({ queryKey: ['class-attendance', cls.id], queryFn: () => api.get(`/teacher/classes/${cls.id}/attendance`).then((r) => r.data) });
  return (
    <Panel padded={false} title={t('tabs.attendance')} action={q.data?.students?.length > 0 && (
      <ExportButton run={async () => downloadCsv(`attendance-${cls.title}-${today()}`, [
        { label: t('students.student'), value: (s) => s.name },
        { label: t('attendance.attended'), value: (s) => s.present },
        { label: t('attendance.sessionsHeldLabel'), value: () => q.data.sessionsHeld },
        { label: t('attendance.rate'), value: (s) => `${s.percent}%` },
      ], q.data.students)} />)}>
      <QueryView query={q}>
        {(d) => d.students.length === 0 ? <EmptyState icon={UserCheck} title={t('students.none')} /> : (
          <>
            <p className="px-5 pt-4 text-sm text-slate-600">{t('attendance.sessionsHeld', { count: d.sessionsHeld })}</p>
            <div className="table-wrap"><table className="table">
              <thead><tr><th>{t('students.student')}</th><th>{t('attendance.attended')}</th><th className="w-1/3">{t('attendance.rate')}</th></tr></thead>
              <tbody>{d.students.map((s) => (
                <tr key={s.studentId}><td>{s.name}</td><td>{s.present}/{d.sessionsHeld}</td>
                  <td><div className="flex items-center gap-3"><ProgressBar value={s.percent} tone={s.percent >= 75 ? 'green' : s.percent >= 50 ? 'violet' : 'amber'} /><span className="w-10 text-right text-xs font-semibold">{s.percent}%</span></div></td></tr>
              ))}</tbody>
            </table></div>
          </>
        )}
      </QueryView>
    </Panel>
  );
}
