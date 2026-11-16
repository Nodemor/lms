import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Megaphone, Pencil, Pin, Trash2 } from 'lucide-react';
import api from '../api/client';
import { useAction } from '../lib/hooks';
import { fmtDateTime, relativeTime } from '../lib/format';
import { Badge, Button, ConfirmDialog, EmptyState, Input, Panel, QueryView, Textarea, Toggle } from './ui';

function Composer({ cls, item, onDone }) {
  const { t } = useTranslation();
  const [f, setF] = useState({ title: item?.title || '', body: item?.body || '', pinned: item?.pinned || false, notifyStudents: true });
  const save = useAction((body) => (item ? api.put(`/teacher/classes/${cls.id}/announcements/${item.id}`, body) : api.post(`/teacher/classes/${cls.id}/announcements`, body)), {
    success: item ? t('common.saved') : t('announcements.posted'), invalidate: [['announcements', cls.id]],
    onSuccess: () => { setF({ title: '', body: '', pinned: false, notifyStudents: true }); onDone?.(); },
  });
  return (
    <div className="grid gap-3 border-b border-slate-100 p-5">
      <Input label={t('announcements.titleLabel')} value={f.title} maxLength={200} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder={t('announcements.titlePlaceholder')} />
      <Textarea label={t('announcements.bodyLabel')} rows={4} value={f.body} maxLength={10000} onChange={(e) => setF({ ...f, body: e.target.value })} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-x-6">
          <Toggle checked={f.pinned} onChange={(v) => setF({ ...f, pinned: v })} label={t('announcements.pin')} />
          {!item && <Toggle checked={f.notifyStudents} onChange={(v) => setF({ ...f, notifyStudents: v })} label={t('announcements.notify')} />}
        </div>
        <div className="flex gap-2">
          {item && <Button variant="ghost" onClick={onDone}>{t('common.cancel')}</Button>}
          <Button loading={save.isPending} disabled={!f.title.trim() || !f.body.trim()} onClick={() => save.mutate(f)}>{item ? t('common.save') : t('announcements.post')}</Button>
        </div>
      </div>
    </div>
  );
}

/** Class announcements. Teachers post/edit/pin; students read. */
export default function AnnouncementsPanel({ cls, canManage }) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(null);
  const [del, setDel] = useState(null);
  const q = useQuery({ queryKey: ['announcements', cls.id], queryFn: () => api.get(`/classes/${cls.id}/announcements`).then((r) => r.data), refetchInterval: 60000 });
  const remove = useAction((id) => api.delete(`/teacher/classes/${cls.id}/announcements/${id}`), { success: t('common.deleted'), invalidate: [['announcements', cls.id]], onSuccess: () => setDel(null) });
  return (
    <Panel padded={false} title={t('tabs.announcements')}>
      {canManage && !editing && <Composer cls={cls} />}
      <QueryView query={q}>
        {(list) => list.length === 0 ? (
          <EmptyState icon={Megaphone} title={t('announcements.none')} text={canManage ? t('announcements.noneTeacher') : t('announcements.noneStudent')} />
        ) : (
          <ul className="divide-y divide-slate-100">
            {list.map((a) => editing?.id === a.id ? <li key={a.id}><Composer cls={cls} item={a} onDone={() => setEditing(null)} /></li> : (
              <li key={a.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {a.pinned && <Badge tone="violet"><Pin className="h-3 w-3" />{t('announcements.pinned')}</Badge>}
                      <h3 className="font-semibold">{a.title}</h3>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500" title={fmtDateTime(a.createdAt)}>{relativeTime(a.createdAt)}</p>
                  </div>
                  {canManage && (
                    <div className="flex shrink-0 gap-1">
                      <Button size="sm" variant="ghost" onClick={() => setEditing(a)} aria-label={t('common.edit')}><Pencil className="h-4 w-4" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => setDel(a.id)} aria-label={t('common.delete')}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  )}
                </div>
                <p className="mt-2 whitespace-pre-line leading-relaxed text-slate-700">{a.body}</p>
              </li>
            ))}
          </ul>
        )}
      </QueryView>
      <ConfirmDialog open={!!del} danger title={t('common.delete')} text={t('announcements.deleteConfirm')} confirmLabel={t('common.delete')} loading={remove.isPending}
        onConfirm={() => remove.mutate(del)} onClose={() => setDel(null)} />
    </Panel>
  );
}
