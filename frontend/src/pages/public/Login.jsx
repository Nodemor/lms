import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff } from 'lucide-react';
import { errorMessage } from '../../api/client';
import { useAuth, homePathFor } from '../../context/AuthContext';
import { Button, Input } from '../../components/ui';
import AuthShell from './AuthShell';

export default function Login() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [form, setForm] = useState({ email: '', password: '' });
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(form.email.trim(), form.password);
      const next = params.get('next');
      nav(next && next.startsWith('/') && !next.startsWith('//') ? next : homePathFor(user), { replace: true });
    } catch (err) {
      if (err.response?.data?.code === 'error.email_not_verified') {
        nav(`/verify-email?email=${encodeURIComponent(form.email.trim())}&resend=1`);
        return;
      }
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title={t('auth.welcomeBack')} subtitle={t('auth.signInSubtitle')}
      footer={<>{t('auth.noAccount')} <Link to="/register" className="font-semibold text-violet-700">{t('auth.createAccount')}</Link></>}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}
        <Input label={t('auth.email')} type="email" autoComplete="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <div className="relative">
          <Input label={t('auth.password')} type={show ? 'text' : 'password'} autoComplete="current-password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <button type="button" className="absolute right-2 top-[34px] grid h-8 w-8 place-items-center text-slate-500" onClick={() => setShow((v) => !v)} aria-label={show ? t('auth.hidePassword') : t('auth.showPassword')}>
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <div className="text-right"><Link to="/forgot-password" className="text-sm font-medium text-violet-700">{t('auth.forgot')}</Link></div>
        <Button type="submit" className="h-11 w-full" loading={loading} disabled={!form.email || !form.password}>{t('auth.signIn')}</Button>
      </form>
    </AuthShell>
  );
}
