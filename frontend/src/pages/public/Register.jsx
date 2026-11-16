import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BookOpen, GraduationCap } from 'lucide-react';
import clsx from 'clsx';
import api, { errorMessage, fieldErrors } from '../../api/client';
import { Button, Input } from '../../components/ui';
import AuthShell from './AuthShell';

export const passwordOk = (p) => p.length >= 8 && /[A-Za-z]/.test(p) && /\d/.test(p);

export default function Register() {
  const { t, i18n } = useTranslation();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [role, setRole] = useState(params.get('role') === 'TEACHER' ? 'TEACHER' : 'STUDENT');
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', password: '' });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    const local = {};
    if (!form.fullName.trim()) local.fullName = t('validation.required');
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) local.email = t('validation.email');
    if (!passwordOk(form.password)) local.password = t('validation.password');
    setErrors(local);
    if (Object.keys(local).length) return;
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/register', { ...form, email: form.email.trim(), role, language: i18n.language });
      const next = params.get('next');
      nav(`/verify-email?email=${encodeURIComponent(form.email.trim())}${next ? `&next=${encodeURIComponent(next)}` : ''}`);
    } catch (err) {
      const fe = fieldErrors(err);
      if (Object.keys(fe).length) setErrors(Object.fromEntries(Object.keys(fe).map((k) => [k, t('validation.checkField')])));
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const roles = [
    { id: 'STUDENT', icon: BookOpen, title: t('auth.iAmStudent'), text: t('auth.studentText') },
    { id: 'TEACHER', icon: GraduationCap, title: t('auth.iAmTeacher'), text: t('auth.teacherText') },
  ];

  return (
    <AuthShell title={t('auth.createAccount')} subtitle={t('auth.registerSubtitle')}
      footer={<>{t('auth.haveAccount')} <Link to="/login" className="font-semibold text-violet-700">{t('auth.signIn')}</Link></>}>
      <div className="mb-5 grid grid-cols-2 gap-2" role="radiogroup" aria-label={t('auth.accountType')}>
        {roles.map((r) => (
          <button key={r.id} type="button" role="radio" aria-checked={role === r.id} onClick={() => setRole(r.id)}
            className={clsx('rounded-2xl border-2 p-3 text-left transition', role === r.id ? 'border-violet-500 bg-violet-50' : 'border-slate-200 hover:border-slate-300')}>
            <r.icon className={clsx('h-5 w-5', role === r.id ? 'text-violet-600' : 'text-slate-400')} />
            <span className="mt-2 block text-sm font-semibold">{r.title}</span>
            <span className="block text-xs text-slate-500">{r.text}</span>
          </button>
        ))}
      </div>
      <form onSubmit={submit} className="space-y-4" noValidate>
        {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}
        <Input label={t('auth.fullName')} autoComplete="name" value={form.fullName} onChange={set('fullName')} error={errors.fullName} />
        <Input label={t('auth.email')} type="email" autoComplete="email" value={form.email} onChange={set('email')} error={errors.email} />
        <Input label={t('auth.phoneOptional')} type="tel" autoComplete="tel" value={form.phone} onChange={set('phone')} />
        <Input label={t('auth.password')} type="password" autoComplete="new-password" value={form.password} onChange={set('password')}
          error={errors.password} hint={t('validation.passwordHint')} />
        <Button type="submit" className="h-11 w-full" loading={loading}>{t('auth.createAccount')}</Button>
      </form>
    </AuthShell>
  );
}
