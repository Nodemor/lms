import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import { ArrowDown, ArrowUp, FileText, Film, Paperclip, Pencil, Play, Plus, Trash2, Youtube } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { errorMessage, uploadFile } from '../../../api/client';
import { useAction } from '../../../lib/hooks';
import { fmtBytes, fmtDateTime, fmtDuration, fromLocalInput, toLocalInput } from '../../../lib/format';
import { youtubeId, youtubeThumb } from '../../../lib/youtube';
import VideoPlayer from '../../../components/VideoPlayer';
import LessonThumb from '../../../components/LessonThumb';
import { Badge, Button, ConfirmDialog, EmptyState, FileDrop, Input, Modal, Panel, QueryView, Textarea, Toggle } from '../../../components/ui';
import { DOC_ACCEPT } from './MaterialsTab';

function readDuration(file) {
  return new Promise((resolve) => {
    const v = document.createElement('video');
    v.preload = 'metadata';
    v.onloadedmetadata = () => { resolve(Number.isFinite(v.duration) ? Math.round(v.duration) : null); URL.revokeObjectURL(v.src); };
    v.onerror = () => resolve(null);
    v.src = URL.createObjectURL(file);
  });
}

function LessonModal({ cls, lesson, onClose }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [source, setSource] = useState(lesson?.sourceType || 'YOUTUBE');
  const [f, setF] = useState({
    title: lesson?.title || '', description: lesson?.description || '', published: lesson ? lesson.published : true,
    availableFrom: toLocalInput(lesson?.availableFrom),
    youtubeUrl: lesson?.youtubeId ? `https://youtu.be/${lesson.youtubeId}` : '',
  });
  const [file, setFile] = useState(null);
  const [videoProgress, setVideoProgress] = useState(null);
  const [notes, setNotes] = useState(lesson?.hasNotes ? { existing: true, fileName: lesson.notesName } : null);
  const [notesProgress, setNotesProgress] = useState(null);
  const [removeNotes, setRemoveNotes] = useState(false);
  const [busy, setBusy] = useState(false);

  const ytId = source === 'YOUTUBE' ? youtubeId(f.youtubeUrl) : null;
  const ytError = source === 'YOUTUBE' && f.youtubeUrl.trim() && !ytId;
  const needsVideo = !lesson && source === 'UPLOAD' && !file;
  const needsLink = source === 'YOUTUBE' && !ytId;
  const uploadingNotes = notesProgress != null && notesProgress < 100;

  const pickNotes = async (fl) => {
    setNotesProgress(0);
    try {
      const up = await uploadFile(fl, 'MATERIAL', cls.id, setNotesProgress);
      setNotes({ key: up.key, fileName: up.fileName, size: up.size });
      setRemoveNotes(false);
    } catch (e) { toast.error(errorMessage(e)); } finally { setNotesProgress(null); }
  };

  const save = async () => {
    setBusy(true);
    try {
      const body = {
        title: f.title, description: f.description, published: f.published, availableFrom: fromLocalInput(f.availableFrom),
        sourceType: source, youtubeUrl: source === 'YOUTUBE' ? f.youtubeUrl : null,
        notesKey: notes?.key || null, notesName: notes?.fileName || null, removeNotes: removeNotes && !notes?.key,
      };
      if (lesson) {
        await api.put(`/teacher/classes/${cls.id}/lessons/${lesson.id}`, body);
      } else if (source === 'UPLOAD') {
        const durationSeconds = await readDuration(file);
        setVideoProgress(0);
        const up = await uploadFile(file, 'LESSON_VIDEO', cls.id, setVideoProgress);
        await api.post(`/teacher/classes/${cls.id}/lessons`, { ...body, videoKey: up.key, durationSeconds });
      } else {
        await api.post(`/teacher/classes/${cls.id}/lessons`, body);
      }
      toast.success(lesson ? t('common.saved') : t('lessons.added'));
      qc.invalidateQueries({ queryKey: ['lessons', cls.id] });
      onClose();
    } catch (e) { toast.error(errorMessage(e)); setVideoProgress(null); } finally { setBusy(false); }
  };

  const sources = [
    { id: 'YOUTUBE', icon: Youtube, label: t('lessons.sourceYoutube'), hint: t('lessons.sourceYoutubeHint') },
    { id: 'UPLOAD', icon: Film, label: t('lessons.sourceUpload'), hint: t('lessons.sourceUploadHint') },
  ];
  // An existing uploaded lesson may switch to YouTube; a YouTube lesson can't switch to upload here (add a new lesson instead).
  const allowedSources = lesson ? sources.filter((s) => s.id === 'YOUTUBE' || lesson.sourceType === 'UPLOAD') : sources;

  return (
    <Modal open onClose={busy ? undefined : onClose} title={lesson ? t('lessons.edit') : t('lessons.add')} size="lg"
      footer={<><Button variant="outline" onClick={onClose} disabled={busy}>{t('common.cancel')}</Button>
        <Button loading={busy} disabled={!f.title.trim() || needsVideo || needsLink || uploadingNotes} onClick={save}>
          {lesson ? t('common.save') : source === 'UPLOAD' ? t('lessons.upload') : t('lessons.addLesson')}
        </Button></>}>
      <div className="grid gap-5">
        <div role="radiogroup" aria-label={t('lessons.videoSource')} className="grid gap-2 sm:grid-cols-2">
          {allowedSources.map((s) => (
            <button key={s.id} type="button" role="radio" aria-checked={source === s.id} onClick={() => setSource(s.id)} disabled={busy}
              className={clsx('flex gap-3 rounded-2xl border-2 p-3 text-left transition', source === s.id ? 'border-violet-500 bg-violet-50' : 'border-slate-200 hover:border-slate-300')}>
              <s.icon className={clsx('mt-0.5 h-5 w-5 shrink-0', source === s.id ? 'text-violet-600' : 'text-slate-400')} />
              <span><span className="block text-sm font-semibold">{s.label}</span><span className="block text-xs text-slate-500">{s.hint}</span></span>
            </button>
          ))}
        </div>

        {source === 'YOUTUBE' && (
          <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
            <div>
              <Input label={t('lessons.youtubeLink')} value={f.youtubeUrl} placeholder="https://youtu.be/…" inputMode="url"
                onChange={(e) => setF({ ...f, youtubeUrl: e.target.value })} error={ytError ? t('errors.youtube_invalid') : null}
                hint={t('lessons.youtubeHint')} />
            </div>
            <div className="aspect-video overflow-hidden rounded-xl bg-slate-100 sm:mt-7">
              {ytId ? <img src={youtubeThumb(ytId)} alt={t('lessons.thumbnailPreview')} className="h-full w-full object-cover" />
                : <div className="grid h-full place-items-center p-2 text-center text-xs text-slate-400">{t('lessons.thumbnailAuto')}</div>}
            </div>
          </div>
        )}

        {source === 'UPLOAD' && !lesson && (
          <FileDrop accept="video/mp4,video/webm,video/quicktime,.m4v" onFile={(fl) => { setFile(fl); if (!f.title) setF((x) => ({ ...x, title: fl.name.replace(/\.[^.]+$/, '') })); }}
            fileName={file && `${file.name} (${fmtBytes(file.size)})`} progress={videoProgress} hint={t('lessons.videoHint')} disabled={busy} />
        )}

        <Input label={t('lessons.titleLabel')} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} maxLength={200} />
        <Textarea label={t('lessons.descriptionLabel')} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} rows={4}
          hint={t('lessons.descriptionHint')} />

        <div>
          <span className="label">{t('lessons.lectureNotes')}</span>
          {notes && notesProgress == null ? (
            <div className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm">
              <span className="flex min-w-0 items-center gap-2"><Paperclip className="h-4 w-4 shrink-0" /><span className="truncate">{notes.fileName}</span></span>
              <Button size="sm" variant="ghost" onClick={() => { setNotes(null); setRemoveNotes(true); }}>{t('common.remove')}</Button>
            </div>
          ) : <FileDrop accept={DOC_ACCEPT} onFile={pickNotes} progress={notesProgress} hint={t('lessons.lectureNotesHint')} disabled={busy} />}
        </div>

        <Input label={t('lessons.availableFrom')} type="datetime-local" value={f.availableFrom} onChange={(e) => setF({ ...f, availableFrom: e.target.value })} hint={t('lessons.availableHint')} />
        <Toggle checked={f.published} onChange={(v) => setF({ ...f, published: v })} label={t('lessons.visible')} description={t('lessons.visibleHint')} />
        {source === 'YOUTUBE' && <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-900">{t('lessons.youtubePrivacyNote')}</p>}
      </div>
    </Modal>
  );
}

export default function LessonsTab({ cls }) {
  const { t } = useTranslation();
  const [modal, setModal] = useState(null);
  const [playing, setPlaying] = useState(null);
  const [del, setDel] = useState(null);
  const q = useQuery({ queryKey: ['lessons', cls.id], queryFn: () => api.get(`/classes/${cls.id}/lessons`).then((r) => r.data) });
  const remove = useAction((id) => api.delete(`/teacher/classes/${cls.id}/lessons/${id}`), { success: t('common.deleted'), invalidate: [['lessons', cls.id]], onSuccess: () => setDel(null) });
  const reorder = useAction((ids) => api.put(`/teacher/classes/${cls.id}/lessons/order`, ids), { invalidate: [['lessons', cls.id]] });
  const move = (list, i, dir) => {
    const ids = list.map((l) => l.id);
    const j = i + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    reorder.mutate(ids);
  };
  return (
    <Panel padded={false} title={t('tabs.lessons')} action={<Button size="sm" onClick={() => setModal({})}><Plus className="h-4 w-4" />{t('lessons.add')}</Button>}>
      <QueryView query={q}>
        {(list) => list.length === 0 ? <EmptyState icon={Film} title={t('lessons.none')} text={t('lessons.noneTeacher')} action={<Button onClick={() => setModal({})}>{t('lessons.add')}</Button>} /> : (
          <ol className="divide-y divide-slate-100">
            {list.map((l, i) => (
              <li key={l.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center">
                <button onClick={() => setPlaying(l)} aria-label={t('lessons.watch')} className="self-start"><LessonThumb lesson={l} /></button>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-slate-400">{i + 1}.</span><p className="font-semibold">{l.title}</p>
                    {l.sourceType === 'YOUTUBE' && <Badge tone="red">YouTube</Badge>}
                    {!l.published && <Badge>{t('lessons.hidden')}</Badge>}
                    {l.availableFrom && new Date(l.availableFrom) > new Date() && <Badge tone="violet">{t('lessons.opensOn', { date: fmtDateTime(l.availableFrom) })}</Badge>}
                    {l.hasNotes && <Badge tone="green"><FileText className="h-3 w-3" />{t('lessons.hasNotes')}</Badge>}
                  </div>
                  {l.description && <p className="mt-1 line-clamp-2 text-sm text-slate-600">{l.description}</p>}
                  <p className="mt-1 text-xs text-slate-500">{l.durationSeconds ? fmtDuration(l.durationSeconds) : '—'}{l.sourceType === 'UPLOAD' ? ` · ${fmtBytes(l.sizeBytes)}` : ''}</p>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => move(list, i, -1)} disabled={i === 0} aria-label={t('common.moveUp')}><ArrowUp className="h-4 w-4" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => move(list, i, 1)} disabled={i === list.length - 1} aria-label={t('common.moveDown')}><ArrowDown className="h-4 w-4" /></Button>
                  <Button size="sm" variant="outline" onClick={() => setPlaying(l)}><Play className="h-4 w-4" />{t('lessons.watch')}</Button>
                  <Button size="sm" variant="ghost" onClick={() => setModal({ lesson: l })} aria-label={t('common.edit')}><Pencil className="h-4 w-4" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => setDel(l.id)} aria-label={t('common.delete')}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </li>
            ))}
          </ol>
        )}
      </QueryView>
      {modal && <LessonModal cls={cls} lesson={modal.lesson} onClose={() => setModal(null)} />}
      <Modal open={!!playing} onClose={() => setPlaying(null)} title={playing?.title} size="xl">{playing && <VideoPlayer lesson={playing} />}</Modal>
      <ConfirmDialog open={!!del} danger title={t('common.delete')} text={t('lessons.deleteConfirm')} confirmLabel={t('common.delete')} loading={remove.isPending}
        onConfirm={() => remove.mutate(del)} onClose={() => setDel(null)} />
    </Panel>
  );
}
