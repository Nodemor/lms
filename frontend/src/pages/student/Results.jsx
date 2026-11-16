import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { ClipboardList, ListChecks, Trophy } from 'lucide-react';
import api from '../../api/client';
import { fmtDateTime } from '../../lib/format';
import { downloadCsv, today } from '../../lib/csv';
import ExportButton from '../../components/ExportButton';
import { EmptyState, PageHeader, Panel, ProgressBar, QueryView, Stat, StatusBadge } from '../../components/ui';

const pct = (s, m) => (m ? Math.round((s / m) * 100) : null);

export default function Results() {
  const { t } = useTranslation();
  const q = useQuery({ queryKey: ['student-results'], queryFn: () => api.get('/student/results').then((r) => r.data) });
  const exportAll = (d) => downloadCsv(`my-results-${today()}`, [
    { label: t('results.type'), value: (r) => r.kind },
    { label: t('nav.classes'), value: (r) => r.classTitle },
    { label: t('results.item'), value: (r) => r.title },
    { label: t('quizzes.score'), value: (r) => (r.score == null ? '' : `${r.score}/${r.max ?? ''}`) },
    { label: '%', value: (r) => pct(r.score, r.max) ?? '' },
    { label: t('payments.date'), value: (r) => fmtDateTime(r.at) },
  ], [...d.quizzes.map((r) => ({ ...r, kind: t('dashboard.kind.quiz') })), ...d.assignments.map((r) => ({ ...r, kind: t('dashboard.kind.assignment') }))]);

  return (
    <QueryView query={q}>
      {(d) => (
        <>
          <PageHeader title={t('nav.results')} subtitle={t('results.subtitle')}
            actions={(d.quizzes.length > 0 || d.assignments.length > 0) && <ExportButton size="md" run={async () => exportAll(d)} />} />
          <div className="grid gap-6">
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <Stat icon={ListChecks} label={t('results.quizzesTaken')} value={d.quizzes.length} tone="ink" />
              <Stat icon={Trophy} label={t('results.quizAverage')} value={d.quizAverage == null ? '—' : `${d.quizAverage}%`} />
              <Stat icon={ClipboardList} label={t('results.assignmentsSubmitted')} value={d.assignments.length} />
              <Stat icon={Trophy} label={t('results.assignmentAverage')} value={d.assignmentAverage == null ? '—' : `${d.assignmentAverage}%`} tone="green" />
            </div>
            <Panel title={t('tabs.quizzes')} padded={false}>
              {d.quizzes.length === 0 ? <EmptyState icon={ListChecks} title={t('results.noQuizzes')} /> : (
                <div className="table-wrap"><table className="table">
                  <thead><tr><th>{t('results.item')}</th><th>{t('nav.classes')}</th><th className="w-1/4">{t('quizzes.score')}</th><th>{t('payments.date')}</th></tr></thead>
                  <tbody>{d.quizzes.map((r) => (
                    <tr key={r.id}>
                      <td><Link to={`/student/attempts/${r.id}`} className="font-medium text-violet-800 hover:underline">{r.title}</Link></td>
                      <td className="text-slate-600">{r.classTitle}</td>
                      <td><div className="flex items-center gap-2"><ProgressBar value={pct(r.score, r.max)} tone={pct(r.score, r.max) >= 75 ? 'green' : pct(r.score, r.max) >= 40 ? 'violet' : 'amber'} /><span className="whitespace-nowrap text-sm font-semibold">{r.score}/{r.max}</span></div></td>
                      <td className="whitespace-nowrap text-slate-500">{fmtDateTime(r.at)}</td>
                    </tr>
                  ))}</tbody>
                </table></div>
              )}
            </Panel>
            <Panel title={t('tabs.assignments')} padded={false}>
              {d.assignments.length === 0 ? <EmptyState icon={ClipboardList} title={t('results.noAssignments')} /> : (
                <div className="table-wrap"><table className="table">
                  <thead><tr><th>{t('results.item')}</th><th>{t('nav.classes')}</th><th>{t('common.status')}</th><th>{t('quizzes.score')}</th><th>{t('assignments.feedback')}</th></tr></thead>
                  <tbody>{d.assignments.map((r) => (
                    <tr key={r.id}>
                      <td><Link to={`/student/classes/${r.classId}?tab=assignments`} className="font-medium text-violet-800 hover:underline">{r.title}</Link></td>
                      <td className="text-slate-600">{r.classTitle}</td>
                      <td><StatusBadge status={r.status} /></td>
                      <td className="whitespace-nowrap font-semibold">{r.score == null ? '—' : `${r.score}/${r.max}`}</td>
                      <td className="max-w-xs truncate text-slate-600" title={r.feedback || ''}>{r.feedback || '—'}</td>
                    </tr>
                  ))}</tbody>
                </table></div>
              )}
            </Panel>
          </div>
        </>
      )}
    </QueryView>
  );
}
