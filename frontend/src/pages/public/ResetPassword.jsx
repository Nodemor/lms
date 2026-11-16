import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import api, { errorMessage } from '../../api/client';
import { Button, Input } from '../../components/ui';
import AuthShell from './AuthShell';
import { passwordOk } from './Register';

export default function ResetPassword() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const nav = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const token = params.get('token') || '';
  const submit = async (e) => {
    e.preventDefault();
    if (!passwordOk(password)) { setError(t('validation.password')); return; }
    if (password !== confirm) { setError(t('validation.passwordMatch')); return; }
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/reset-password', { token, password });
      toast.success(t('auth.passwordReset'));
      nav('/login', { replace: true });
    } catch (err) { setError(errorMessage(err)); } finally { setLoading(false); }
  };
  if (!token) {
    return <AuthShell title={t('auth.resetTitle')}><p className="text-sm text-slate-600">{t('errors.reset_link_invalid')}</p><Link to="/forgot-password" className="btn-primary mt-4 w-full">{t('auth.sendResetLink')}</Link></AuthShell>;
  }
  return (
    <AuthShell title={t('auth.resetTitle')} subtitle={t('validation.passwordHint')}>
      <form onSubmit={submit} className="space-y-4">
        {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}
        <Input label={t('auth.newPassword')} type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <Input label={t('auth.confirmPassword')} type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        <Button type="submit" className="h-11 w-full" loading={loading}>{t('auth.savePassword')}</Button>
      </form>
    </AuthShell>
  );
}
