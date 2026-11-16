import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Archive, Eye, EyeOff, Link2, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../../api/client';
import { useAction } from '../../../lib/hooks';
import ClassForm from '../../../components/ClassForm';
import ClassQrPanel from '../../../components/ClassQrPanel';
import { Button, ConfirmDialog, Panel } from '../../../components/ui';

export default function OverviewTab({ cls }) {
  const { t } = useTranslation();
  const nav = useNavigate();
  const [confirm, setConfirm] = useState(null);
  const keys = [['teacher-class', cls.id], ['teacher-classes']];
  const save = useAction((b) => api.put(`/teacher/classes/${cls.id}`, b), { success: t('common.saved'), invalidate: keys });
  const status = useAction((s) => api.post(`/teacher/classes/${cls.id}/status`, { status: s }), {
    invalidate: keys, success: (r) => t(`classes.statusChanged.${r.data.status}`), onSuccess: () => setConfirm(null),
  });
  const del = useAction(() => api.delete(`/teacher/classes/${cls.id}`), { success: t('classes.deleted'), invalidate: [['teacher-classes']], onSuccess: () => nav('/teacher/classes') });
  const publicUrl = `${window.location.origin}/classes/${cls.id}`;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <Panel title={t('classes.details')}>
        <ClassForm key={cls.id} initial={cls} onSubmit={(b) => save.mutate(b)} submitting={save.isPending} submitLabel={t('common.saveChanges')} />
      </Panel>
      <div className="grid content-start gap-6">
        <ClassQrPanel cls={cls} />
        <Panel title={t('classes.visibility')}>
          <p className="text-sm text-slate-600">{t(`classes.visibilityText.${cls.status}`)}</p>
          <div className="mt-4 grid gap-2">
            {cls.status !== 'PUBLISHED' && <Button onClick={() => status.mutate('PUBLISHED')} loading={status.isPending}><Eye className="h-4 w-4" />{t('classes.publish')}</Button>}
            {cls.status === 'PUBLISHED' && <Button variant="outline" onClick={() => status.mutate('DRAFT')} loading={status.isPending}><EyeOff className="h-4 w-4" />{t('classes.unpublish')}</Button>}
            {cls.status === 'PUBLISHED' && (
              <Button variant="ghost" onClick={() => navigator.clipboard.writeText(publicUrl).then(() => toast.success(t('classes.linkCopied')))}><Link2 className="h-4 w-4" />{t('classes.copyLink')}</Button>
            )}
          </div>
        </Panel>
        <Panel title={t('classes.dangerZone')}>
          <div className="grid gap-2">
            {cls.status !== 'ARCHIVED' && <Button variant="outline" onClick={() => setConfirm('archive')}><Archive className="h-4 w-4" />{t('classes.archive')}</Button>}
            <Button variant="danger" onClick={() => setConfirm('delete')}><Trash2 className="h-4 w-4" />{t('classes.delete')}</Button>
          </div>
        </Panel>
      </div>
      <ConfirmDialog open={confirm === 'archive'} title={t('classes.archive')} text={t('classes.archiveConfirm')} confirmLabel={t('classes.archive')}
        loading={status.isPending} onConfirm={() => status.mutate('ARCHIVED')} onClose={() => setConfirm(null)} />
      <ConfirmDialog open={confirm === 'delete'} danger title={t('classes.delete')} text={t('classes.deleteConfirm')} confirmLabel={t('common.delete')}
        loading={del.isPending} onConfirm={() => del.mutate()} onClose={() => setConfirm(null)} />
    </div>
  );
}
