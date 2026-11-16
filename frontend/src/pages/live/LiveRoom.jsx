import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Track } from 'livekit-client';
import {
  CarouselLayout, ConnectionStateToast, DisconnectButton, FocusLayout, GridLayout, LiveKitRoom, ParticipantTile,
  RoomAudioRenderer, TrackToggle, useChat, useParticipants, useTracks,
} from '@livekit/components-react';
import '@livekit/components-styles';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { MessageSquare, PhoneOff, Send, Square, Users, X } from 'lucide-react';
import api, { errorMessage } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { fmtTime } from '../../lib/format';
import { PROVIDER_LABEL } from '../../lib/meetings';
import { Button, ConfirmDialog, Spinner } from '../../components/ui';
import LanguageSwitcher from '../../components/layout/LanguageSwitcher';

function Stage() {
  const tracks = useTracks([{ source: Track.Source.Camera, withPlaceholder: true }, { source: Track.Source.ScreenShare, withPlaceholder: false }], { onlySubscribed: false });
  const screen = tracks.find((t) => t.source === Track.Source.ScreenShare && t.publication);
  if (screen) {
    const others = tracks.filter((t) => t !== screen);
    return (
      <div className="flex h-full flex-col gap-2 lg:flex-row">
        <div className="min-h-0 flex-1"><FocusLayout trackRef={screen} /></div>
        <div className="h-32 lg:h-full lg:w-64"><CarouselLayout tracks={others}><ParticipantTile /></CarouselLayout></div>
      </div>
    );
  }
  return <GridLayout tracks={tracks} style={{ height: '100%' }}><ParticipantTile /></GridLayout>;
}

function Chat({ onClose }) {
  const { t } = useTranslation();
  const { chatMessages, send, isSending } = useChat();
  const [text, setText] = useState('');
  const end = useRef(null);
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages.length]);
  const submit = async (e) => {
    e.preventDefault();
    const msg = text.trim();
    if (!msg) return;
    setText('');
    try { await send(msg); } catch { toast.error(t('errors.network')); }
  };
  return (
    <aside className="flex h-full w-full flex-col bg-white text-slate-900 sm:w-80">
      <header className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <span className="font-semibold">{t('live.chat')}</span>
        <button onClick={onClose} className="btn-ghost h-8 w-8 p-0" aria-label={t('common.close')}><X className="h-4 w-4" /></button>
      </header>
      <ul className="flex-1 space-y-3 overflow-y-auto p-4">
        {chatMessages.length === 0 && <li className="text-center text-sm text-slate-500">{t('live.chatEmpty')}</li>}
        {chatMessages.map((m) => (
          <li key={m.id || m.timestamp} className="text-sm">
            <span className="font-semibold">{m.from?.name || m.from?.identity}</span> <span className="text-xs text-slate-400">{fmtTime(m.timestamp)}</span>
            <p className="whitespace-pre-wrap break-words text-slate-700">{m.message}</p>
          </li>
        ))}
        <li ref={end} />
      </ul>
      <form onSubmit={submit} className="flex gap-2 border-t border-slate-100 p-3">
        <input className="input h-10" value={text} onChange={(e) => setText(e.target.value)} placeholder={t('live.chatPlaceholder')} maxLength={1000} aria-label={t('live.chatPlaceholder')} />
        <Button type="submit" className="h-10 w-10 p-0" disabled={isSending || !text.trim()} aria-label={t('live.send')}><Send className="h-4 w-4" /></Button>
      </form>
    </aside>
  );
}

function ParticipantCount() {
  const participants = useParticipants();
  return <span className="flex items-center gap-1.5 text-sm text-white/70"><Users className="h-4 w-4" />{participants.length}</span>;
}

function Room({ info, onLeave }) {
  const { t } = useTranslation();
  const [chat, setChat] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [ending, setEnding] = useState(false);
  const endForAll = async () => {
    setEnding(true);
    try { await api.post(`/teacher/sessions/${info.session.id}/end`); toast.success(t('live.ended')); onLeave(); }
    catch (e) { toast.error(errorMessage(e)); } finally { setEnding(false); }
  };
  const ctl = 'lk-button';
  return (
    <div className="flex h-[100dvh] flex-col bg-ink text-white" data-lk-theme="default">
      <header className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="live-dot h-2.5 w-2.5 shrink-0 rounded-full bg-live" />
          <div className="min-w-0"><p className="truncate font-semibold">{info.session.title}</p><p className="truncate text-xs text-white/60">{info.classTitle}</p></div>
        </div>
        <div className="flex items-center gap-3"><ParticipantCount /><div className="hidden sm:block"><LanguageSwitcher dark /></div></div>
      </header>
      <div className="flex min-h-0 flex-1">
        <div className="min-w-0 flex-1 p-2"><Stage /></div>
        {chat && <div className="absolute inset-0 z-30 sm:static"><Chat onClose={() => setChat(false)} /></div>}
      </div>
      <footer className="flex flex-wrap items-center justify-center gap-2 px-3 py-3 lk-control-bar" style={{ borderTop: '1px solid rgba(255,255,255,.08)' }}>
        <TrackToggle source={Track.Source.Microphone} className={ctl}>{t('live.mic')}</TrackToggle>
        <TrackToggle source={Track.Source.Camera} className={ctl}>{t('live.camera')}</TrackToggle>
        {info.teacher && <TrackToggle source={Track.Source.ScreenShare} captureOptions={{ audio: true, selfBrowserSurface: 'include' }} className={ctl}>{t('live.share')}</TrackToggle>}
        <button className={clsx(ctl, chat && 'lk-button-active')} onClick={() => setChat((v) => !v)} aria-pressed={chat}><MessageSquare className="h-4 w-4" />{t('live.chat')}</button>
        <DisconnectButton className={ctl} onClick={onLeave}><PhoneOff className="h-4 w-4" />{t('live.leave')}</DisconnectButton>
        {info.teacher && <button className="lk-button lk-disconnect-button" onClick={() => setConfirmEnd(true)}><Square className="h-4 w-4" />{t('live.endForAll')}</button>}
      </footer>
      <RoomAudioRenderer />
      <ConnectionStateToast />
      <ConfirmDialog open={confirmEnd} danger title={t('live.endForAll')} text={t('live.endConfirm')} confirmLabel={t('live.endForAll')}
        loading={ending} onConfirm={endForAll} onClose={() => setConfirmEnd(false)} />
    </div>
  );
}

/** Zoom / Meet / Teams: students are redirected; the teacher gets a small control page. */
function ExternalMeeting({ info, onBack }) {
  const { t } = useTranslation();
  const [ending, setEnding] = useState(false);
  const label = PROVIDER_LABEL[info.meetingProvider] || t('live.meetingLink');
  useEffect(() => {
    if (!info.teacher) window.location.replace(info.meetingUrl);
  }, [info]);
  const endForAll = async () => {
    setEnding(true);
    try { await api.post(`/teacher/sessions/${info.session.id}/end`); toast.success(t('live.ended')); onBack(); }
    catch (e) { toast.error(errorMessage(e)); } finally { setEnding(false); }
  };
  return (
    <div className="grid min-h-[100dvh] place-items-center bg-ink px-6 text-center text-white">
      <div className="w-full max-w-md">
        <span className="live-dot mx-auto mb-6 block h-3 w-3 rounded-full bg-live" />
        <p className="text-sm text-white/60">{info.classTitle}</p>
        <h1 className="mt-1 text-2xl font-bold">{info.session.title}</h1>
        {info.teacher ? (
          <>
            <p className="mt-3 text-white/70">{t('live.teacherExternalText', { provider: label })}</p>
            <div className="mt-6 grid gap-2">
              <a href={info.meetingUrl} target="_blank" rel="noopener noreferrer" className="btn-primary h-12 text-base">{t('live.openProvider', { provider: label })}</a>
              <Button variant="outline" className="border-white/30 bg-transparent text-white hover:text-white" onClick={() => navigator.clipboard.writeText(info.meetingUrl).then(() => toast.success(t('live.linkCopied')))}>{t('live.copyLink')}</Button>
              <Button variant="danger" loading={ending} onClick={endForAll}>{t('live.markEnded')}</Button>
              <button className="mt-2 text-sm text-white/60 hover:text-white" onClick={onBack}>{t('common.back')}</button>
            </div>
          </>
        ) : (
          <>
            <div className="mt-6 flex items-center justify-center gap-3 text-white/80"><Spinner />{t('live.redirecting', { provider: label })}</div>
            <a href={info.meetingUrl} rel="noopener noreferrer" className="btn-primary mt-6 h-12 w-full text-base">{t('live.openProvider', { provider: label })}</a>
            <p className="mt-3 text-xs text-white/50">{t('live.redirectHint', { provider: label })}</p>
          </>
        )}
      </div>
    </div>
  );
}

export default function LiveRoom() {
  const { sessionId } = useParams();
  const { t } = useTranslation();
  const { user } = useAuth();
  const nav = useNavigate();
  const join = useQuery({ queryKey: ['join', sessionId], queryFn: () => api.post(`/sessions/${sessionId}/join`).then((r) => r.data), retry: false, staleTime: Infinity, gcTime: 0 });
  const back = () => nav(user.role === 'TEACHER' ? `/teacher/classes/${join.data?.session?.classId || ''}?tab=live` : `/student/classes/${join.data?.session?.classId || ''}?tab=live`);

  if (join.isLoading) return <div className="grid h-[100dvh] place-items-center bg-ink text-white"><div className="flex items-center gap-3"><Spinner />{t('live.connecting')}</div></div>;
  if (join.isError) {
    return (
      <div className="grid h-[100dvh] place-items-center bg-ink px-6 text-center text-white">
        <div className="max-w-md">
          <p className="text-lg font-semibold">{errorMessage(join.error)}</p>
          <div className="mt-6 flex justify-center gap-2">
            <Button onClick={() => join.refetch()}>{t('common.retry')}</Button>
            <Button variant="outline" onClick={() => nav(-1)}>{t('common.back')}</Button>
          </div>
        </div>
      </div>
    );
  }
  const info = join.data;
  if (info.external) return <ExternalMeeting info={info} onBack={back} />;
  return (
    <LiveKitRoom serverUrl={info.serverUrl} token={info.token} connect audio={info.teacher} video={info.teacher}
      onDisconnected={back} onError={(e) => toast.error(e?.message || t('errors.network'))}
      options={{ adaptiveStream: true, dynacast: true }}>
      <Room info={info} onLeave={back} />
    </LiveKitRoom>
  );
}
