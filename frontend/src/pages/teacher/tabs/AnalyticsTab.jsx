import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, ClipboardList, Radio, Users } from 'lucide-react';
import api from '../../../api/client';
import { EmptyState, Panel, ProgressBar, QueryView, Stat } from '../../../components/ui';

export default function AnalyticsTab({ cls }) {
  const { t } = useTranslation();
  const q = useQuery({ queryKey: ['class-analytics', cls.id], queryFn: () => api.get(`/teacher/classes/${cls.id}/analytics`).then((r) => r.data) });
  const cell = (v) => <div className="flex items-center gap-2"><ProgressBar value={v} tone={v >= 75 ? 'green' : v >= 40 ? 'violet' : 'amber'} /><span className="w-10 text-right text-xs font-semibold">{v}%</span></div>;
  return (
    <QueryView query={q}>
      {(d) => (
        <div className="grid gap-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Stat icon={Users} label={t('nav.students')} value={d.students} tone="ink" />
            <Stat icon={Radio} label={t('analytics.avgAttendance')} value={`${d.avgAttendance}%`} hint={t('attendance.sessionsHeld', { count: d.sessionsHeld })} />
            <Stat icon={BookOpen} label={t('analytics.avgLessons')} value={`${d.avgLessonCompletion}%`} hint={t('analytics.lessonsCount', { count: d.lessons })} />
            <Stat icon={ClipboardList} label={t('analytics.avgSubmissions')} value={`${d.avgSubmissionRate}%`} hint={t('analytics.assignmentsCount', { count: d.assignments })} tone="green" />
          </div>
          <Panel title={t('analytics.perStudent')} padded={false}>
            {d.perStudent.length === 0 ? <EmptyState icon={Users} title={t('students.none')} /> : (
              <div className="table-wrap"><table className="table">
                <thead><tr><th>{t('students.student')}</th><th className="w-1/4">{t('tabs.attendance')}</th><th className="w-1/4">{t('tabs.lessons')}</th><th className="w-1/4">{t('tabs.assignments')}</th></tr></thead>
                <tbody>{d.perStudent.map((s) => <tr key={s.studentId}><td>{s.name}</td><td>{cell(s.attendance)}</td><td>{cell(s.lessonCompletion)}</td><td>{cell(s.submissions)}</td></tr>)}</tbody>
              </table></div>
            )}
          </Panel>
        </div>
      )}
    </QueryView>
  );
}
