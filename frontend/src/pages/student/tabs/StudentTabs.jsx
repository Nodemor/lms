import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { CheckCircle2, ClipboardList, Download, Eye, FileText, Film, ListChecks, Paperclip, PlayCircle, Radio, Trophy, Upload } from 'lucide-react';
import api, { errorMessage, openSignedUrl, uploadFile } from '../../../api/client';
import { useAction, useNow } from '../../../lib/hooks';
import { canJoin } from '../../../lib/meetings';
import MeetingBadge from '../../../components/MeetingBadge';
import ContactButtons from '../../../components/ContactButtons';
import { addMonths, currentMonth, fmtBytes, fmtDateTime, fmtDuration, fmtMoney, fmtMonth } from '../../../lib/format';
import VideoPlayer from '../../../components/VideoPlayer';
import LessonThumb from '../../../components/LessonThumb';
import PaymentsTable from '../../../components/PaymentsTable';
import { Badge, Button, EmptyState, FileDrop, Panel, ProgressBar, QueryView, Select, Stat, StatusBadge, Textarea } from '../../../components/ui';
import { DOC_ACCEPT } from '../../teacher/tabs/MaterialsTab';

export function LiveList({ cls }) {
  const { t } = useTranslation();
  const now = useNow(30000);
  const q = useQuery({ queryKey: ['sessions', cls.id], queryFn: () => api.get(`/classes/${cls.id}/sessions`).then((r) => r.data), refetchInterval: 20000 });
  return (
    <Panel padded={false} title={t('tabs.live')}>
      <QueryView query={q}>
        {(list) => list.length === 0 ? <EmptyState icon={Radio} title={t('live.none')} text={t('live.noneStudent')} /> : (
          <ul className="divide-y divide-slate-100">{list.map((s) => {
            const joinable = canJoin(s, now);
            return (
              <li key={s.id} className={clsx('flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between', joinable && 'bg-red-50/60')}>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{s.title}</p><StatusBadge status={s.status} /><MeetingBadge session={s} />
                    {s.myPresent === true && <Badge tone="green">{t('live.present')}</Badge>}{s.myPresent === false && <Badge>{t('live.absent')}</Badge>}</div>
                  <p className="text-sm text-slate-500">{fmtDateTime(s.scheduledStart)} · {t('live.minutesCount', { count: s.durationMinutes })}</p>
                  {s.description && <p className="mt-1 text-sm text-slate-600">{s.description}</p>}
                </div>
                {joinable && <Link to={`/live/${s.id}`} className="btn-danger"><PlayCircle className="h-4 w-4" />{t('live.join')}</Link>}
                {(s.inPerson && (s.status === 'SCHEDULED' || s.status === 'LIVE')) ? (
                  <span className="text-xs text-amber-700">{t('live.inPersonStudentHint')}</span>
                ) : !joinable && s.status === 'SCHEDULED' && (
                  <span className="text-xs text-slate-500">{s.external ? t('live.opensAt', { time: fmtDateTime(s.joinOpensAt) }) : t('live.opensWhenStarted')}</span>
                )}
              </li>
            );
          })}</ul>
        )}
      </QueryView>
    </Panel>
  );
}

export function LessonsView({ cls }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['lessons', cls.id], queryFn: () => api.get(`/classes/${cls.id}/lessons`).then((r) => r.data) });
  const [current, setCurrent] = useState(null);
  const openNotes = (l, dl) => openSignedUrl(`/lessons/${l.id}/notes`, dl).catch((e) => toast.error(errorMessage(e)));
  return (
    <QueryView query={q}>
      {(list) => {
        if (list.length === 0) return <div className="panel"><EmptyState icon={Film} title={t('lessons.none')} text={t('lessons.noneStudent')} /></div>;
        const active = list.find((l) => l.id === current) || list.find((l) => !l.completed) || list[0];
        const done = list.filter((l) => l.completed).length;
        return (
          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            <div className="min-w-0">
              <VideoPlayer key={active.id} lesson={active} trackProgress onCompleted={() => qc.invalidateQueries({ queryKey: ['lessons', cls.id] })} />
              <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
                <h2 className="text-xl font-semibold">{active.title}</h2>
                {active.completed && <Badge tone="green"><CheckCircle2 className="h-3.5 w-3.5" />{t('lessons.completed')}</Badge>}
              </div>
              {active.hasNotes && (
                <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-violet-200 bg-violet-50/60 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <FileText className="h-6 w-6 shrink-0 text-violet-600" />
                    <div className="min-w-0"><p className="text-sm font-semibold">{t('lessons.lectureNotesTitle')}</p><p className="truncate text-xs text-slate-500">{active.notesName}</p></div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => openNotes(active, false)}><Eye className="h-4 w-4" />{t('materials.open')}</Button>
                    <Button size="sm" onClick={() => openNotes(active, true)}><Download className="h-4 w-4" />{t('materials.download')}</Button>
                  </div>
                </div>
              )}
              {active.description && (
                <section className="mt-4">
                  <h3 className="text-sm font-semibold text-slate-500">{t('lessons.aboutLesson')}</h3>
                  <p className="mt-1 whitespace-pre-line leading-relaxed text-slate-700">{active.description}</p>
                </section>
              )}
            </div>
            <Panel title={t('lessons.progress', { done, total: list.length })} padded={false}>
              <div className="px-5 pt-3"><ProgressBar value={(done / list.length) * 100} tone="green" /></div>
              <ol className="mt-2 max-h-[70vh] overflow-y-auto">{list.map((l, i) => (
                <li key={l.id}><button onClick={() => setCurrent(l.id)} aria-current={l.id === active.id}
                  className={clsx('flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-mist', l.id === active.id && 'bg-violet-50')}>
                  <LessonThumb lesson={l} className="aspect-video w-28" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-start gap-1.5"><span className="text-xs font-semibold text-slate-400">{i + 1}.</span>
                      <span className="line-clamp-2 text-sm font-medium">{l.title}</span></span>
                    <span className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
                      {l.durationSeconds ? fmtDuration(l.durationSeconds) : null}
                      {l.hasNotes && <FileText className="h-3.5 w-3.5 text-violet-500" aria-label={t('lessons.hasNotes')} />}
                      {l.completed && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" aria-label={t('lessons.completed')} />}
                    </span>
                  </span>
                </button></li>))}</ol>
            </Panel>
          </div>
        );
      }}
    </QueryView>
  );
}

export function MaterialsView({ cls }) {
  const { t } = useTranslation();
  const q = useQuery({ queryKey: ['materials', cls.id], queryFn: () => api.get(`/classes/${cls.id}/materials`).then((r) => r.data) });
  const open = (m, dl) => openSignedUrl(`/materials/${m.id}/url`, dl).catch((e) => toast.error(errorMessage(e)));
  return (
    <Panel padded={false} title={t('tabs.materials')}>
      <QueryView query={q}>
        {(list) => list.length === 0 ? <EmptyState icon={FileText} title={t('materials.none')} text={t('materials.noneStudent')} /> : (
          <ul className="divide-y divide-slate-100">{list.map((m) => (
            <li key={m.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center">
              <FileText className="hidden h-8 w-8 shrink-0 text-violet-500 sm:block" />
              <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{m.title}</p>{m.category && <Badge tone="violet">{m.category}</Badge>}</div>
                <p className="text-sm text-slate-500">{m.fileName} · {fmtBytes(m.sizeBytes)}</p>{m.description && <p className="mt-1 text-sm text-slate-600">{m.description}</p>}</div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => open(m, false)}><Eye className="h-4 w-4" />{t('materials.open')}</Button>
                {m.downloadable && <Button size="sm" onClick={() => open(m, true)}><Download className="h-4 w-4" />{t('materials.download')}</Button>}
              </div>
            </li>))}</ul>
        )}
      </QueryView>
    </Panel>
  );
}

function SubmitBox({ a, cls, onDone }) {
  const { t } = useTranslation();
  const [text, setText] = useState(a.mySubmission?.textAnswer || '');
  const [file, setFile] = useState(a.mySubmission?.hasFile ? { keep: true, fileName: a.mySubmission.fileName } : null);
  const [progress, setProgress] = useState(null);
  const [busy, setBusy] = useState(false);
  const pick = async (f) => {
    setProgress(0);
    try { const up = await uploadFile(f, 'SUBMISSION', cls.id, setProgress); setFile(up); } catch (e) { toast.error(errorMessage(e)); setProgress(null); }
  };
  const submit = async () => {
    setBusy(true);
    try {
      const body = file?.keep ? { textAnswer: text, keepFile: true } : { textAnswer: text, fileKey: file?.key, fileName: file?.fileName };
      await api.post(`/student/assignments/${a.id}/submit`, body);
      toast.success(t('assignments.submittedToast'));
      onDone();
    } catch (e) { toast.error(errorMessage(e)); } finally { setBusy(false); }
  };
  return (
    <div className="mt-4 grid gap-3 rounded-2xl border border-slate-200 p-4">
      <Textarea label={t('assignments.yourAnswer')} rows={5} value={text} onChange={(e) => setText(e.target.value)} />
      {file && progress == null ? (
        <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm"><span className="flex items-center gap-2 truncate"><Paperclip className="h-4 w-4" />{file.fileName}</span>
          <Button size="sm" variant="ghost" onClick={() => setFile(null)}>{t('common.remove')}</Button></div>
      ) : <FileDrop accept={DOC_ACCEPT} onFile={pick} progress={progress} hint={t('assignments.fileHint')} />}
      <div><Button loading={busy} disabled={(!text.trim() && !file) || (progress != null && progress < 100)} onClick={submit}><Upload className="h-4 w-4" />{a.mySubmission ? t('assignments.resubmit') : t('assignments.submit')}</Button></div>
    </div>
  );
}

export function AssignmentsView({ cls }) {
  const { t } = useTranslation();
  const [openId, setOpenId] = useState(null);
  const q = useQuery({ queryKey: ['assignments', cls.id], queryFn: () => api.get(`/classes/${cls.id}/assignments`).then((r) => r.data) });
  return (
    <Panel padded={false} title={t('tabs.assignments')}>
      <QueryView query={q}>
        {(list) => list.length === 0 ? <EmptyState icon={ClipboardList} title={t('assignments.none')} text={t('assignments.noneStudent')} /> : (
          <ul className="divide-y divide-slate-100">{list.map((a) => {
            const s = a.mySubmission;
            const closed = new Date(a.dueAt) < new Date() && !a.allowLate;
            const canSubmit = !closed && s?.status !== 'GRADED';
            return (
              <li key={a.id} className="px-5 py-4">
                <button className="flex w-full flex-col gap-1 text-left sm:flex-row sm:items-center sm:justify-between" onClick={() => setOpenId(openId === a.id ? null : a.id)} aria-expanded={openId === a.id}>
                  <div><p className="font-semibold">{a.title}</p><p className="text-sm text-slate-500">{t('assignments.due', { date: fmtDateTime(a.dueAt) })} · {t('assignments.marks', { count: a.maxMarks })}</p></div>
                  <div className="flex items-center gap-2">
                    {s ? <StatusBadge status={s.status} /> : closed ? <Badge>{t('assignments.closed')}</Badge> : <Badge tone="amber">{t('assignments.notSubmitted')}</Badge>}
                    {s?.marks != null && <span className="font-display font-bold">{s.marks}/{a.maxMarks}</span>}
                  </div>
                </button>
                {openId === a.id && (
                  <div className="mt-3">
                    {a.instructions && <p className="whitespace-pre-line rounded-xl bg-mist p-4 text-sm text-slate-700">{a.instructions}</p>}
                    {a.hasAttachment && <Button size="sm" variant="outline" className="mt-3" onClick={() => openSignedUrl(`/assignments/${a.id}/attachment`, true).catch((e) => toast.error(errorMessage(e)))}><Download className="h-4 w-4" />{a.attachmentName}</Button>}
                    {s?.feedback && <div className="mt-3 rounded-xl bg-violet-50 p-3 text-sm"><p className="text-xs font-semibold text-violet-800">{t('assignments.feedback')}</p><p className="mt-1 whitespace-pre-line">{s.feedback}</p></div>}
                    {s && <p className="mt-3 text-xs text-slate-500">{t('assignments.submittedOn', { date: fmtDateTime(s.submittedAt) })}{s.late ? ` · ${t('assignments.late')}` : ''}</p>}
                    {canSubmit && <SubmitBox a={a} cls={cls} onDone={() => { setOpenId(null); q.refetch(); }} />}
                  </div>
                )}
              </li>
            );
          })}</ul>
        )}
      </QueryView>
    </Panel>
  );
}

export function QuizzesView({ cls }) {
  const { t } = useTranslation();
  const nav = useNavigate();
  const q = useQuery({ queryKey: ['quizzes', cls.id], queryFn: () => api.get(`/classes/${cls.id}/quizzes`).then((r) => r.data) });
  const start = useAction((quizId) => api.post(`/student/quizzes/${quizId}/start`).then((r) => r.data), { onSuccess: (a) => nav(`/student/attempts/${a.id}`) });
  const now = new Date();
  return (
    <Panel padded={false} title={t('tabs.quizzes')}>
      <QueryView query={q}>
        {(list) => list.length === 0 ? <EmptyState icon={ListChecks} title={t('quizzes.none')} text={t('quizzes.noneStudent')} /> : (
          <ul className="divide-y divide-slate-100">{list.map((z) => {
            const notYet = z.opensAt && new Date(z.opensAt) > now;
            const closed = z.closesAt && new Date(z.closesAt) <= now;
            const left = z.maxAttempts - (z.attemptsUsed || 0);
            return (
              <li key={z.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold">{z.title}</p>
                  <p className="text-sm text-slate-500">{t('quizzes.questionsCount', { count: z.questionCount })}{z.timeLimitMinutes ? ` · ${t('quizzes.minutes', { count: z.timeLimitMinutes })}` : ''} · {t('quizzes.attemptsLeft', { count: Math.max(0, left) })}</p>
                  {notYet && <p className="text-xs text-violet-700">{t('quizzes.opens', { date: fmtDateTime(z.opensAt) })}</p>}
                  {z.closesAt && !closed && <p className="text-xs text-slate-500">{t('quizzes.closes', { date: fmtDateTime(z.closesAt) })}</p>}
                </div>
                <div className="flex items-center gap-3">
                  {z.bestScore != null && <span className="flex items-center gap-1 font-display font-bold"><Trophy className="h-4 w-4 text-violet-500" />{z.bestScore}/{z.maxScore}</span>}
                  {z.inProgressAttemptId ? <Link to={`/student/attempts/${z.inProgressAttemptId}`} className="btn-primary btn-sm">{t('quizzes.continue')}</Link>
                    : !notYet && !closed && left > 0 && <Button size="sm" loading={start.isPending && start.variables === z.id} onClick={() => start.mutate(z.id)}>{t('quizzes.start')}</Button>}
                  {closed && <Badge>{t('quizzes.closed')}</Badge>}
                </div>
              </li>
            );
          })}</ul>
        )}
      </QueryView>
    </Panel>
  );
}

export function MyAttendance({ cls }) {
  const { t } = useTranslation();
  const q = useQuery({ queryKey: ['my-attendance', cls.id], queryFn: () => api.get(`/student/classes/${cls.id}/attendance`).then((r) => r.data) });
  return (
    <QueryView query={q}>
      {(d) => (
        <div className="grid gap-4 sm:grid-cols-3">
          <Stat label={t('attendance.sessionsHeldLabel')} value={d.sessionsHeld} />
          <Stat label={t('attendance.attended')} value={d.present} tone="green" />
          <Stat label={t('attendance.rate')} value={`${d.percent}%`} tone={d.percent >= 75 ? 'green' : 'amber'} />
          <p className="text-sm text-slate-500 sm:col-span-3">{t('attendance.studentHint')}</p>
        </div>
      )}
    </QueryView>
  );
}

export function FeesView({ cls, data }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const monthly = cls.billingType === 'MONTHLY';
  const [period, setPeriod] = useState(data.currentPeriod || currentMonth());
  const [slip, setSlip] = useState(null);
  const [progress, setProgress] = useState(null);
  const bank = useQuery({ queryKey: ['bank-details', cls.id], queryFn: () => api.get('/payments/bank-details', { params: { classId: cls.id } }).then((r) => r.data) });
  const history = useQuery({ queryKey: ['student-payments', 'class', cls.id], queryFn: () => api.get('/student/payments', { params: { size: 50 } }).then((r) => r.data.items.filter((p) => p.classId === cls.id)) });
  const send = useAction(() => api.post(`/student/classes/${cls.id}/checkout`, { method: 'BANK_TRANSFER', periodMonth: monthly ? period : null, slipKey: slip?.key }).then((r) => r.data), {
    success: t('fees.slipSent'),
    onSuccess: () => { setSlip(null); qc.invalidateQueries({ queryKey: ['student-payments'] }); },
  });
  const pick = async (f) => { setProgress(0); try { setSlip(await uploadFile(f, 'PAYMENT_SLIP', cls.id, setProgress)); } catch (e) { toast.error(errorMessage(e)); setProgress(null); } };
  const months = [-1, 0, 1, 2].map((n) => addMonths(data.currentPeriod || currentMonth(), n));
  const pending = history.data?.some((p) => p.status === 'PENDING');
  const helpMessage = t('fees.whatsappMessage', { className: cls.title, month: monthly ? fmtMonth(period) : '' });

  return (
    <div className="grid gap-6 lg:grid-cols-[440px_1fr]">
      <Panel title={t('fees.payTitle')}>
        <p className="font-display text-3xl font-bold">{fmtMoney(cls.fee, cls.currency)}<span className="text-base font-normal text-slate-500"> {monthly ? t('class.perMonth') : t('fees.oneTime')}</span></p>
        {data.hasContentAccess
          ? <p className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800"><CheckCircle2 className="h-4 w-4" />{monthly ? t('fees.paidMonth', { month: fmtMonth(data.currentPeriod) }) : t('fees.paidOnce')}</p>
          : <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{monthly ? t('fees.lockedMonthly', { month: fmtMonth(data.currentPeriod) }) : t('fees.lockedOnce')}</p>}
        {pending && <p className="mt-3 rounded-xl bg-sky-50 p-3 text-sm text-sky-800">{t('fees.pendingReview')}</p>}

        <ol className="mt-5 grid gap-4">
          <li>
            <p className="text-sm font-semibold"><span className="mr-2 inline-grid h-6 w-6 place-items-center rounded-full bg-violet-100 text-xs text-violet-700">1</span>{t('fees.step1')}</p>
            {bank.data?.details && <pre className="mt-2 whitespace-pre-wrap rounded-xl bg-mist p-3 font-sans text-sm">{bank.data.details}</pre>}
          </li>
          <li>
            <p className="mb-2 text-sm font-semibold"><span className="mr-2 inline-grid h-6 w-6 place-items-center rounded-full bg-violet-100 text-xs text-violet-700">2</span>{t('fees.step2')}</p>
            {monthly && <Select label={t('payments.month')} value={period} onChange={(e) => setPeriod(e.target.value)} className="mb-3">{months.map((m) => <option key={m} value={m}>{fmtMonth(m)}</option>)}</Select>}
            <FileDrop accept=".pdf,.jpg,.jpeg,.png,.webp" onFile={pick} progress={progress} fileName={slip?.fileName} hint={t('fees.slipHint')} />
          </li>
          <li>
            <p className="mb-2 text-sm font-semibold"><span className="mr-2 inline-grid h-6 w-6 place-items-center rounded-full bg-violet-100 text-xs text-violet-700">3</span>{t('fees.step3')}</p>
            <Button className="h-11 w-full" loading={send.isPending} disabled={!slip || (progress != null && progress < 100)} onClick={() => send.mutate()}>{t('fees.sendSlip')}</Button>
          </li>
        </ol>

        <div className="mt-6 rounded-2xl border border-slate-200 p-4">
          <p className="text-sm font-semibold">{t('fees.needHelp')}</p>
          <p className="mb-3 text-xs text-slate-500">{t('fees.needHelpText')}</p>
          <ContactButtons message={helpMessage} compact />
        </div>
      </Panel>
      <Panel title={t('fees.history')} padded={false}><QueryView query={history}>{(items) => <PaymentsTable items={items} mode="student" />}</QueryView></Panel>
    </div>
  );
}
