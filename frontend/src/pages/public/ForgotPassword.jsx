import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MailCheck } from 'lucide-react';
import api, { errorMessage } from '../../api/client';
import { Button, Input } from '../../components/ui';
import AuthShell from './AuthShell';

export default function ForgotPassword() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try { await api.post('/auth/forgot-password', { email: email.trim() }); setSent(true); }
    catch (err) { setError(errorMessage(err)); }
    finally { setLoading(false); }
  };
  return (
    <AuthShell title={t('auth.forgotTitle')} subtitle={sent ? null : t('auth.forgotSubtitle')}
      footer={<Link to="/login" className="font-semibold text-violet-700">{t('auth.backToSignIn')}</Link>}>
      {sent ? (
        <div className="text-center">
          <MailCheck className="mx-auto h-10 w-10 text-violet-600" />
          <p className="mt-3 text-sm text-slate-600">{t('auth.resetSent', { email })}</p>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}
          <Input label={t('auth.email')} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Button type="submit" className="h-11 w-full" loading={loading} disabled={!email}>{t('auth.sendResetLink')}</Button>
        </form>
      )}
    </AuthShell>
  );
}
