import { useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, ClipboardList, CreditCard, FileText, ListChecks, Lock, Megaphone, Radio, UserCheck } from 'lucide-react';
import api from '../../api/client';
import { fmtMonth } from '../../lib/format';
import { Button, QueryView, Tabs } from '../../components/ui';
import ClassHero from '../../components/ClassHero';
import AnnouncementsPanel from '../../components/AnnouncementsPanel';
import { LiveList, LessonsView, MaterialsView, AssignmentsView, QuizzesView, MyAttendance, FeesView } from './tabs/StudentTabs';

export default function StudentClassView() {
  const { id } = useParams();
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const q = useQuery({ queryKey: ['member-class', id], queryFn: () => api.get(`/classes/${id}`).then((r) => r.data) });
  return (
    <QueryView query={q}>
      {(d) => {
        const c = d.class;
        const open = d.hasContentAccess;
        const defaultTab = open ? 'live' : 'fees';
        const tab = params.get('tab') || defaultTab;
        const tabs = [
          { id: 'live', label: t('tabs.live'), icon: Radio },
          { id: 'announcements', label: t('tabs.announcements'), icon: Megaphone },
          { id: 'lessons', label: t('tabs.lessons'), icon: BookOpen },
          { id: 'materials', label: t('tabs.materials'), icon: FileText },
          { id: 'assignments', label: t('tabs.assignments'), icon: ClipboardList },
          { id: 'quizzes', label: t('tabs.quizzes'), icon: ListChecks },
          { id: 'attendance', label: t('tabs.attendance'), icon: UserCheck },
          ...(c.billingType !== 'FREE' ? [{ id: 'fees', label: t('tabs.fees'), icon: CreditCard }] : []),
        ];
        const needsPay = !open && !['fees', 'attendance', 'announcements'].includes(tab);
        const views = { announcements: ({ cls: k }) => <AnnouncementsPanel cls={k} />, live: LiveList, lessons: LessonsView, materials: MaterialsView, assignments: AssignmentsView, quizzes: QuizzesView, attendance: MyAttendance, fees: FeesView };
        const View = views[tab] || LiveList;
        return (
          <>
            <ClassHero cls={c} />
            <Tabs tabs={tabs} active={tab} onChange={(v) => setParams({ tab: v })} />
            <div className="mt-5">
              {needsPay ? (
                <div className="panel flex flex-col items-center px-6 py-12 text-center">
                  <span className="grid h-14 w-14 place-items-center rounded-2xl bg-amber-50 text-amber-600"><Lock className="h-7 w-7" /></span>
                  <h2 className="mt-4 text-lg font-semibold">{t('fees.lockedTitle')}</h2>
                  <p className="mt-1 max-w-md text-sm text-slate-500">{c.billingType === 'MONTHLY' ? t('fees.lockedMonthly', { month: fmtMonth(d.currentPeriod) }) : t('fees.lockedOnce')}</p>
                  <Button className="mt-5" onClick={() => setParams({ tab: 'fees' })}>{t('fees.payNow')}</Button>
                </div>
              ) : <View cls={c} data={d} />}
            </div>
          </>
        );
      }}
    </QueryView>
  );
}
