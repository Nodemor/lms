import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Copy, Plus, Trash2 } from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import api, { errorMessage } from '../../api/client';
import { fromLocalInput, toLocalInput } from '../../lib/format';
import { Button, Input, PageHeader, PageLoader, Panel, Select, Textarea, Toggle } from '../../components/ui';

const newQuestion = () => ({ key: Math.random().toString(36).slice(2), text: '', type: 'MCQ', options: ['', '', '', ''], correctIndex: 0, marks: 1 });

export default function QuizEditor() {
  const { id: classId, quizId } = useParams();
  const { t } = useTranslation();
  const nav = useNavigate();
  const qc = useQueryClient();
  const existing = useQuery({ queryKey: ['teacher-quiz', quizId], queryFn: () => api.get(`/teacher/quizzes/${quizId}`).then((r) => r.data), enabled: !!quizId });
  const [meta, setMeta] = useState({ title: '', description: '', opensAt: '', closesAt: '', timeLimitMinutes: 30, maxAttempts: 1, shuffleQuestions: false, showAnswers: true, published: false });
  const [questions, setQuestions] = useState([newQuestion()]);
  const [saving, setSaving] = useState(false);
  const locked = (existing.data?.attemptCount || 0) > 0;

  useEffect(() => {
    const z = existing.data;
    if (!z) return;
    setMeta({ title: z.title, description: z.description || '', opensAt: toLocalInput(z.opensAt), closesAt: toLocalInput(z.closesAt), timeLimitMinutes: z.timeLimitMinutes || '', maxAttempts: z.maxAttempts, shuffleQuestions: z.shuffleQuestions, showAnswers: z.showAnswers, published: z.published });
    setQuestions(z.questions.map((q) => ({ key: q.id, text: q.text, type: q.type, options: q.type === 'TRUE_FALSE' ? ['', ''] : q.options, correctIndex: q.correctIndex, marks: q.marks })));
  }, [existing.data]);

  const upd = (i, patch) => setQuestions((qs) => qs.map((q, j) => (j === i ? { ...q, ...patch } : q)));
  const valid = meta.title.trim() && questions.length > 0 && questions.every((q) => q.text.trim() && (q.type === 'TRUE_FALSE' || (q.options.filter((o) => o.trim()).length >= 2 && q.options[q.correctIndex]?.trim())));

  const save = async (publish) => {
    setSaving(true);
    try {
      const body = {
        ...meta, published: publish ?? meta.published, opensAt: fromLocalInput(meta.opensAt), closesAt: fromLocalInput(meta.closesAt),
        timeLimitMinutes: meta.timeLimitMinutes ? Number(meta.timeLimitMinutes) : null, maxAttempts: Number(meta.maxAttempts) || 1,
        questions: questions.map((q) => {
          if (q.type === 'TRUE_FALSE') return { text: q.text, type: q.type, options: [], correctIndex: q.correctIndex, marks: Number(q.marks) || 1 };
          const filled = q.options.map((o, i) => ({ o: o.trim(), i })).filter((x) => x.o);
          return { text: q.text, type: q.type, options: filled.map((x) => x.o), correctIndex: Math.max(0, filled.findIndex((x) => x.i === q.correctIndex)), marks: Number(q.marks) || 1 };
        }),
      };
      if (quizId) await api.put(`/teacher/classes/${classId}/quizzes/${quizId}`, locked ? { ...body, questions: null } : body);
      else await api.post(`/teacher/classes/${classId}/quizzes`, body);
      toast.success(t('quizzes.saved'));
      qc.invalidateQueries({ queryKey: ['quizzes', classId] });
      nav(`/teacher/classes/${classId}?tab=quizzes`);
    } catch (e) { toast.error(errorMessage(e)); } finally { setSaving(false); }
  };

  if (quizId && existing.isLoading) return <PageLoader />;
  return (
    <>
      <PageHeader back={<Link to={`/teacher/classes/${classId}?tab=quizzes`} className="mb-2 inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-violet-700"><ChevronLeft className="h-4 w-4" />{t('tabs.quizzes')}</Link>}
        title={quizId ? t('quizzes.edit') : t('quizzes.create')}
        actions={<><Button variant="outline" loading={saving} disabled={!valid} onClick={() => save(false)}>{t('quizzes.saveDraft')}</Button><Button loading={saving} disabled={!valid} onClick={() => save(true)}>{t('quizzes.savePublish')}</Button></>} />
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="grid content-start gap-4">
          {locked && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{t('errors.quiz_has_attempts')}</p>}
          {questions.map((q, i) => (
            <Panel key={q.key} title={t('quizzes.questionN', { n: i + 1 })} action={!locked && (
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" aria-label={t('quizzes.duplicate')} onClick={() => setQuestions((qs) => [...qs.slice(0, i + 1), { ...q, key: Math.random().toString(36).slice(2), options: [...q.options] }, ...qs.slice(i + 1)])}><Copy className="h-4 w-4" /></Button>
                <Button size="sm" variant="ghost" aria-label={t('common.delete')} disabled={questions.length === 1} onClick={() => setQuestions((qs) => qs.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button>
              </div>)}>
              <fieldset disabled={locked} className="grid gap-4">
                <Textarea label={t('quizzes.questionText')} rows={2} value={q.text} onChange={(e) => upd(i, { text: e.target.value })} />
                <div className="grid grid-cols-2 gap-3">
                  <Select label={t('quizzes.type')} value={q.type} onChange={(e) => upd(i, { type: e.target.value, correctIndex: 0, options: e.target.value === 'TRUE_FALSE' ? ['', ''] : ['', '', '', ''] })}>
                    <option value="MCQ">{t('quizzes.types.MCQ')}</option><option value="TRUE_FALSE">{t('quizzes.types.TRUE_FALSE')}</option>
                  </Select>
                  <Input label={t('quizzes.marks')} type="number" min="1" max="100" value={q.marks} onChange={(e) => upd(i, { marks: e.target.value })} />
                </div>
                <div>
                  <span className="label">{t('quizzes.answersHint')}</span>
                  <div className="grid gap-2">
                    {(q.type === 'TRUE_FALSE' ? [t('quizzes.true'), t('quizzes.false')] : q.options).map((o, oi) => (
                      <div key={oi} className={clsx('flex items-center gap-2 rounded-xl border p-1.5 pl-3', q.correctIndex === oi ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200')}>
                        <input type="radio" name={`correct-${q.key}`} checked={q.correctIndex === oi} onChange={() => upd(i, { correctIndex: oi })} aria-label={t('quizzes.markCorrect')} className="h-4 w-4 accent-emerald-600" />
                        {q.type === 'TRUE_FALSE' ? <span className="py-2 text-sm font-medium">{o}</span> : (
                          <input className="h-9 flex-1 rounded-lg bg-transparent px-2 text-sm outline-none focus:bg-white" placeholder={t('quizzes.optionN', { n: oi + 1 })} value={o}
                            onChange={(e) => upd(i, { options: q.options.map((x, k) => (k === oi ? e.target.value : x)) })} />
                        )}
                        {q.type === 'MCQ' && q.options.length > 2 && <Button size="sm" variant="ghost" aria-label={t('common.remove')} onClick={() => upd(i, { options: q.options.filter((_, k) => k !== oi), correctIndex: q.correctIndex === oi ? 0 : q.correctIndex > oi ? q.correctIndex - 1 : q.correctIndex })}><Trash2 className="h-4 w-4" /></Button>}
                      </div>
                    ))}
                    {q.type === 'MCQ' && q.options.length < 6 && <Button size="sm" variant="ghost" className="justify-self-start" onClick={() => upd(i, { options: [...q.options, ''] })}><Plus className="h-4 w-4" />{t('quizzes.addOption')}</Button>}
                  </div>
                </div>
              </fieldset>
            </Panel>
          ))}
          {!locked && <Button variant="outline" className="h-12 border-dashed" onClick={() => setQuestions((qs) => [...qs, newQuestion()])}><Plus className="h-4 w-4" />{t('quizzes.addQuestion')}</Button>}
        </div>
        <div className="lg:sticky lg:top-24 lg:self-start">
          <Panel title={t('quizzes.settings')}>
            <div className="grid gap-4">
              <Input label={t('quizzes.titleLabel')} value={meta.title} onChange={(e) => setMeta({ ...meta, title: e.target.value })} maxLength={200} />
              <Textarea label={t('common.descriptionOptional')} rows={2} value={meta.description} onChange={(e) => setMeta({ ...meta, description: e.target.value })} />
              <div className="grid grid-cols-2 gap-3">
                <Input label={t('quizzes.timeLimit')} type="number" min="1" max="600" value={meta.timeLimitMinutes} onChange={(e) => setMeta({ ...meta, timeLimitMinutes: e.target.value })} hint={t('quizzes.timeLimitHint')} />
                <Input label={t('quizzes.attempts')} type="number" min="1" max="20" value={meta.maxAttempts} onChange={(e) => setMeta({ ...meta, maxAttempts: e.target.value })} />
              </div>
              <Input label={t('quizzes.opensAt')} type="datetime-local" value={meta.opensAt} onChange={(e) => setMeta({ ...meta, opensAt: e.target.value })} hint={t('quizzes.optional')} />
              <Input label={t('quizzes.closesAt')} type="datetime-local" value={meta.closesAt} onChange={(e) => setMeta({ ...meta, closesAt: e.target.value })} hint={t('quizzes.optional')} />
              <Toggle checked={meta.shuffleQuestions} onChange={(v) => setMeta({ ...meta, shuffleQuestions: v })} label={t('quizzes.shuffle')} />
              <Toggle checked={meta.showAnswers} onChange={(v) => setMeta({ ...meta, showAnswers: v })} label={t('quizzes.showAnswers')} description={t('quizzes.showAnswersHint')} />
              <p className="rounded-xl bg-mist p-3 text-sm">{t('quizzes.totalMarks', { count: questions.reduce((s, q) => s + (Number(q.marks) || 0), 0) })}</p>
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}
