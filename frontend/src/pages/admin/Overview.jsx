import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { BadgeCheck, BookOpen, CreditCard, GraduationCap, LifeBuoy, Radio, School, UserX, Users, Wallet } from 'lucide-react';
import api from '../../api/client';
import { fmtMoney } from '../../lib/format';
import { PageHeader, QueryView, Stat } from '../../components/ui';

export default function AdminOverview() {
  const { t } = useTranslation();
  const q = useQuery({ queryKey: ['admin-stats'], queryFn: () => api.get('/admin/stats').then((r) => r.data), refetchInterval: 60000 });
  return (
    <>
      <PageHeader title={t('admin.overviewTitle')} subtitle={t('admin.overviewSubtitle')} />
      <QueryView query={q}>
        {(s) => (
          <div className="grid gap-6">
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <Stat icon={GraduationCap} label={t('admin.teachers')} value={s.teachers} tone="ink" />
              <Stat icon={Users} label={t('admin.students')} value={s.students} />
              <Stat icon={School} label={t('admin.publishedClasses')} value={`${s.publishedClasses}/${s.totalClasses}`} />
              <Stat icon={Radio} label={t('admin.liveNow')} value={s.liveNow} tone={s.liveNow ? 'red' : 'violet'} />
              <Stat icon={BookOpen} label={t('admin.activeEnrollments')} value={s.activeEnrollments} hint={t('admin.pendingCount', { count: s.pendingEnrollments })} />
              <Stat icon={BadgeCheck} label={t('admin.paidSubscriptions')} value={s.paidSubscriptions} tone="green" />
              <Stat icon={Wallet} label={t('admin.subscriptionRevenue')} value={fmtMoney(s.subscriptionRevenueThisMonth)} tone="green" />
              <Stat icon={CreditCard} label={t('admin.classFees')} value={fmtMoney(s.classFeesThisMonth)} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Link to="/admin/support" className="panel flex items-center gap-4 p-5 hover:border-violet-300"><LifeBuoy className="h-6 w-6 text-violet-600" /><div><p className="font-semibold">{t('admin.openTickets', { count: s.openTickets })}</p><p className="text-sm text-slate-500">{t('admin.openTicketsHint')}</p></div></Link>
              <Link to="/admin/users?status=SUSPENDED" className="panel flex items-center gap-4 p-5 hover:border-violet-300"><UserX className="h-6 w-6 text-red-600" /><div><p className="font-semibold">{t('admin.suspended', { count: s.suspendedUsers })}</p><p className="text-sm text-slate-500">{t('admin.suspendedHint')}</p></div></Link>
            </div>
          </div>
        )}
      </QueryView>
    </>
  );
}
