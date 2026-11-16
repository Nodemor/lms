import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, BookOpen, CalendarClock, ClipboardList, CreditCard, PlayCircle, Radio, Search, Trophy } from 'lucide-react';
import api from '../../api/client';
import { intlLocale } from '../../i18n';
import { useAuth } from '../../context/AuthContext';
import { useNow } from '../../lib/hooks';
import { canJoin } from '../../lib/meetings';
import { fmtDateTime, relativeTime } from '../../lib/format';
import ClassCard, { Thumb } from '../../components/ClassCard';
import ProgressRing from '../../components/ProgressRing';
import MeetingBadge from '../../components/MeetingBadge';
import { Badge, EmptyState, Panel, QueryView, Stat } from '../../components/ui';

function greetingKey() {
  const h = Number(new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hour12: false, timeZone: 'Asia/Colombo' }).format(new Date()));
  if (h < 12) return 'dashboard.goodMorning';
  if (h < 17) return 'dashboard.goodAfternoon';
  return 'dashboard.goodEvening';
}

export default function StudentDashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const now = useNow(30000);
  const q = useQuery({ queryKey: ['student-dashboard'], queryFn: () => api.get('/student/dashboard').then((r) => r.data), refetchInterval: 30000 });

  return (
    <QueryView query={q}>
      {(d) => {
        const joinable = d.upcomingSessions.filter((s) => canJoin(s, now));
        // Continue learning: a paid-up class with lessons left, the one furthest along first.
        const continueClass = d.classes
          .map((c) => ({ c, p: d.progress?.[c.id] }))
          .filter(({ p }) => p && p.hasAccess && p.lessons > p.completed)
          .sort((a, b) => b.p.completed / b.p.lessons - a.p.completed / a.p.lessons)[0];
        return (
          <div className="grid gap-6">
            {/* welcome banner */}
            <section className="relative overflow-hidden rounded-panel bg-ink p-6 text-white sm:p-8">
              <div className="grid-lines absolute inset-0 opacity-50" aria-hidden="true" />
              <div className="glow-violet absolute -right-24 -top-32 h-96 w-96" aria-hidden="true" />
              <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-white/60">{t(greetingKey())}</p>
                  <h1 className="mt-1 text-3xl font-bold tracking-tight">{user.fullName.split(' ')[0]} 👋</h1>
                  <p className="mt-2 max-w-md text-white/70">{d.overallProgress == null ? t('dashboard.studentSubtitle') : t('dashboard.keepGoing')}</p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    <Link to="/student/classes" className="btn-primary">{t('nav.myClasses')}</Link>
                    <Link to="/classes" className="btn border border-white/25 text-white hover:bg-white/10"><Search className="h-4 w-4" />{t('nav.explore')}</Link>
                  </div>
                </div>
                {d.overallProgress != null && <ProgressRing value={d.overallProgress} label={t('dashboard.overallProgress')} />}
              </div>
            </section>

            {/* live / starting now */}
            {joinable.map((s) => (
              <div key={s.id} className="flex flex-col gap-4 rounded-panel border-2 border-live/40 bg-red-50 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-live text-white"><Radio className="h-6 w-6" /></span>
                  <div>
                    <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-live">{s.status === 'LIVE' ? t('live.liveNow') : t('live.startingSoon')} <MeetingBadge session={s} /></p>
                    <p className="text-lg font-semibold">{s.title}</p>
                    <p className="text-sm text-slate-500">{s.classTitle}</p>
                  </div>
                </div>
                <Link to={`/live/${s.id}`} className="btn-danger h-12 px-6 text-base"><PlayCircle className="h-5 w-5" />{t('live.join')}</Link>
              </div>
            ))}

            {/* continue learning */}
            {continueClass && (
              <Link to={`/student/classes/${continueClass.c.id}?tab=lessons`} className="card-lift group flex flex-col overflow-hidden rounded-panel border border-slate-200 bg-white sm:flex-row">
                <div className="sm:w-64"><Thumb c={continueClass.c} className="aspect-video sm:h-full" /></div>
                <div className="flex flex-1 flex-col justify-center p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-violet-600">{t('dashboard.continueLearning')}</p>
                  <p className="mt-1 text-xl font-semibold">{continueClass.c.title}</p>
                  <p className="text-sm text-slate-500">{continueClass.c.teacherName}</p>
                  <div className="mt-3 flex items-center gap-3">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-violet-500" style={{ width: `${Math.round((continueClass.p.completed / continueClass.p.lessons) * 100)}%` }} /></div>
                    <span className="text-sm font-semibold text-violet-700">{t('dashboard.lessonsDone', { done: continueClass.p.completed, total: continueClass.p.lessons })}</span>
                  </div>
                </div>
                <div className="hidden items-center pr-6 sm:flex"><span className="grid h-12 w-12 place-items-center rounded-full bg-violet-500 text-white transition group-hover:scale-110"><ArrowRight className="h-5 w-5" /></span></div>
              </Link>
            )}

            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <Stat icon={BookOpen} label={t('dashboard.enrolledClasses')} value={d.stats.enrolledClasses} tone="ink" />
              <Stat icon={CalendarClock} label={t('dashboard.upcoming')} value={d.stats.upcomingSessions} />
              <Stat icon={ClipboardList} label={t('dashboard.assignmentsDue')} value={d.stats.assignmentsDue} tone="amber" />
              <Stat icon={CreditCard} label={t('dashboard.paymentsDue')} value={d.stats.paymentsDue} tone={d.stats.paymentsDue ? 'red' : 'green'} />
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <Panel title={t('dashboard.upcomingSessions')} padded={false}>
                {d.upcomingSessions.length === 0 ? <EmptyState icon={Radio} title={t('dashboard.noSessions')} text={t('dashboard.noSessionsStudent')} /> : (
                  <ul className="divide-y divide-slate-100">{d.upcomingSessions.map((s) => (
                    <li key={s.id} className="flex items-center justify-between gap-3 px-5 py-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-violet-50 text-center leading-none text-violet-700">
                          <span><span className="block text-[10px] font-semibold uppercase">{new Intl.DateTimeFormat(intlLocale(), { month: 'short', timeZone: 'Asia/Colombo' }).format(new Date(s.scheduledStart))}</span>
                          <span className="block font-display text-base font-bold">{new Intl.DateTimeFormat('en-GB', { day: 'numeric', timeZone: 'Asia/Colombo' }).format(new Date(s.scheduledStart))}</span></span>
                        </span>
                        <div className="min-w-0"><p className="truncate font-semibold">{s.title}</p><p className="truncate text-sm text-slate-500">{s.classTitle} · {fmtDateTime(s.scheduledStart)}</p></div>
                      </div>
                      {canJoin(s, now) ? <Link to={`/live/${s.id}`} className="btn-danger btn-sm">{t('live.join')}</Link> : <span className="whitespace-nowrap text-xs text-slate-500">{relativeTime(s.scheduledStart)}</span>}
                    </li>))}</ul>
                )}
              </Panel>
              <Panel title={t('dashboard.dueSoon')} padded={false}>
                {d.assignmentsDue.length === 0 ? <EmptyState icon={ClipboardList} title={t('dashboard.allCaughtUp')} /> : (
                  <ul className="divide-y divide-slate-100">{d.assignmentsDue.map((a) => (
                    <li key={a.id}><Link to={`/student/classes/${a.classId}?tab=assignments`} className="flex items-center justify-between gap-3 px-5 py-4 hover:bg-mist">
                      <div className="min-w-0"><p className="truncate font-semibold">{a.title}</p><p className="text-sm text-slate-500">{a.classTitle}</p></div>
                      <Badge tone="amber">{relativeTime(a.dueAt)}</Badge></Link></li>))}</ul>
                )}
              </Panel>
            </div>

            {d.recentResults.length > 0 && (
              <Panel title={t('dashboard.recentResults')} action={<Link to="/student/results" className="text-sm font-semibold text-violet-700">{t('notifications.viewAll')}</Link>} padded={false}>
                <ul className="grid gap-px bg-slate-100 sm:grid-cols-2">{d.recentResults.map((r) => {
                  const pct = r.max ? Math.round((r.score / r.max) * 100) : 0;
                  return (
                    <li key={`${r.kind}-${r.id}`} className="flex items-center gap-3 bg-white px-5 py-4">
                      <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${pct >= 75 ? 'bg-emerald-50 text-emerald-600' : pct >= 40 ? 'bg-violet-50 text-violet-600' : 'bg-amber-50 text-amber-600'}`}><Trophy className="h-5 w-5" /></span>
                      <div className="min-w-0 flex-1"><p className="truncate font-medium">{r.title}</p><p className="truncate text-xs text-slate-500">{t(`dashboard.kind.${r.kind}`)} · {r.classTitle}</p></div>
                      <span className="font-display text-lg font-bold">{r.score}/{r.max}</span>
                    </li>
                  );
                })}</ul>
              </Panel>
            )}

            <div>
              <h2 className="mb-4 text-lg font-semibold">{t('nav.myClasses')}</h2>
              {d.classes.length === 0 ? <div className="panel"><EmptyState icon={BookOpen} title={t('classes.studentEmpty')} text={t('classes.studentEmptyText')} action={<Link to="/classes" className="btn-primary">{t('nav.explore')}</Link>} /></div> : (
                <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{d.classes.map((c) => <ClassCard key={c.id} c={c} to={`/student/classes/${c.id}`} progress={d.progress?.[c.id]} />)}</div>
              )}
            </div>
          </div>
        );
      }}
    </QueryView>
  );
}
