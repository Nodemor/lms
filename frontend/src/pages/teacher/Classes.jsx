import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Plus, School } from 'lucide-react';
import api from '../../api/client';
import { useAction } from '../../lib/hooks';
import ClassCard from '../../components/ClassCard';
import ClassForm from '../../components/ClassForm';
import { Button, EmptyState, Modal, PageHeader, QueryView } from '../../components/ui';

export default function TeacherClasses() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const [open, setOpen] = useState(params.get('new') === '1');
  useEffect(() => { if (params.get('new') === '1') { setOpen(true); setParams({}, { replace: true }); } }, [params, setParams]);
  const q = useQuery({ queryKey: ['teacher-classes'], queryFn: () => api.get('/teacher/classes').then((r) => r.data) });
  const create = useAction((body) => api.post('/teacher/classes', body).then((r) => r.data), {
    success: t('classes.created'), invalidate: [['teacher-classes'], ['teacher-dashboard']],
    onSuccess: (c) => { setOpen(false); nav(`/teacher/classes/${c.id}`); },
  });
  return (
    <>
      <PageHeader title={t('nav.myClasses')} subtitle={t('classes.teacherSubtitle')}
        actions={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" />{t('classes.create')}</Button>} />
      <QueryView query={q}>
        {(list) => list.length === 0 ? (
          <div className="panel"><EmptyState icon={School} title={t('classes.emptyTitle')} text={t('classes.emptyText')} action={<Button onClick={() => setOpen(true)}>{t('classes.create')}</Button>} /></div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {list.map((c) => <ClassCard key={c.id} c={c} to={`/teacher/classes/${c.id}`} showStatus />)}
          </div>
        )}
      </QueryView>
      <Modal open={open} onClose={() => setOpen(false)} title={t('classes.create')} size="lg">
        <p className="mb-4 text-sm text-slate-500">{t('classes.createHint')}</p>
        <ClassForm onSubmit={(b) => create.mutate(b)} submitting={create.isPending} submitLabel={t('classes.createDraft')} />
      </Modal>
    </>
  );
}
