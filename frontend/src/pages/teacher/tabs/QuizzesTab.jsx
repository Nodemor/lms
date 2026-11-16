import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, ListChecks, Pencil, Plus, Trash2 } from 'lucide-react';
import api from '../../../api/client';
import { useAction } from '../../../lib/hooks';
import { fmtDateTime } from '../../../lib/format';
import { Badge, Button, ConfirmDialog, EmptyState, Modal, Panel, QueryView } from '../../../components/ui';

function ResultsModal({ quiz, onClose }) {
  const { t } = useTranslation();
  const q = useQuery({ queryKey: ['quiz-results', quiz.id], queryFn: () => api.get(`/teacher/quizzes/${quiz.id}/results`).then((r) => r.data) });
  return (
    <Modal open onClose={onClose} title={t('quizzes.resultsFor', { title: quiz.title })} size="lg">
      <QueryView query={q}>
        {(rows) => rows.length === 0 ? <EmptyState icon={BarChart3} title={t('quizzes.noResults')} /> : (
          <>
            <p className="mb-3 text-sm text-slate-600">{t('quizzes.average', { value: Math.round(rows.reduce((s, r) => s + (r.maxScore ? (r.score / r.maxScore) * 100 : 0), 0) / rows.length) })}</p>
            <div className="table-wrap"><table className="table">
              <thead><tr><th>{t('students.student')}</th><th>{t('quizzes.score')}</th><th>{t('quizzes.submitted')}</th></tr></thead>
              <tbody>{rows.map((r) => <tr key={r.id}><td>{r.studentName}</td><td className="font-semibold">{r.score}/{r.maxScore}</td><td className="text-slate-500">{fmtDateTime(r.submittedAt)}</td></tr>)}</tbody>
            </table></div>
          </>
        )}
      </QueryView>
    </Modal>
  );
}

export default function QuizzesTab({ cls }) {
  const { t } = useTranslation();
  const [results, setResults] = useState(null);
  const [del, setDel] = useState(null);
  const q = useQuery({ queryKey: ['quizzes', cls.id], queryFn: () => api.get(`/classes/${cls.id}/quizzes`).then((r) => r.data) });
  const remove = useAction((id) => api.delete(`/teacher/classes/${cls.id}/quizzes/${id}`), { success: t('common.deleted'), invalidate: [['quizzes', cls.id]], onSuccess: () => setDel(null) });
  return (
    <Panel padded={false} title={t('tabs.quizzes')} action={<Link to={`/teacher/classes/${cls.id}/quizzes/new`} className="btn-primary btn-sm"><Plus className="h-4 w-4" />{t('quizzes.create')}</Link>}>
      <QueryView query={q}>
        {(list) => list.length === 0 ? <EmptyState icon={ListChecks} title={t('quizzes.none')} text={t('quizzes.noneTeacher')} action={<Link to={`/teacher/classes/${cls.id}/quizzes/new`} className="btn-primary">{t('quizzes.create')}</Link>} /> : (
          <ul className="divide-y divide-slate-100">
            {list.map((z) => (
              <li key={z.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{z.title}</p>{z.published ? <Badge tone="green">{t('status.PUBLISHED')}</Badge> : <Badge>{t('status.DRAFT')}</Badge>}</div>
                  <p className="text-sm text-slate-500">{t('quizzes.questionsCount', { count: z.questionCount })}{z.timeLimitMinutes ? ` · ${t('quizzes.minutes', { count: z.timeLimitMinutes })}` : ''}{z.closesAt ? ` · ${t('quizzes.closes', { date: fmtDateTime(z.closesAt) })}` : ''}</p>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => setResults(z)}><BarChart3 className="h-4 w-4" />{t('quizzes.attemptsCount', { count: z.attemptCount || 0 })}</Button>
                  <Link to={`/teacher/classes/${cls.id}/quizzes/${z.id}`} className="btn-ghost btn-sm" aria-label={t('common.edit')}><Pencil className="h-4 w-4" /></Link>
                  <Button size="sm" variant="ghost" onClick={() => setDel(z.id)} aria-label={t('common.delete')}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </QueryView>
      {results && <ResultsModal quiz={results} onClose={() => setResults(null)} />}
      <ConfirmDialog open={!!del} danger title={t('common.delete')} text={t('quizzes.deleteConfirm')} confirmLabel={t('common.delete')} loading={remove.isPending}
        onConfirm={() => remove.mutate(del)} onClose={() => setDel(null)} />
    </Panel>
  );
}
