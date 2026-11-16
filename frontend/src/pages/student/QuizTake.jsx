import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { CheckCircle2, Clock, XCircle } from 'lucide-react';
import api, { errorMessage } from '../../api/client';
import { useNow } from '../../lib/hooks';
import Brand from '../../components/layout/Brand';
import { Button, ConfirmDialog, PageLoader, QueryView } from '../../components/ui';

function optionLabel(q, o, t) {
  if (q.type === 'TRUE_FALSE') return o === 'true' ? t('quizzes.true') : t('quizzes.false');
  return o;
}

function Result({ a }) {
  const { t } = useTranslation();
  const pct = a.maxScore ? Math.round((a.score / a.maxScore) * 100) : 0;
  const reveal = a.questions.some((q) => q.correctIndex != null);
  return (
    <div className="mx-auto max-w-3xl">
      <div className="panel p-8 text-center">
        <p className="text-sm text-slate-500">{a.quizTitle}</p>
        <p className="mt-2 font-display text-5xl font-bold">{a.score}<span className="text-2xl text-slate-400">/{a.maxScore}</span></p>
        <p className="mt-1 text-slate-600">{t('quizzes.resultPercent', { value: pct })}</p>
      </div>
      {reveal && (
        <ol className="mt-6 grid gap-4">{a.questions.map((q, i) => {
          const chosen = a.answers?.[q.id];
          const right = chosen === q.correctIndex;
          return (
            <li key={q.id} className="panel p-5">
              <div className="flex items-start gap-2">{right ? <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" /> : <XCircle className="h-5 w-5 shrink-0 text-red-500" />}
                <p className="font-medium"><span className="text-slate-400">{i + 1}. </span>{q.text}</p></div>
              <ul className="mt-3 grid gap-2">{q.options.map((o, oi) => (
                <li key={oi} className={clsx('rounded-xl border px-3 py-2 text-sm', oi === q.correctIndex ? 'border-emerald-400 bg-emerald-50' : oi === chosen ? 'border-red-300 bg-red-50' : 'border-slate-200')}>{optionLabel(q, o, t)}</li>
              ))}</ul>
            </li>
          );
        })}</ol>
      )}
      <div className="mt-6 text-center"><Link to="/student/classes" className="btn-primary">{t('quizzes.backToClass')}</Link></div>
    </div>
  );
}

export default function QuizTake() {
  const { attemptId } = useParams();
  const { t } = useTranslation();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['attempt', attemptId], queryFn: () => api.get(`/attempts/${attemptId}`).then((r) => r.data), refetchOnWindowFocus: false });
  const [answers, setAnswers] = useState(null);
  const [confirm, setConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const saveTimer = useRef(null);
  const now = useNow(1000);
  const submittedRef = useRef(false);

  useEffect(() => { if (q.data && answers === null) setAnswers(q.data.answers || {}); }, [q.data, answers]);

  const submit = useCallback(async () => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setSubmitting(true);
    try {
      const { data } = await api.post(`/student/attempts/${attemptId}/submit`, answers || {});
      setResult(data);
      qc.invalidateQueries({ queryKey: ['quizzes'] });
      toast.success(t('quizzes.submittedToast'));
    } catch (e) {
      submittedRef.current = false;
      toast.error(errorMessage(e));
      q.refetch();
    } finally { setSubmitting(false); setConfirm(false); }
  }, [answers, attemptId, qc, q, t]);

  const deadline = q.data?.deadlineAt ? new Date(q.data.deadlineAt).getTime() : null;
  const remaining = deadline ? Math.max(0, Math.floor((deadline - now) / 1000)) : null;
  useEffect(() => { if (q.data?.status === 'IN_PROGRESS' && remaining === 0 && answers) submit(); }, [remaining, q.data, answers, submit]);

  const choose = (qid, idx) => {
    const next = { ...answers, [qid]: idx };
    setAnswers(next);
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => api.put(`/student/attempts/${attemptId}/answers`, next).catch(() => {}), 600);
  };

  return (
    <div className="min-h-screen bg-mist">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between gap-4 px-4">
          <Brand to="/student" />
          {remaining != null && !result && q.data?.status === 'IN_PROGRESS' && (
            <span className={clsx('flex items-center gap-2 rounded-xl px-3 py-1.5 font-display font-bold tabular-nums', remaining < 60 ? 'bg-red-100 text-red-700' : 'bg-violet-50 text-violet-800')} role="timer" aria-live="off">
              <Clock className="h-4 w-4" />{Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, '0')}
            </span>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8">
        {result ? <Result a={result} /> : (
          <QueryView query={q}>
            {(a) => {
              if (a.status === 'SUBMITTED') return <Result a={a} />;
              if (!answers) return <PageLoader />;
              const answered = a.questions.filter((x) => answers[x.id] != null).length;
              return (
                <>
                  <h1 className="text-2xl font-bold">{a.quizTitle}</h1>
                  <p className="mt-1 text-sm text-slate-500">{t('quizzes.answeredOf', { done: answered, total: a.questions.length })} · {t('quizzes.autosaved')}</p>
                  <ol className="mt-6 grid gap-4">{a.questions.map((x, i) => (
                    <li key={x.id} className="panel p-5">
                      <fieldset>
                        <legend className="font-medium"><span className="text-slate-400">{i + 1}. </span>{x.text} <span className="text-xs text-slate-400">({t('quizzes.marks_count', { count: x.marks })})</span></legend>
                        <div className="mt-3 grid gap-2">{x.options.map((o, oi) => (
                          <label key={oi} className={clsx('flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm transition', answers[x.id] === oi ? 'border-violet-500 bg-violet-50' : 'border-slate-200 hover:border-slate-300')}>
                            <input type="radio" name={x.id} className="h-4 w-4 accent-violet-600" checked={answers[x.id] === oi} onChange={() => choose(x.id, oi)} />{optionLabel(x, o, t)}
                          </label>
                        ))}</div>
                      </fieldset>
                    </li>
                  ))}</ol>
                  <div className="mt-6 flex justify-end"><Button className="h-12 px-8" onClick={() => setConfirm(true)} loading={submitting}>{t('quizzes.submit')}</Button></div>
                  <ConfirmDialog open={confirm} title={t('quizzes.submit')} loading={submitting} onConfirm={submit} onClose={() => setConfirm(false)} confirmLabel={t('quizzes.submit')}
                    text={answered < a.questions.length ? t('quizzes.unansweredWarn', { count: a.questions.length - answered }) : t('quizzes.submitConfirm')} />
                </>
              );
            }}
          </QueryView>
        )}
      </main>
    </div>
  );
}
