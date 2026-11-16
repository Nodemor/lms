import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Maximize, Users, X } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { errorMessage } from '../../api/client';
import QrCode from '../../components/QrCode';
import Brand from '../../components/layout/Brand';
import LanguageSwitcher from '../../components/layout/LanguageSwitcher';
import { Button, ConfirmDialog, PageLoader } from '../../components/ui';
import { fmtTime } from '../../lib/format';

/**
 * Full-screen check-in display for in-person classes (projector, TV or a tablet at the door).
 * The QR code changes every 30 seconds, so a photo of it sent to someone at home stops working.
 */
export default function CheckinScreen() {
  const { sessionId } = useParams();
  const { t } = useTranslation();
  const nav = useNavigate();
  const [token, setToken] = useState(null);
  const [left, setLeft] = useState(30);
  const [error, setError] = useState(null);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [ending, setEnding] = useState(false);

  const fetchToken = useCallback(async () => {
    try {
      const { data } = await api.get(`/teacher/sessions/${sessionId}/checkin-token`);
      setToken(data.token);
      setLeft(data.refreshInSeconds);
      setError(null);
    } catch (e) { setError(errorMessage(e)); }
  }, [sessionId]);

  useEffect(() => { fetchToken(); }, [fetchToken]);
  useEffect(() => {
    const id = setInterval(() => setLeft((s) => {
      if (s <= 1) { fetchToken(); return 30; }
      return s - 1;
    }), 1000);
    return () => clearInterval(id);
  }, [fetchToken]);

  const info = useQuery({ queryKey: ['session-attendance', sessionId], queryFn: () => api.get(`/teacher/sessions/${sessionId}/attendance`).then((r) => r.data), refetchInterval: 4000 });
  const present = (info.data?.students || []).filter((s) => s.present).sort((a, b) => String(b.firstJoinedAt).localeCompare(String(a.firstJoinedAt)));
  const total = info.data?.students?.length || 0;
  const url = token ? `${window.location.origin}/checkin/${sessionId}?t=${token}` : '';
  const back = () => nav(info.data?.classId ? `/teacher/classes/${info.data.classId}?tab=live` : '/teacher');

  const endClass = async () => {
    setEnding(true);
    try { await api.post(`/teacher/sessions/${sessionId}/end`); toast.success(t('live.ended')); back(); }
    catch (e) { toast.error(errorMessage(e)); } finally { setEnding(false); setConfirmEnd(false); }
  };

  if (info.isLoading) return <div className="grid min-h-[100dvh] place-items-center bg-ink"><PageLoader /></div>;
  return (
    <div className="flex min-h-[100dvh] flex-col bg-ink text-white">
      <header className="flex items-center justify-between gap-3 px-5 py-4">
        <Brand dark to="/teacher" />
        <div className="flex items-center gap-2">
          <LanguageSwitcher dark />
          <button className="btn h-10 w-10 p-0 text-white/80 hover:bg-white/10" onClick={() => document.documentElement.requestFullscreen?.()} aria-label={t('checkin.fullscreen')}><Maximize className="h-5 w-5" /></button>
          <button className="btn h-10 w-10 p-0 text-white/80 hover:bg-white/10" onClick={back} aria-label={t('common.close')}><X className="h-5 w-5" /></button>
        </div>
      </header>
      <main className="grid flex-1 items-center gap-8 px-5 pb-8 lg:grid-cols-[1fr_380px] lg:px-12">
        <div className="text-center">
          <p className="text-sm text-white/60">{info.data?.classTitle}</p>
          <h1 className="mt-1 text-3xl font-bold sm:text-4xl">{info.data?.title}</h1>
          <p className="mt-2 text-lg text-violet-300">{t('checkin.scanToCheckIn')}</p>
          <div className="mx-auto mt-6 w-fit rounded-[28px] bg-white p-4 shadow-2xl shadow-violet-900/40">
            {error ? <div className="grid h-[320px] w-[320px] place-items-center p-6 text-center text-slate-800">{error}</div>
              : url ? <QrCode value={url} size={320} alt={t('checkin.scanToCheckIn')} /> : <div className="h-[320px] w-[320px]" />}
          </div>
          <div className="mx-auto mt-5 max-w-xs">
            <div className="h-1.5 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-violet-400 transition-all duration-1000" style={{ width: `${(left / 30) * 100}%` }} /></div>
            <p className="mt-2 text-xs text-white/50">{t('checkin.refreshIn', { seconds: left })}</p>
          </div>
        </div>
        <aside className="rounded-panel border border-white/10 bg-white/5 p-5">
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-2 font-semibold"><Users className="h-5 w-5 text-violet-300" />{t('checkin.checkedIn')}</p>
            <p className="font-display text-3xl font-bold">{present.length}<span className="text-lg text-white/40">/{total}</span></p>
          </div>
          <ul className="mt-4 max-h-[50vh] space-y-2 overflow-y-auto">
            {present.length === 0 && <li className="text-sm text-white/50">{t('checkin.nobodyYet')}</li>}
            {present.map((s) => (
              <li key={s.studentId} className="flex items-center justify-between gap-3 rounded-xl bg-white/5 px-3 py-2 text-sm">
                <span className="flex min-w-0 items-center gap-2"><CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" /><span className="truncate">{s.name}</span></span>
                <span className="text-xs text-white/50">{fmtTime(s.firstJoinedAt)}</span>
              </li>
            ))}
          </ul>
          <Button variant="danger" className="mt-5 w-full" onClick={() => setConfirmEnd(true)}>{t('live.markEnded')}</Button>
        </aside>
      </main>
      <ConfirmDialog open={confirmEnd} title={t('live.markEnded')} text={t('checkin.endConfirm')} confirmLabel={t('live.markEnded')} loading={ending}
        onConfirm={endClass} onClose={() => setConfirmEnd(false)} />
    </div>
  );
}
