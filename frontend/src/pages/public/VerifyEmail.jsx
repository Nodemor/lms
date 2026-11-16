import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import api, { errorMessage } from '../../api/client';
import { useAuth, homePathFor } from '../../context/AuthContext';
import { Button, Input } from '../../components/ui';
import AuthShell from './AuthShell';

export default function VerifyEmail() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const { verifyEmail } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState(params.get('email') || '');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const sentOnce = useRef(false);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  const resend = async (silent) => {
    if (!email) return;
    try {
      await api.post('/auth/resend-verification', { email });
      if (!silent) toast.success(t('auth.codeSent'));
      setCooldown(60);
    } catch (e) {
      if (!silent) toast.error(errorMessage(e));
    }
  };

  useEffect(() => {
    if (params.get('resend') === '1' && !sentOnce.current) { sentOnce.current = true; resend(true); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await verifyEmail(email.trim(), code.trim());
      toast.success(t('auth.verified'));
      const next = params.get('next');
      nav(next && next.startsWith('/') && !next.startsWith('//') ? next : homePathFor(user), { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title={t('auth.verifyTitle')} subtitle={t('auth.verifySubtitle', { email: email || '…' })}>
      <form onSubmit={submit} className="space-y-4">
        {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}
        {!params.get('email') && <Input label={t('auth.email')} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />}
        <Input label={t('auth.code')} inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          className="[&_input]:text-center [&_input]:font-display [&_input]:text-2xl [&_input]:tracking-[0.5em]" />
        <Button type="submit" className="h-11 w-full" loading={loading} disabled={code.length !== 6 || !email}>{t('auth.verifyButton')}</Button>
      </form>
      <p className="mt-5 text-center text-sm text-slate-500">
        {t('auth.noCode')}{' '}
        <button className="font-semibold text-violet-700 disabled:text-slate-400" disabled={cooldown > 0} onClick={() => resend(false)}>
          {cooldown > 0 ? t('auth.resendIn', { seconds: cooldown }) : t('auth.resend')}
        </button>
      </p>
    </AuthShell>
  );
}
