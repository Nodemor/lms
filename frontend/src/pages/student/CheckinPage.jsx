import { useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, ScanLine, XCircle } from 'lucide-react';
import api, { errorMessage } from '../../api/client';
import Brand from '../../components/layout/Brand';
import { Spinner } from '../../components/ui';
import { fmtTime } from '../../lib/format';

/** Students land here after scanning the check-in QR with their phone camera. */
export default function CheckinPage() {
  const { sessionId } = useParams();
  const [params] = useSearchParams();
  const { t } = useTranslation();
  const [state, setState] = useState({ status: 'loading' });
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    api.post(`/student/sessions/${sessionId}/checkin`, { token: params.get('t') || '' })
      .then((r) => setState({ status: 'ok', data: r.data }))
      .catch((e) => setState({ status: 'error', message: errorMessage(e), expired: e.response?.data?.code === 'error.checkin_expired' }));
  }, [sessionId, params]);

  return (
    <div className="flex min-h-[100dvh] flex-col bg-mist">
      <header className="bg-ink px-5 py-4"><Brand dark to="/student" /></header>
      <main className="grid flex-1 place-items-center px-5 py-10">
        <div className="w-full max-w-sm rounded-panel bg-white p-7 text-center shadow-panel">
          {state.status === 'loading' && <div className="flex items-center justify-center gap-3 py-10 text-violet-700"><Spinner />{t('checkin.checking')}</div>}
          {state.status === 'ok' && (
            <>
              <span className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-emerald-100"><CheckCircle2 className="h-12 w-12 text-emerald-600" /></span>
              <h1 className="mt-5 text-2xl font-bold">{state.data.alreadyCheckedIn ? t('checkin.already') : t('checkin.success')}</h1>
              <p className="mt-1 text-slate-500">{t('checkin.at', { time: fmtTime(state.data.checkedInAt) })}</p>
              <div className="mt-5 rounded-2xl bg-mist p-4 text-left">
                <p className="text-xs text-slate-500">{state.data.classTitle}</p>
                <p className="font-semibold">{state.data.sessionTitle}</p>
                <p className="mt-1 text-sm text-slate-600">{t('classQr.mentor')}: {state.data.teacherName}</p>
              </div>
              <Link to={`/student/classes/${state.data.classId}`} className="btn-primary mt-6 h-11 w-full">{t('checkin.openClass')}</Link>
            </>
          )}
          {state.status === 'error' && (
            <>
              <span className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-red-100">{state.expired ? <ScanLine className="h-11 w-11 text-red-600" /> : <XCircle className="h-12 w-12 text-red-600" />}</span>
              <h1 className="mt-5 text-xl font-bold">{t('checkin.failed')}</h1>
              <p className="mt-2 text-slate-600">{state.message}</p>
              <Link to="/student" className="btn-outline mt-6 h-11 w-full">{t('nav.dashboard')}</Link>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
