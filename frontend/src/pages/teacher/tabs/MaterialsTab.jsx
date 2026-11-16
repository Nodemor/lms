import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, FileText, Pencil, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { errorMessage, openSignedUrl, uploadFile } from '../../../api/client';
import { useAction } from '../../../lib/hooks';
import { fmtBytes, fmtDate } from '../../../lib/format';
import { Badge, Button, ConfirmDialog, EmptyState, FileDrop, Input, Modal, Panel, QueryView, Textarea, Toggle } from '../../../components/ui';

export const DOC_ACCEPT = '.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.zip,.jpg,.jpeg,.png,.webp';

function MaterialModal({ cls, item, onClose }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [f, setF] = useState({ title: item?.title || '', description: item?.description || '', category: item?.category || '', downloadable: item ? item.downloadable : true });
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(null);
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    try {
      if (item) {
        await api.put(`/teacher/classes/${cls.id}/materials/${item.id}`, { ...f });
      } else {
        setProgress(0);
        const up = await uploadFile(file, 'MATERIAL', cls.id, setProgress);
        await api.post(`/teacher/classes/${cls.id}/materials`, { ...f, fileKey: up.key, fileName: up.fileName });
      }
      toast.success(item ? t('common.saved') : t('materials.added'));
      qc.invalidateQueries({ queryKey: ['materials', cls.id] });
      onClose();
    } catch (e) { toast.error(errorMessage(e)); setProgress(null); } finally { setBusy(false); }
  };
  return (
    <Modal open onClose={busy ? undefined : onClose} title={item ? t('materials.edit') : t('materials.add')}
      footer={<><Button variant="outline" onClick={onClose} disabled={busy}>{t('common.cancel')}</Button><Button loading={busy} disabled={!f.title.trim() || (!item && !file)} onClick={save}>{item ? t('common.save') : t('materials.upload')}</Button></>}>
      <div className="grid gap-4">
        {!item && <FileDrop accept={DOC_ACCEPT} onFile={(fl) => { setFile(fl); if (!f.title) setF((x) => ({ ...x, title: fl.name.replace(/\.[^.]+$/, '') })); }}
          fileName={file && `${file.name} (${fmtBytes(file.size)})`} progress={progress} hint={t('materials.fileHint')} disabled={busy} />}
        <Input label={t('materials.titleLabel')} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} maxLength={200} />
        <Input label={t('materials.category')} value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} placeholder={t('materials.categoryPlaceholder')} maxLength={60} />
        <Textarea label={t('common.descriptionOptional')} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} rows={3} />
        <Toggle checked={f.downloadable} onChange={(v) => setF({ ...f, downloadable: v })} label={t('materials.allowDownload')} description={t('materials.allowDownloadHint')} />
      </div>
    </Modal>
  );
}

export default function MaterialsTab({ cls }) {
  const { t } = useTranslation();
  const [modal, setModal] = useState(null);
  const [del, setDel] = useState(null);
  const q = useQuery({ queryKey: ['materials', cls.id], queryFn: () => api.get(`/classes/${cls.id}/materials`).then((r) => r.data) });
  const remove = useAction((id) => api.delete(`/teacher/classes/${cls.id}/materials/${id}`), { success: t('common.deleted'), invalidate: [['materials', cls.id]], onSuccess: () => setDel(null) });
  return (
    <Panel padded={false} title={t('tabs.materials')} action={<Button size="sm" onClick={() => setModal({})}><Plus className="h-4 w-4" />{t('materials.add')}</Button>}>
      <QueryView query={q}>
        {(list) => list.length === 0 ? <EmptyState icon={FileText} title={t('materials.none')} text={t('materials.noneTeacher')} action={<Button onClick={() => setModal({})}>{t('materials.add')}</Button>} /> : (
          <ul className="divide-y divide-slate-100">
            {list.map((m) => (
              <li key={m.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center">
                <FileText className="hidden h-8 w-8 shrink-0 text-violet-500 sm:block" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{m.title}</p>{m.category && <Badge tone="violet">{m.category}</Badge>}{!m.downloadable && <Badge>{t('materials.previewOnly')}</Badge>}</div>
                  <p className="truncate text-sm text-slate-500">{m.fileName} · {fmtBytes(m.sizeBytes)} · {fmtDate(m.createdAt)}</p>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => openSignedUrl(`/materials/${m.id}/url`).catch((e) => toast.error(errorMessage(e)))}><Eye className="h-4 w-4" />{t('materials.open')}</Button>
                  <Button size="sm" variant="ghost" onClick={() => setModal({ item: m })} aria-label={t('common.edit')}><Pencil className="h-4 w-4" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => setDel(m.id)} aria-label={t('common.delete')}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </QueryView>
      {modal && <MaterialModal cls={cls} item={modal.item} onClose={() => setModal(null)} />}
      <ConfirmDialog open={!!del} danger title={t('common.delete')} text={t('materials.deleteConfirm')} confirmLabel={t('common.delete')} loading={remove.isPending}
        onConfirm={() => remove.mutate(del)} onClose={() => setDel(null)} />
    </Panel>
  );
}
