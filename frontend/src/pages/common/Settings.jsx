import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api, { errorMessage } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { LANGUAGES } from '../../i18n';
import { Button, Input, PageHeader, Panel, QueryView, Textarea, Toggle } from '../../components/ui';
import { passwordOk } from '../public/Register';
import clsx from 'clsx';

function ProfileForm({ data }) {
  const { t } = useTranslation();
  const { setUser } = useAuth();
  const role = data.user.role;
  const [f, setF] = useState({ fullName: data.user.fullName || '', phone: data.user.phone || '', ...(data.profile || {}) });
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data: d } = await api.put('/me', { ...f, dateOfBirth: f.dateOfBirth || null });
      setUser(d.user);
      toast.success(t('common.saved'));
    } catch (err) { toast.error(errorMessage(err)); } finally { setSaving(false); }
  };
  return (
    <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
      <Input label={t('auth.fullName')} value={f.fullName} onChange={set('fullName')} required />
      <Input label={t('auth.phone')} type="tel" value={f.phone} onChange={set('phone')} />
      <Input label={t('auth.email')} value={data.user.email} disabled className="sm:col-span-2" hint={t('settings.emailFixed')} />
      {role === 'TEACHER' && <>
        <Input label={t('settings.headline')} value={f.headline || ''} onChange={set('headline')} className="sm:col-span-2" placeholder={t('settings.headlinePlaceholder')} />
        <Input label={t('settings.subjects')} value={f.subjects || ''} onChange={set('subjects')} className="sm:col-span-2" />
        <Textarea label={t('settings.bio')} value={f.bio || ''} onChange={set('bio')} className="sm:col-span-2" />
        <Textarea label={t('settings.qualifications')} value={f.qualifications || ''} onChange={set('qualifications')} className="sm:col-span-2" rows={3} />
        <Textarea label={t('settings.bankDetails')} value={f.bankDetails || ''} onChange={set('bankDetails')} className="sm:col-span-2" rows={4}
          placeholder={t('settings.bankDetailsPlaceholder')} hint={t('settings.bankDetailsHint')} />
      </>}
      {role === 'STUDENT' && <>
        <Input label={t('settings.school')} value={f.school || ''} onChange={set('school')} />
        <Input label={t('settings.grade')} value={f.grade || ''} onChange={set('grade')} />
        <Input label={t('settings.guardianName')} value={f.guardianName || ''} onChange={set('guardianName')} />
        <Input label={t('settings.guardianPhone')} type="tel" value={f.guardianPhone || ''} onChange={set('guardianPhone')} />
        <Input label={t('settings.dob')} type="date" value={f.dateOfBirth || ''} onChange={set('dateOfBirth')} />
      </>}
      <div className="sm:col-span-2"><Button type="submit" loading={saving}>{t('common.saveChanges')}</Button></div>
    </form>
  );
}

function PasswordForm() {
  const { t } = useTranslation();
  const [f, setF] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);
  const save = async (e) => {
    e.preventDefault();
    if (!passwordOk(f.newPassword)) return setErr(t('validation.password'));
    if (f.newPassword !== f.confirm) return setErr(t('validation.passwordMatch'));
    setErr('');
    setSaving(true);
    try {
      await api.put('/me/password', { currentPassword: f.currentPassword, newPassword: f.newPassword });
      toast.success(t('settings.passwordChanged'));
      setF({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (e2) { setErr(errorMessage(e2)); } finally { setSaving(false); }
    return undefined;
  };
  return (
    <form onSubmit={save} className="grid max-w-md gap-4">
      {err && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700" role="alert">{err}</p>}
      <Input label={t('settings.currentPassword')} type="password" autoComplete="current-password" value={f.currentPassword} onChange={(e) => setF({ ...f, currentPassword: e.target.value })} />
      <Input label={t('auth.newPassword')} type="password" autoComplete="new-password" hint={t('validation.passwordHint')} value={f.newPassword} onChange={(e) => setF({ ...f, newPassword: e.target.value })} />
      <Input label={t('auth.confirmPassword')} type="password" autoComplete="new-password" value={f.confirm} onChange={(e) => setF({ ...f, confirm: e.target.value })} />
      <div><Button type="submit" loading={saving} disabled={!f.currentPassword}>{t('settings.changePassword')}</Button></div>
    </form>
  );
}

function EmailPreference() {
  const { t } = useTranslation();
  const { user, setUser } = useAuth();
  const [saving, setSaving] = useState(false);
  const change = async (v) => {
    setSaving(true);
    try { const { data } = await api.put('/me/preferences', { emailNotifications: v }); setUser(data); toast.success(t('common.saved')); }
    catch (e) { toast.error(errorMessage(e)); } finally { setSaving(false); }
  };
  return (
    <div className={saving ? 'pointer-events-none opacity-60' : ''}>
      <Toggle checked={user.emailNotifications !== false} onChange={change} label={t('settings.emailUpdates')} description={t('settings.emailUpdatesHint')} />
    </div>
  );
}

export default function SettingsPage() {
  const { t, i18n } = useTranslation();
  const { changeLanguage } = useAuth();
  const q = useQuery({ queryKey: ['me'], queryFn: () => api.get('/me').then((r) => r.data) });
  return (
    <>
      <PageHeader title={t('nav.settings')} />
      <div className="grid gap-6">
        <Panel title={t('settings.profile')}><QueryView query={q}>{(d) => <ProfileForm data={d} />}</QueryView></Panel>
        <Panel title={t('settings.language')}>
          <p className="mb-4 text-sm text-slate-500">{t('settings.languageHint')}</p>
          <div className="grid gap-3 sm:grid-cols-3">
            {LANGUAGES.map((l) => (
              <button key={l.code} lang={l.code} onClick={() => changeLanguage(l.code).then(() => toast.success(t('common.saved')))}
                className={clsx('rounded-2xl border-2 p-4 text-left transition', i18n.language === l.code ? 'border-violet-500 bg-violet-50' : 'border-slate-200 hover:border-slate-300')}>
                <span className="block text-lg font-semibold">{l.label}</span>
              </button>
            ))}
          </div>
        </Panel>
        <Panel title={t('settings.notifications')}><EmailPreference /></Panel>
        <Panel title={t('settings.security')}><PasswordForm /></Panel>
      </div>
    </>
  );
}
