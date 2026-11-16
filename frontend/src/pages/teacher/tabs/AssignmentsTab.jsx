import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ClipboardList, Download, Paperclip, Pencil, Plus, Trash2, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { errorMessage, openSignedUrl, uploadFile } from '../../../api/client';
import { useAction } from '../../../lib/hooks';
import { fmtDateTime, fromLocalInput, toLocalInput } from '../../../lib/format';
import { Badge, Button, ConfirmDialog, EmptyState, FileDrop, Input, Modal, Panel, QueryView, StatusBadge, Textarea, Toggle } from '../../../components/ui';
import { DOC_ACCEPT } from './MaterialsTab';

function AssignmentModal({ cls, item, onClose }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [f, setF] = useState({
    title: item?.title || '', instructions: item?.instructions || '', dueAt: toLocalInput(item?.dueAt || Date.now() + 7 * 86400000),
    maxMarks: item?.maxMarks || 100, allowLate: item?.allowLate || false, published: item ? item.published : true,
    attachmentKey: item?.attachmentKey || null, attachmentName: item?.attachmentName || null,
  });
  const [progress, setProgress] = useState(null);
  const [busy, setBusy] = useState(false);
  const pick = async (file) => {
    setProgress(0);
    try { const up = await uploadFile(file, 'ASSIGNMENT_ATTACHMENT', cls.id, setProgress); setF((x) => ({ ...x, attachmentKey: up.key, attachmentName: up.fileName })); }
    catch (e) { toast.error(errorMessage(e)); setProgress(null); }
  };
  const save = async () => {
    setBusy(true);
    try {
      const body = { ...f, dueAt: fromLocalInput(f.dueAt), maxMarks: Number(f.maxMarks) };
      if (item) await api.put(`/teacher/classes/${cls.id}/assignments/${item.id}`, body);
      else await api.post(`/teacher/classes/${cls.id}/assignments`, body);
      toast.success(item ? t('common.saved') : t('assignments.created'));
      qc.invalidateQueries({ queryKey: ['assignments', cls.id] });
      onClose();
    } catch (e) { toast.error(errorMessage(e)); } finally { setBusy(false); }
  };
  return (
    <Modal open onClose={onClose} title={item ? t('assignments.edit') : t('assignments.create')} size="lg"
      footer={<><Button variant="outline" onClick={onClose}>{t('common.cancel')}</Button><Button loading={busy} disabled={!f.title.trim() || !f.dueAt || (progress != null && progress < 100)} onClick={save}>{t('common.save')}</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label={t('assignments.titleLabel')} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} className="sm:col-span-2" maxLength={200} />
        <Textarea label={t('assignments.instructions')} value={f.instructions} onChange={(e) => setF({ ...f, instructions: e.target.value })} className="sm:col-span-2" rows={6} />
        <Input label={t('assignments.dueAt')} type="datetime-local" value={f.dueAt} onChange={(e) => setF({ ...f, dueAt: e.target.value })} />
        <Input label={t('assignments.maxMarks')} type="number" min="1" max="1000" value={f.maxMarks} onChange={(e) => setF({ ...f, maxMarks: e.target.value })} />
        <div className="sm:col-span-2">
          <span className="label">{t('assignments.attachmentOptional')}</span>
          {f.attachmentKey && progress == null ? (
            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm"><span className="flex items-center gap-2 truncate"><Paperclip className="h-4 w-4" />{f.attachmentName}</span>
              <Button size="sm" variant="ghost" onClick={() => setF({ ...f, attachmentKey: null, attachmentName: null })}>{t('common.remove')}</Button></div>
          ) : <FileDrop accept={DOC_ACCEPT} onFile={pick} progress={progress} fileName={f.attachmentName} />}
        </div>
        <Toggle checked={f.allowLate} onChange={(v) => setF({ ...f, allowLate: v })} label={t('assignments.allowLate')} description={t('assignments.allowLateHint')} />
        <Toggle checked={f.published} onChange={(v) => setF({ ...f, published: v })} label={t('assignments.publishNow')} description={t('assignments.publishHint')} />
      </div>
    </Modal>
  );
}

function SubmissionsModal({ assignment, onClose }) {
  const { t } = useTranslation();
  const [grading, setGrading] = useState(null);
  const q = useQuery({ queryKey: ['submissions', assignment.id], queryFn: () => api.get(`/teacher/assignments/${assignment.id}/submissions`).then((r) => r.data) });
  const grade = useAction(() => api.post(`/teacher/submissions/${grading.id}/grade`, { marks: Number(grading.marks), feedback: grading.feedback }), {
    success: t('assignments.graded'), invalidate: [['submissions', assignment.id], ['assignments', assignment.classId], ['teacher-dashboard']], onSuccess: () => setGrading(null),
  });
  return (
    <Modal open onClose={onClose} title={t('assignments.submissionsFor', { title: assignment.title })} size="xl">
      <QueryView query={q}>
        {(list) => list.length === 0 ? <EmptyState icon={Users} title={t('assignments.noSubmissions')} /> : (
          <ul className="divide-y divide-slate-100">
            {list.map((s) => (
              <li key={s.id} className="py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold">{s.studentName}</p><StatusBadge status={s.status} />{s.late && <Badge tone="amber">{t('assignments.late')}</Badge>}
                  <span className="text-xs text-slate-500">{fmtDateTime(s.submittedAt)}{s.version > 1 ? ` · ${t('assignments.version', { n: s.version })}` : ''}</span>
                  {s.marks != null && <span className="ml-auto font-display font-bold">{s.marks}/{assignment.maxMarks}</span>}
                </div>
                {s.textAnswer && <p className="mt-2 whitespace-pre-line rounded-xl bg-slate-50 p-3 text-sm">{s.textAnswer}</p>}
                <div className="mt-2 flex flex-wrap gap-2">
                  {s.hasFile && <Button size="sm" variant="outline" onClick={() => openSignedUrl(`/submissions/${s.id}/file`, true).catch((e) => toast.error(errorMessage(e)))}><Download className="h-4 w-4" />{s.fileName}</Button>}
                  <Button size="sm" onClick={() => setGrading({ id: s.id, marks: s.marks ?? '', feedback: s.feedback || '' })}>{s.status === 'GRADED' ? t('assignments.regrade') : t('assignments.grade')}</Button>
                </div>
                {grading?.id === s.id && (
                  <div className="mt-3 grid gap-3 rounded-2xl border border-violet-200 bg-violet-50/50 p-4 sm:grid-cols-[140px_1fr]">
                    <Input label={t('assignments.marksOutOf', { max: assignment.maxMarks })} type="number" min="0" max={assignment.maxMarks} value={grading.marks} onChange={(e) => setGrading({ ...grading, marks: e.target.value })} />
                    <Textarea label={t('assignments.feedback')} rows={2} value={grading.feedback} onChange={(e) => setGrading({ ...grading, feedback: e.target.value })} />
                    <div className="flex gap-2 sm:col-span-2"><Button size="sm" loading={grade.isPending} disabled={grading.marks === '' || Number(grading.marks) > assignment.maxMarks} onClick={() => grade.mutate()}>{t('assignments.saveGrade')}</Button>
                      <Button size="sm" variant="ghost" onClick={() => setGrading(null)}>{t('common.cancel')}</Button></div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </QueryView>
    </Modal>
  );
}

export default function AssignmentsTab({ cls }) {
  const { t } = useTranslation();
  const [modal, setModal] = useState(null);
  const [subs, setSubs] = useState(null);
  const [del, setDel] = useState(null);
  const q = useQuery({ queryKey: ['assignments', cls.id], queryFn: () => api.get(`/classes/${cls.id}/assignments`).then((r) => r.data) });
  const remove = useAction((id) => api.delete(`/teacher/classes/${cls.id}/assignments/${id}`), { success: t('common.deleted'), invalidate: [['assignments', cls.id]], onSuccess: () => setDel(null) });
  return (
    <Panel padded={false} title={t('tabs.assignments')} action={<Button size="sm" onClick={() => setModal({})}><Plus className="h-4 w-4" />{t('assignments.create')}</Button>}>
      <QueryView query={q}>
        {(list) => list.length === 0 ? <EmptyState icon={ClipboardList} title={t('assignments.none')} text={t('assignments.noneTeacher')} action={<Button onClick={() => setModal({})}>{t('assignments.create')}</Button>} /> : (
          <ul className="divide-y divide-slate-100">
            {list.map((a) => (
              <li key={a.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{a.title}</p>{!a.published && <Badge>{t('status.DRAFT')}</Badge>}{new Date(a.dueAt) < new Date() && <Badge tone="gray">{t('assignments.closed')}</Badge>}</div>
                  <p className="text-sm text-slate-500">{t('assignments.due', { date: fmtDateTime(a.dueAt) })} · {t('assignments.marks', { count: a.maxMarks })}</p>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => setSubs(a)}><Users className="h-4 w-4" />{t('assignments.submissionsCount', { count: a.submissionCount || 0 })}</Button>
                  <Button size="sm" variant="ghost" onClick={() => setModal({ item: a })} aria-label={t('common.edit')}><Pencil className="h-4 w-4" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => setDel(a.id)} aria-label={t('common.delete')}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </QueryView>
      {modal && <AssignmentModal cls={cls} item={modal.item} onClose={() => setModal(null)} />}
      {subs && <SubmissionsModal assignment={subs} onClose={() => setSubs(null)} />}
      <ConfirmDialog open={!!del} danger title={t('common.delete')} text={t('assignments.deleteConfirm')} confirmLabel={t('common.delete')} loading={remove.isPending}
        onConfirm={() => remove.mutate(del)} onClose={() => setDel(null)} />
    </Panel>
  );
}
