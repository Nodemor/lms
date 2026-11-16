import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { CalendarClock, CheckCircle2, Clock, Users } from 'lucide-react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useAction } from '../../lib/hooks';
import { Price, Thumb } from '../../components/ClassCard';
import { Avatar, Button, QueryView } from '../../components/ui';

export default function ClassDetail() {
  const { id } = useParams();
  const { t } = useTranslation();
  const { user } = useAuth();
  const nav = useNavigate();
  const q = useQuery({ queryKey: ['public-class', id], queryFn: () => api.get(`/public/classes/${id}`).then((r) => r.data) });
  const mine = useQuery({ queryKey: ['my-enrollments'], queryFn: () => api.get('/student/enrollments').then((r) => r.data), enabled: user?.role === 'STUDENT' });
  const enroll = useAction(() => api.post(`/student/classes/${id}/enroll`).then((r) => r.data), {
    invalidate: [['my-enrollments']],
    success: (d) => (d.status === 'PENDING' ? t('enroll.requested') : t('enroll.joined')),
    onSuccess: (d) => { if (d.status === 'ACTIVE') nav(`/student/classes/${id}`); },
  });
  const existing = mine.data?.find((e) => e.classInfo?.id === id);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <QueryView query={q}>
        {({ class: c, teacher }) => (
          <div className="grid gap-10 lg:grid-cols-[1fr_360px]">
            <div>
              <p className="text-sm text-slate-500">{c.subject}{c.gradeLevel ? ` / ${c.gradeLevel}` : ''}</p>
              <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">{c.title}</h1>
              <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-600">
                <span className="flex items-center gap-1.5"><Users className="h-4 w-4" />{t('class.studentCount', { count: c.studentCount })}</span>
                {c.scheduleText && <span className="flex items-center gap-1.5"><CalendarClock className="h-4 w-4" />{c.scheduleText}</span>}
              </div>
              <div className="mt-8 overflow-hidden rounded-panel"><Thumb c={c} /></div>
              {c.description && (
                <section className="mt-8">
                  <h2 className="text-xl font-semibold">{t('class.about')}</h2>
                  <p className="mt-3 whitespace-pre-line leading-relaxed text-slate-700">{c.description}</p>
                </section>
              )}
              <section className="mt-10">
                <h2 className="text-xl font-semibold">{t('class.yourMentor')}</h2>
                <div className="mt-4 flex gap-4 rounded-panel border border-slate-200 bg-white p-5">
                  <Avatar name={teacher.name || c.teacherName} size="lg" />
                  <div>
                    <p className="font-semibold">{teacher.name || c.teacherName}</p>
                    {teacher.headline && <p className="text-sm text-slate-500">{teacher.headline}</p>}
                    {teacher.subjects && <div className="mt-2 flex flex-wrap gap-1.5">{teacher.subjects.split(/[,;]+/).map((x) => x.trim()).filter(Boolean).map((x) => <span key={x} className="chip bg-violet-50 text-violet-800">{x}</span>)}</div>}
                    {teacher.bio && <p className="mt-2 whitespace-pre-line text-sm text-slate-700">{teacher.bio}</p>}
                    {teacher.qualifications && <p className="mt-2 whitespace-pre-line text-sm text-slate-500">{teacher.qualifications}</p>}
                  </div>
                </div>
              </section>
            </div>

            <aside className="lg:sticky lg:top-24 lg:self-start">
              <div className="panel p-6">
                <div className="text-2xl"><Price c={c} /></div>
                <ul className="mt-5 space-y-2.5 text-sm text-slate-700">
                  {['live', 'lessons', 'notes', 'assess'].map((k) => (
                    <li key={k} className="flex gap-2"><CheckCircle2 className="h-5 w-5 shrink-0 text-violet-600" />{t(`class.includes.${k}`)}</li>
                  ))}
                  {c.enrollmentMode === 'APPROVAL' && <li className="flex gap-2"><Clock className="h-5 w-5 shrink-0 text-amber-600" />{t('class.needsApproval')}</li>}
                </ul>
                <div className="mt-6">
                  {!user && <Link to={`/register?role=STUDENT&next=/classes/${id}`} className="btn-primary h-12 w-full">{t('enroll.signUpToJoin')}</Link>}
                  {user?.role === 'STUDENT' && (existing ? (
                    existing.status === 'PENDING'
                      ? <p className="rounded-xl bg-amber-50 p-3 text-center text-sm font-medium text-amber-800">{t('enroll.waiting')}</p>
                      : <Link to={`/student/classes/${id}`} className="btn-dark h-12 w-full">{t('enroll.openClass')}</Link>
                  ) : (
                    <Button className="h-12 w-full" loading={enroll.isPending} onClick={() => enroll.mutate()}>
                      {c.enrollmentMode === 'APPROVAL' ? t('enroll.request') : t('enroll.join')}
                    </Button>
                  ))}
                  {user && user.role !== 'STUDENT' && <p className="text-center text-sm text-slate-500">{t('enroll.studentsOnly')}</p>}
                </div>
                {c.billingType !== 'FREE' && <p className="mt-3 text-center text-xs text-slate-500">{t('enroll.payAfter')}</p>}
              </div>
            </aside>
          </div>
        )}
      </QueryView>
    </div>
  );
}
