import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '../api/client';
import { loadYouTubeApi } from '../lib/youtube';
import { PageLoader, ErrorState } from './ui';

/** Sends watch progress at most every 15 s (and on pause/end). */
function useProgressReporter(lesson, enabled, onCompleted) {
  const last = useRef(0);
  return (position, duration, force) => {
    if (!enabled || !duration) return;
    const now = Date.now();
    if (!force && now - last.current < 15000) return;
    last.current = now;
    api.post(`/lessons/${lesson.id}/progress`, { positionSeconds: Math.floor(position), durationSeconds: Math.floor(duration) })
      .then((r) => { if (r.data.completed) onCompleted?.(); }).catch(() => {});
  };
}

function UploadedVideo({ lesson, url, report }) {
  const ref = useRef(null);
  useEffect(() => () => { const v = ref.current; if (v) report(v.currentTime, v.duration, true); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <video ref={ref} src={url} controls playsInline preload="metadata" controlsList="nodownload"
      className="aspect-video w-full rounded-2xl bg-black" onContextMenu={(e) => e.preventDefault()}
      onLoadedMetadata={() => { const v = ref.current; if (v && lesson.lastPositionSeconds && lesson.lastPositionSeconds < v.duration - 5) v.currentTime = lesson.lastPositionSeconds; }}
      onTimeUpdate={() => { const v = ref.current; if (v) report(v.currentTime, v.duration, false); }}
      onPause={() => { const v = ref.current; if (v) report(v.currentTime, v.duration, true); }}
      onEnded={() => { const v = ref.current; if (v) report(v.duration, v.duration, true); }} />
  );
}

/** Unlisted YouTube video in the privacy-enhanced player, with the same progress tracking. */
function YouTubeVideo({ lesson, videoId, report }) {
  const { t } = useTranslation();
  const holder = useRef(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let player;
    let timer;
    let cancelled = false;
    const send = (force) => {
      try { if (player?.getDuration) report(player.getCurrentTime(), player.getDuration(), force); } catch { /* player gone */ }
    };
    loadYouTubeApi().then((YT) => {
      if (cancelled || !holder.current) return;
      const el = document.createElement('div');
      holder.current.innerHTML = '';
      holder.current.appendChild(el);
      player = new YT.Player(el, {
        host: 'https://www.youtube-nocookie.com',
        videoId,
        width: '100%',
        height: '100%',
        playerVars: { rel: 0, modestbranding: 1, playsinline: 1, start: Math.max(0, Math.floor(lesson.lastPositionSeconds || 0)) },
        events: {
          onStateChange: (e) => {
            clearInterval(timer);
            if (e.data === YT.PlayerState.PLAYING) timer = setInterval(() => send(false), 5000);
            if (e.data === YT.PlayerState.PAUSED) send(true);
            if (e.data === YT.PlayerState.ENDED) { try { report(player.getDuration(), player.getDuration(), true); } catch { /* ignore */ } }
          },
          onError: () => setFailed(true),
        },
      });
    }).catch(() => setFailed(true));
    return () => { cancelled = true; clearInterval(timer); send(true); try { player?.destroy(); } catch { /* ignore */ } };
  }, [videoId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (failed) {
    return (
      <div className="grid aspect-video w-full place-items-center rounded-2xl bg-ink p-6 text-center text-white">
        <div><p className="font-semibold">{t('lessons.youtubeFailed')}</p>
          <a className="mt-3 inline-block text-sm text-violet-300 underline" href={`https://youtu.be/${videoId}`} target="_blank" rel="noopener noreferrer">{t('lessons.openOnYoutube')}</a></div>
      </div>
    );
  }
  return <div ref={holder} className="aspect-video w-full overflow-hidden rounded-2xl bg-black [&_iframe]:h-full [&_iframe]:w-full" />;
}

export default function VideoPlayer({ lesson, trackProgress, onCompleted }) {
  const report = useProgressReporter(lesson, trackProgress, onCompleted);
  const q = useQuery({ queryKey: ['lesson-stream', lesson.id], queryFn: () => api.get(`/lessons/${lesson.id}/stream`).then((r) => r.data), staleTime: 60 * 60 * 1000 });
  if (q.isLoading) return <div className="aspect-video rounded-2xl bg-ink"><PageLoader /></div>;
  if (q.isError) return <ErrorState onRetry={() => q.refetch()} />;
  if (q.data.type === 'YOUTUBE') return <YouTubeVideo lesson={lesson} videoId={q.data.youtubeId} report={report} />;
  return <UploadedVideo lesson={lesson} url={q.data.url} report={report} />;
}
