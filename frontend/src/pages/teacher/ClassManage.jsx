import { useSearchParams, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, BookOpen, ClipboardList, CreditCard, FileText, LayoutDashboard, ListChecks, Megaphone, Radio, UserCheck, Users } from 'lucide-react';
import api from '../../api/client';
import { QueryView, Tabs } from '../../components/ui';
import ClassHero from '../../components/ClassHero';
import AnnouncementsPanel from '../../components/AnnouncementsPanel';
import OverviewTab from './tabs/OverviewTab';
import StudentsTab from './tabs/StudentsTab';
import LiveTab from './tabs/LiveTab';
import LessonsTab from './tabs/LessonsTab';
import MaterialsTab from './tabs/MaterialsTab';
import AssignmentsTab from './tabs/AssignmentsTab';
import QuizzesTab from './tabs/QuizzesTab';
import AttendanceTab from './tabs/AttendanceTab';
import ClassPaymentsTab from './tabs/ClassPaymentsTab';
import AnalyticsTab from './tabs/AnalyticsTab';

function AnnouncementsTab({ cls }) {
  return <AnnouncementsPanel cls={cls} canManage />;
}

export default function ClassManage() {
  const { id } = useParams();
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'overview';
  const q = useQuery({ queryKey: ['teacher-class', id], queryFn: () => api.get(`/teacher/classes/${id}`).then((r) => r.data) });
  const pending = useQuery({ queryKey: ['enrollments', id, 'PENDING', '', 0], queryFn: () => api.get(`/teacher/classes/${id}/enrollments`, { params: { status: 'PENDING', size: 1 } }).then((r) => r.data) });

  const tabs = [
    { id: 'overview', label: t('tabs.overview'), icon: LayoutDashboard },
    { id: 'announcements', label: t('tabs.announcements'), icon: Megaphone },
    { id: 'students', label: t('tabs.students'), icon: Users, count: pending.data?.total },
    { id: 'live', label: t('tabs.live'), icon: Radio },
    { id: 'lessons', label: t('tabs.lessons'), icon: BookOpen },
    { id: 'materials', label: t('tabs.materials'), icon: FileText },
    { id: 'assignments', label: t('tabs.assignments'), icon: ClipboardList },
    { id: 'quizzes', label: t('tabs.quizzes'), icon: ListChecks },
    { id: 'attendance', label: t('tabs.attendance'), icon: UserCheck },
    { id: 'payments', label: t('tabs.payments'), icon: CreditCard },
    { id: 'analytics', label: t('tabs.analytics'), icon: BarChart3 },
  ];
  const Body = { overview: OverviewTab, announcements: AnnouncementsTab, students: StudentsTab, live: LiveTab, lessons: LessonsTab, materials: MaterialsTab, assignments: AssignmentsTab, quizzes: QuizzesTab, attendance: AttendanceTab, payments: ClassPaymentsTab, analytics: AnalyticsTab }[tab] || OverviewTab;

  return (
    <QueryView query={q}>
      {(c) => (
        <>
          <ClassHero cls={c} showStatus />
          <Tabs tabs={tabs} active={tab} onChange={(v) => setParams({ tab: v })} />
          <div className="mt-5"><Body cls={c} classId={id} /></div>
        </>
      )}
    </QueryView>
  );
}
