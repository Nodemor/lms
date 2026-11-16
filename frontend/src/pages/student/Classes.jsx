import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { BookOpen } from 'lucide-react';
import api from '../../api/client';
import { useAction } from '../../lib/hooks';
import ClassCard from '../../components/ClassCard';
import { Badge, Button, EmptyState, PageHeader, QueryView } from '../../components/ui';

export default function StudentClasses() {
  const { t } = useTranslation();
  const q = useQuery({ queryKey: ['my-enrollments'], queryFn: () => api.get('/student/enrollments').then((r) => r.data) });
  const cancel = useAction((classId) => api.post(`/student/classes/${classId}/cancel`), { success: t('enroll.cancelled'), invalidate: [['my-enrollments']] });
  return (
    <>
      <PageHeader title={t('nav.myClasses')} actions={<Link to="/classes" className="btn-primary">{t('nav.explore')}</Link>} />
      <QueryView query={q}>
        {(list) => list.length === 0 ? (
          <div className="panel"><EmptyState icon={BookOpen} title={t('classes.studentEmpty')} text={t('classes.studentEmptyText')} action={<Link to="/classes" className="btn-primary">{t('nav.explore')}</Link>} /></div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {list.map((e) => (
              <div key={e.id} className="relative">
                <ClassCard c={e.classInfo} to={e.status === 'ACTIVE' ? `/student/classes/${e.classInfo.id}` : `/classes/${e.classInfo.id}`} />
                <div className="absolute left-3 top-3 flex gap-1">
                  {e.status === 'PENDING' && <Badge tone="amber">{t('enroll.waitingShort')}</Badge>}
                  {e.status === 'ACTIVE' && !e.hasContentAccess && <Badge tone="red">{t('enroll.paymentDue')}</Badge>}
                </div>
                {e.status === 'PENDING' && <Button size="sm" variant="ghost" className="mt-2" onClick={() => cancel.mutate(e.classInfo.id)}>{t('enroll.cancelRequest')}</Button>}
              </div>
            ))}
          </div>
        )}
      </QueryView>
    </>
  );
}
