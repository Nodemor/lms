import { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Mail, Menu, MessageCircle, X } from 'lucide-react';
import { prettyPhone, useContact, whatsappLink } from '../../lib/contact';
import Brand from './Brand';
import LanguageSwitcher from './LanguageSwitcher';
import { useAuth, homePathFor } from '../../context/AuthContext';

export default function PublicLayout() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const contact = useContact();
  const [open, setOpen] = useState(false);
  const links = [{ to: '/classes', label: t('nav.explore') }, { to: '/pricing', label: t('nav.pricing') }];
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-ink text-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Brand dark />
          <nav className="hidden items-center gap-1 md:flex">
            {links.map((l) => (
              <NavLink key={l.to} to={l.to} className={({ isActive }) => `rounded-lg px-3 py-2 text-sm font-medium ${isActive ? 'text-white' : 'text-white/70 hover:text-white'}`}>{l.label}</NavLink>
            ))}
          </nav>
          <div className="hidden items-center gap-3 md:flex">
            <LanguageSwitcher dark />
            {user ? (
              <Link to={homePathFor(user)} className="btn-primary">{t('nav.dashboard')}</Link>
            ) : (
              <>
                <Link to="/login" className="btn h-10 text-white/90 hover:text-white">{t('auth.signIn')}</Link>
                <Link to="/register" className="btn-primary">{t('auth.getStarted')}</Link>
              </>
            )}
          </div>
          <button className="btn h-10 w-10 p-0 text-white md:hidden" onClick={() => setOpen((v) => !v)} aria-label={t('nav.menu')} aria-expanded={open}>
            {open ? <X /> : <Menu />}
          </button>
        </div>
        {open && (
          <div className="border-t border-white/10 px-4 pb-5 pt-3 md:hidden">
            {links.map((l) => <Link key={l.to} to={l.to} onClick={() => setOpen(false)} className="block rounded-lg px-2 py-3 text-base">{l.label}</Link>)}
            <div className="my-3"><LanguageSwitcher dark /></div>
            {user ? <Link to={homePathFor(user)} onClick={() => setOpen(false)} className="btn-primary w-full">{t('nav.dashboard')}</Link> : (
              <div className="grid grid-cols-2 gap-2">
                <Link to="/login" onClick={() => setOpen(false)} className="btn border border-white/30 text-white">{t('auth.signIn')}</Link>
                <Link to="/register" onClick={() => setOpen(false)} className="btn-primary">{t('auth.getStarted')}</Link>
              </div>
            )}
          </div>
        )}
      </header>
      <main className="flex-1"><Outlet /></main>
      <footer className="bg-ink text-white/70">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <Brand dark /><p className="mt-3 max-w-sm text-sm">{t('footer.tagline')}</p>
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm">
              <a href={whatsappLink(contact.whatsapp)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 hover:text-white"><MessageCircle className="h-4 w-4 text-[#25D366]" />{prettyPhone(contact.whatsapp)}</a>
              <a href={`mailto:${contact.supportEmail}`} className="inline-flex items-center gap-1.5 hover:text-white"><Mail className="h-4 w-4 text-violet-400" />{contact.supportEmail}</a>
            </div>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <Link to="/classes" className="hover:text-white">{t('nav.explore')}</Link>
            <Link to="/pricing" className="hover:text-white">{t('nav.pricing')}</Link>
            <Link to="/register?role=TEACHER" className="hover:text-white">{t('footer.forTeachers')}</Link>
            <a href="https://nodemor.io" className="hover:text-white" rel="noopener">nodemor.io</a>
          </div>
        </div>
        <p className="border-t border-white/10 py-4 text-center text-xs">© {new Date().getFullYear()} NodeMor Academy · nodemor.io</p>
      </footer>
    </div>
  );
}
