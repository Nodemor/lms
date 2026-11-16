import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { CalendarPlus, Copy, Link2, MapPin, Pencil, PlayCircle, QrCode as QrIcon, Radio, UserCheck, Video, XCircle } from 'lucide-react';
import api from '../../../api/client';
import { useAction } from '../../../lib/hooks';
import { fmtDateTime, fromLocalInput, toLocalInput } from '../../../lib/format';
import { PROVIDER_LABEL, isInPerson, isValidMeetingUrl, meetingProvider } from '../../../lib/meetings';
import MeetingBadge from '../../../components/MeetingBadge';
import { Badge, Button, ConfirmDialog, EmptyState, Input, Modal, Panel, QueryView, StatusBadge, Textarea } from '../../../components/ui';

function SessionModal({ cls, session, onClose }) {
  const { t } = useTranslation();
  const opts = useQuery({ queryKey: ['live-options'], queryFn: () => api.get('/teacher/live/options').then((r) => r.data) });
  const start = session ? toLocalInput(session.scheduledStart) : toLocalInput(new Date(Date.now() + 3600 * 1000).setMinutes(0, 0, 0));
  const [f, setF] = useState({ title: session?.title || '', description: session?.description || '', start, duration: session?.durationMinutes || 60 });
  const [mode, setMode] = useState(session ? (isInPerson(session) ? 'IN_PERSON' : session.external ? 'EXTERNAL' : 'BUILT_IN') : 'EXTERNAL');
  const [link, setLink] = useState(session?.meetingUrl ?? null);
  const builtIn = opts.data?.builtInAvailable;
  const url = link ?? opts.data?.lastMeetingUrl ?? '';
  const inPerson = mode === 'IN_PERSON';
  const external = !inPerson && (mode === 'EXTERNAL' || !builtIn);
  const linkOk = !external || isValidMeetingUrl(url);
  const provider = meetingProvider(url);

  const save = useAction((body) => (session ? api.put(`/teacher/classes/${cls.id}/sessions/${session.id}`, body) : api.post(`/teacher/classes/${cls.id}/sessions`, body)), {
    success: session ? t('common.saved') : t('live.scheduled'), invalidate: [['sessions', cls.id], ['teacher-dashboard'], ['live-options']], onSuccess: onClose,
  });
  const submit = () => save.mutate({
    title: f.title, description: f.description, scheduledStart: fromLocalInput(f.start), durationMinutes: Number(f.duration),
    meetingUrl: external ? url.trim() : null, inPerson,
  });

  return (
    <Modal open onClose={onClose} title={session ? t('live.edit') : t('live.schedule')} size="lg"
      footer={<><Button variant="outline" onClick={onClose}>{t('common.cancel')}</Button>
        <Button loading={save.isPending} disabled={!f.title.trim() || !f.start || !linkOk} onClick={submit}>{t('common.save')}</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label={t('live.titleLabel')} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} className="sm:col-span-2" placeholder={t('live.titlePlaceholder')} />
        <Input label={t('live.startsAt')} type="datetime-local" value={f.start} onChange={(e) => setF({ ...f, start: e.target.value })} />
        <Input label={t('live.durationMin')} type="number" min="5" max="600" value={f.duration} onChange={(e) => setF({ ...f, duration: e.target.value })} />

        <div role="radiogroup" aria-label={t('live.whereTeach')} className={clsx('grid gap-2 sm:col-span-2', builtIn ? 'sm:grid-cols-3' : 'sm:grid-cols-2')}>
          {[['EXTERNAL', Link2, t('live.useMeetingLink'), t('live.useMeetingLinkHint')],
            ['IN_PERSON', MapPin, t('live.useInPerson'), t('live.useInPersonHint')],
            ...(builtIn ? [['BUILT_IN', Video, t('live.useBuiltIn'), t('live.useBuiltInHint')]] : [])].map(([id, Icon, label, hint]) => (
            <button key={id} type="button" role="radio" aria-checked={mode === id} onClick={() => setMode(id)}
              className={clsx('flex gap-3 rounded-2xl border-2 p-3 text-left', mode === id ? 'border-violet-500 bg-violet-50' : 'border-slate-200 hover:border-slate-300')}>
              <Icon className={clsx('mt-0.5 h-5 w-5 shrink-0', mode === id ? 'text-violet-600' : 'text-slate-400')} />
              <span><span className="block text-sm font-semibold">{label}</span><span className="block text-xs text-slate-500">{hint}</span></span>
            </button>
          ))}
        </div>

        {external && (
          <div className="sm:col-span-2">
            <Input label={t('live.meetingLinkLabel')} value={url} inputMode="url" placeholder="https://zoom.us/j/…  ·  https://meet.google.com/…"
              onChange={(e) => setLink(e.target.value)} error={url.trim() && !linkOk ? t('errors.meeting_url_invalid') : null}
              hint={provider && provider !== 'OTHER' ? t('live.detected', { provider: PROVIDER_LABEL[provider] }) : t('live.meetingLinkHint')} />
            {!session && opts.data?.lastMeetingUrl && link === null && <p className="mt-1 text-xs text-violet-700">{t('live.lastLinkUsed')}</p>}
          </div>
        )}
        <Textarea label={t('common.descriptionOptional')} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} className="sm:col-span-2" rows={3} />
      </div>
      {external && <p className="mt-3 rounded-xl bg-mist p-3 text-xs text-slate-600">{t('live.linkPrivacy')}</p>}
      {inPerson && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-900">{t('live.inPersonInfo')}</p>}
      {!session && <p className="mt-2 text-xs text-slate-500">{t('live.notifyHint')}</p>}
    </Modal>
  );
}

function AttendanceModal({ session, onClose }) {
  const { t } = useTranslation();
  const q = useQuery({ queryKey: ['session-attendance', session.id], queryFn: () => api.get(`/teacher/sessions/${session.id}/attendance`).then((r) => r.data), refetchInterval: session.status === 'LIVE' ? 15000 : false });
  const mark = useAction(({ studentId, present }) => api.put(`/teacher/sessions/${session.id}/attendance/${studentId}`, { present }), {
    invalidate: [['session-attendance', session.id], ['class-attendance', session.classId]],
  });
  return (
    <Modal open onClose={onClose} title={t('live.attendanceFor', { title: session.title })} size="lg">
      <QueryView query={q}>
        {(d) => (
          <>
            <p className="mb-3 text-xs text-slate-500">{d.inPerson ? t('live.attendanceInPersonHint') : d.external ? t('live.attendanceExternalHint') : t('live.attendanceHint')}</p>
            {d.students.length === 0 ? <EmptyState icon={UserCheck} title={t('students.none')} /> : (
              <div className="table-wrap"><table className="table">
                <thead><tr><th>{t('students.student')}</th>{d.external ? <th>{d.inPerson ? t('live.checkedInAt') : t('live.clickedJoin')}</th> : <><th>{t('live.minutes')}</th><th>{t('live.joins')}</th></>}<th>{t('common.status')}</th></tr></thead>
                <tbody>{d.students.map((r) => (
                  <tr key={r.studentId}>
                    <td>{r.name}</td>
                    {d.external ? <td>{r.joinCount > 0 ? <Badge tone="blue">{fmtDateTime(r.firstJoinedAt)}</Badge> : <span className="text-slate-400">—</span>}</td>
                      : <><td>{r.minutes}</td><td>{r.joinCount}</td></>}
                    <td>
                      <div className="flex items-center gap-1" role="radiogroup" aria-label={r.name}>
                        {r.inRoom && <Badge tone="live">{t('live.inRoom')}</Badge>}
                        <Button size="sm" variant={r.present ? 'primary' : 'outline'} aria-pressed={r.present} disabled={mark.isPending}
                          onClick={() => mark.mutate({ studentId: r.studentId, present: true })}>{t('live.present')}</Button>
                        <Button size="sm" variant={!r.present ? 'dark' : 'outline'} aria-pressed={!r.present} disabled={mark.isPending}
                          onClick={() => mark.mutate({ studentId: r.studentId, present: false })}>{t('live.absent')}</Button>
                      </div>
                    </td>
                  </tr>
                ))}</tbody>
              </table></div>
            )}
          </>
        )}
      </QueryView>
    </Modal>
  );
}

export default function LiveTab({ cls }) {
  const { t } = useTranslation();
  const [modal, setModal] = useState(null);
  const [attendance, setAttendance] = useState(null);
  const [cancelId, setCancelId] = useState(null);
  const q = useQuery({ queryKey: ['sessions', cls.id], queryFn: () => api.get(`/classes/${cls.id}/sessions`).then((r) => r.data), refetchInterval: 30000 });
  const cancel = useAction((id) => api.post(`/teacher/classes/${cls.id}/sessions/${id}/cancel`), { success: t('live.cancelled'), invalidate: [['sessions', cls.id]], onSuccess: () => setCancelId(null) });
  const end = useAction((id) => api.post(`/teacher/sessions/${id}/end`), { success: t('live.ended'), invalidate: [['sessions', cls.id], ['teacher-dashboard']] });
  const copy = (url) => navigator.clipboard.writeText(url).then(() => toast.success(t('live.linkCopied')));
  return (
    <Panel padded={false} title={t('tabs.live')} action={<Button size="sm" onClick={() => setModal({})}><CalendarPlus className="h-4 w-4" />{t('live.schedule')}</Button>}>
      <QueryView query={q}>
        {(list) => list.length === 0 ? <EmptyState icon={Radio} title={t('live.none')} text={t('live.noneTeacher')} action={<Button onClick={() => setModal({})}>{t('live.schedule')}</Button>} /> : (
          <ul className="divide-y divide-slate-100">
            {list.map((s) => (
              <li key={s.id} className="flex flex-col gap-3 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{s.title}</p><StatusBadge status={s.status} /><MeetingBadge session={s} /></div>
                  <p className="text-sm text-slate-500">{fmtDateTime(s.scheduledStart)} · {t('live.minutesCount', { count: s.durationMinutes })}</p>
                  {s.meetingUrl && <p className="mt-0.5 max-w-md truncate text-xs text-slate-400">{s.meetingUrl}</p>}
                </div>
                <div className="flex flex-wrap gap-2">
                  {(s.status === 'SCHEDULED' || s.status === 'LIVE') && isInPerson(s) && <Link to={`/teacher/sessions/${s.id}/checkin`} className="btn-dark btn-sm"><QrIcon className="h-4 w-4" />{t('live.showCheckinQr')}</Link>}
                  {(s.status === 'SCHEDULED' || s.status === 'LIVE') && !isInPerson(s) && <Link to={`/live/${s.id}`} className={s.status === 'LIVE' ? 'btn-danger btn-sm' : 'btn-dark btn-sm'}><PlayCircle className="h-4 w-4" />{s.status === 'LIVE' ? t('live.rejoin') : t('live.start')}</Link>}
                  {s.status === 'LIVE' && (s.external || isInPerson(s)) && <Button size="sm" variant="outline" loading={end.isPending} onClick={() => end.mutate(s.id)}>{t('live.markEnded')}</Button>}
                  {s.meetingUrl && s.status !== 'ENDED' && s.status !== 'CANCELLED' && <Button size="sm" variant="ghost" onClick={() => copy(s.meetingUrl)} aria-label={t('live.copyLink')}><Copy className="h-4 w-4" /></Button>}
                  {(s.status === 'LIVE' || s.status === 'ENDED' || (isInPerson(s) && s.status === 'SCHEDULED')) && <Button size="sm" variant="outline" onClick={() => setAttendance(s)}><UserCheck className="h-4 w-4" />{t('tabs.attendance')}</Button>}
                  {(s.status === 'SCHEDULED' || s.status === 'LIVE') && <Button size="sm" variant="ghost" onClick={() => setModal({ session: s })} aria-label={t('common.edit')}><Pencil className="h-4 w-4" /></Button>}
                  {s.status === 'SCHEDULED' && <Button size="sm" variant="ghost" onClick={() => setCancelId(s.id)} aria-label={t('live.cancel')}><XCircle className="h-4 w-4" /></Button>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </QueryView>
      {modal && <SessionModal cls={cls} session={modal.session} onClose={() => setModal(null)} />}
      {attendance && <AttendanceModal session={attendance} onClose={() => setAttendance(null)} />}
      <ConfirmDialog open={!!cancelId} danger title={t('live.cancel')} text={t('live.cancelConfirm')} confirmLabel={t('live.cancel')} loading={cancel.isPending}
        onConfirm={() => cancel.mutate(cancelId)} onClose={() => setCancelId(null)} />
    </Panel>
  );
}
