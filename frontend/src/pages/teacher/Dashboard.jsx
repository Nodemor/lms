import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { BadgeCheck, CalendarClock, ClipboardCheck, CreditCard, PlayCircle, Radio, School, Users, Wallet } from 'lucide-react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { fmtDateTime, fmtMoney, relativeTime } from '../../lib/format';
import { EmptyState, PageHeader, Panel, ProgressBar, QueryView, Stat, StatusBadge } from '../../components/ui';

export default function TeacherDashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const q = useQuery({ queryKey: ['teacher-dashboard'], queryFn: () => api.get('/teacher/dashboard').then((r) => r.data), refetchInterval: 60000 });
  return (
    <>
      <PageHeader title={t('dashboard.hello', { name: user.fullName.split(' ')[0] })} subtitle={t('dashboard.teacherSubtitle')}
        actions={<Link to="/teacher/classes?new=1" className="btn-primary">{t('classes.create')}</Link>} />
      <QueryView query={q}>
        {(d) => {
          const s = d.stats;
          const todo = [
            s.pendingEnrollments > 0 && { to: '/teacher/classes', text: t('dashboard.todoEnrollments', { count: s.pendingEnrollments }), icon: Users },
            s.pendingSlips > 0 && { to: '/teacher/payments?status=PENDING', text: t('dashboard.todoSlips', { count: s.pendingSlips }), icon: CreditCard },
            s.toGrade > 0 && { to: '/teacher/classes', text: t('dashboard.todoGrade', { count: s.toGrade }), icon: ClipboardCheck },
          ].filter(Boolean);
          const plan = d.subscription;
          return (
            <div className="grid gap-6">
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <Stat icon={Users} label={t('dashboard.totalStudents')} value={s.totalStudents} tone="ink" />
                <Stat icon={School} label={t('dashboard.activeClasses')} value={`${s.activeClasses}/${s.totalClasses}`} />
                <Stat icon={CalendarClock} label={t('dashboard.upcoming')} value={s.upcomingSessions} />
                <Stat icon={Wallet} label={t('dashboard.revenueMonth')} value={fmtMoney(s.revenueThisMonth)} tone="green" />
              </div>
              {todo.length > 0 && (
                <div className="rounded-panel border border-amber-200 bg-amber-50 p-4">
                  <p className="text-sm font-semibold text-amber-900">{t('dashboard.needsAttention')}</p>
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {todo.map((x) => <li key={x.text}><Link to={x.to} className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-medium hover:bg-amber-100"><x.icon className="h-4 w-4 text-amber-700" />{x.text}</Link></li>)}
                  </ul>
                </div>
              )}
              <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
                <Panel title={t('dashboard.upcomingSessions')} padded={false}>
                  {d.upcomingSessions.length === 0 ? <EmptyState icon={Radio} title={t('dashboard.noSessions')} text={t('dashboard.noSessionsTeacher')} /> : (
                    <ul className="divide-y divide-slate-100">
                      {d.upcomingSessions.map((ss) => (
                        <li key={ss.id} className="flex items-center justify-between gap-3 px-5 py-4">
                          <div className="min-w-0">
                            <p className="truncate font-semibold">{ss.title}</p>
                            <p className="text-sm text-slate-500">{ss.classTitle} · {fmtDateTime(ss.scheduledStart)} · {relativeTime(ss.scheduledStart)}</p>
                          </div>
                          <Link to={`/live/${ss.id}`} className={ss.status === 'LIVE' ? 'btn-danger btn-sm' : 'btn-dark btn-sm'}>
                            <PlayCircle className="h-4 w-4" />{ss.status === 'LIVE' ? t('live.rejoin') : t('live.start')}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </Panel>
                <div className="grid gap-6">
                  <Panel title={t('dashboard.plan')} action={<Link to="/teacher/subscription" className="text-sm font-semibold text-violet-700">{t('dashboard.managePlan')}</Link>}>
                    <p className="flex items-center gap-2 font-display text-xl font-bold"><BadgeCheck className="h-5 w-5 text-violet-600" />{plan.effectivePlan.name}</p>
                    <div className="mt-4 space-y-3 text-sm">
                      <div><div className="mb-1 flex justify-between"><span>{t('nav.myClasses')}</span><span>{plan.usage.classes}/{plan.effectivePlan.maxClasses}</span></div><ProgressBar value={(plan.usage.classes / plan.effectivePlan.maxClasses) * 100} /></div>
                      <div><div className="mb-1 flex justify-between"><span>{t('nav.students')}</span><span>{plan.usage.students}/{plan.effectivePlan.maxStudents}</span></div><ProgressBar value={(plan.usage.students / plan.effectivePlan.maxStudents) * 100} /></div>
                    </div>
                  </Panel>
                  <Panel title={t('dashboard.recentEnrollments')} padded={false}>
                    {d.recentEnrollments.length === 0 ? <p className="px-5 py-6 text-sm text-slate-500">{t('dashboard.noEnrollments')}</p> : (
                      <ul className="divide-y divide-slate-100">
                        {d.recentEnrollments.map((e) => (
                          <li key={e.id} className="flex items-center justify-between gap-2 px-5 py-3 text-sm">
                            <Link to={`/teacher/classes/${e.classId}?tab=students`} className="min-w-0"><span className="block truncate font-medium">{e.studentName}</span><span className="block truncate text-xs text-slate-500">{e.classTitle}</span></Link>
                            <StatusBadge status={e.status} />
                          </li>
                        ))}
                      </ul>
                    )}
                  </Panel>
                </div>
              </div>
            </div>
          );
        }}
      </QueryView>
    </>
  );
}
