import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import BackButton from './BackButton';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import {
  BarChart3, BookOpen, CreditCard, FileClock, Gauge, GraduationCap, LifeBuoy, LogOut, Menu, Package, School, Search,
  Settings, ShieldCheck, Sparkles, Users, X, Bell, Trophy, MoreHorizontal,
} from 'lucide-react';
import Brand from './Brand';
import LanguageSwitcher from './LanguageSwitcher';
import NotificationBell from './NotificationBell';
import { Avatar } from '../ui';
import { useAuth } from '../../context/AuthContext';

const NAV = {
  TEACHER: [
    { to: '/teacher', icon: Gauge, key: 'nav.dashboard', end: true },
    { to: '/teacher/classes', icon: School, key: 'nav.myClasses' },
    { to: '/teacher/students', icon: Users, key: 'nav.students' },
    { to: '/teacher/payments', icon: CreditCard, key: 'nav.payments' },
    { to: '/teacher/subscription', icon: Sparkles, key: 'nav.subscription' },
  ],
  STUDENT: [
    { to: '/student', icon: Gauge, key: 'nav.dashboard', end: true },
    { to: '/student/classes', icon: BookOpen, key: 'nav.myClasses' },
    { to: '/student/results', icon: Trophy, key: 'nav.results' },
    { to: '/classes', icon: Search, key: 'nav.explore' },
    { to: '/student/payments', icon: CreditCard, key: 'nav.payments' },
  ],
  SUPER_ADMIN: [
    { to: '/admin', icon: BarChart3, key: 'nav.overview', end: true },
    { to: '/admin/users', icon: Users, key: 'nav.users' },
    { to: '/admin/classes', icon: School, key: 'nav.classes' },
    { to: '/admin/payments', icon: CreditCard, key: 'nav.payments' },
    { to: '/admin/plans', icon: Package, key: 'nav.plans' },
    { to: '/admin/support', icon: LifeBuoy, key: 'nav.support' },
    { to: '/admin/audit', icon: ShieldCheck, key: 'nav.security' },
    { to: '/admin/settings', icon: Settings, key: 'nav.platformSettings' },
  ],
};

const COMMON = [
  { to: '/notifications', icon: Bell, key: 'nav.notifications' },
  { to: '/support', icon: LifeBuoy, key: 'nav.help', roles: ['TEACHER', 'STUDENT'] },
  { to: '/settings', icon: Settings, key: 'nav.settings' },
];

export default function DashboardLayout() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  const nav = useNavigate();
  useEffect(() => setOpen(false), [loc.pathname]);

  const items = NAV[user.role] || [];
  const common = COMMON.filter((c) => !c.roles || c.roles.includes(user.role));
  const roleIcon = { TEACHER: GraduationCap, STUDENT: BookOpen, SUPER_ADMIN: ShieldCheck }[user.role];
  const RoleIcon = roleIcon || FileClock;

  const link = (item) => (
    <NavLink key={item.to} to={item.to} end={item.end}
      className={({ isActive }) => clsx('flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
        isActive ? 'bg-violet-500 text-white' : 'text-white/70 hover:bg-white/10 hover:text-white')}>
      <item.icon className="h-[18px] w-[18px] shrink-0" />{t(item.key)}
    </NavLink>
  );

  const sidebar = (
    <div className="flex h-full flex-col bg-ink px-4 py-5 text-white">
      <div className="px-1"><Brand dark compact to="/" /></div>
      <div className="mt-6 flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-xs text-white/70">
        <RoleIcon className="h-4 w-4 text-violet-300" />{t(`roles.${user.role}`)}
      </div>
      <nav className="mt-4 flex flex-1 flex-col gap-1 overflow-y-auto" aria-label={t('nav.main')}>
        {items.map(link)}
        <div className="my-3 h-px bg-white/10" />
        {common.map(link)}
      </nav>
      <button onClick={async () => { await logout(); nav('/login'); }}
        className="mt-3 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white">
        <LogOut className="h-[18px] w-[18px]" />{t('auth.signOut')}
      </button>
    </div>
  );

  return (
    <div className="min-h-screen lg:pl-64">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:block">{sidebar}</aside>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-950/50" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85vw]">{sidebar}</aside>
          <button className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white" onClick={() => setOpen(false)} aria-label={t('common.close')}><X className="h-5 w-5" /></button>
        </div>
      )}
      <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200/80 bg-mist/90 px-4 backdrop-blur sm:px-6">
        <button className="btn-ghost h-10 w-10 p-0 lg:hidden" onClick={() => setOpen(true)} aria-label={t('nav.menu')}><Menu className="h-5 w-5" /></button>
        <BackButton roots={[...items, ...common].map((i) => i.to)} />
        <div className="flex-1" />
        <LanguageSwitcher />
        <NotificationBell />
        <NavLink to="/settings" className="hidden items-center gap-2 rounded-xl py-1 pl-1 pr-3 hover:bg-white sm:flex" aria-label={t('nav.settings')}>
          <Avatar name={user.fullName} size="sm" />
          <span className="max-w-[10rem] truncate text-sm font-semibold">{user.fullName}</span>
        </NavLink>
      </header>
      <main className="mx-auto max-w-7xl px-4 pb-24 pt-6 sm:px-6 lg:py-8"><Outlet /></main>
      <nav aria-label={t('nav.main')} className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        <ul className="grid grid-cols-5">
          {items.slice(0, 4).map((item) => (
            <li key={item.to}>
              <NavLink to={item.to} end={item.end}
                className={({ isActive }) => clsx('flex flex-col items-center gap-0.5 px-1 py-2 text-[11px] font-medium', isActive ? 'text-violet-700' : 'text-slate-500')}>
                {({ isActive }) => (<><span className={clsx('grid h-7 w-12 place-items-center rounded-full transition', isActive && 'bg-violet-100')}><item.icon className="h-5 w-5" /></span><span className="max-w-full truncate">{t(item.key)}</span></>)}
              </NavLink>
            </li>
          ))}
          <li>
            <button onClick={() => setOpen(true)} className="flex w-full flex-col items-center gap-0.5 px-1 py-2 text-[11px] font-medium text-slate-500">
              <span className="grid h-7 w-12 place-items-center"><MoreHorizontal className="h-5 w-5" /></span>{t('nav.more')}
            </button>
          </li>
        </ul>
      </nav>
    </div>
  );
}
