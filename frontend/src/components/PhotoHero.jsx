import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Languages } from 'lucide-react';

/** A photo that hides itself if the file is missing (see public/images/README.md). */
function Photo({ src, className, alt = '' }) {
  const [ok, setOk] = useState(true);
  if (!ok) return null;
  return <img src={src} alt={alt} className={className} onError={() => setOk(false)} loading="eager" />;
}

/** Home hero visual: real people, not mock screens. */
export default function PhotoHero() {
  const { t } = useTranslation();
  const [main, setMain] = useState(true);
  return (
    <div className="relative mx-auto w-full max-w-md pb-10 pl-10 sm:max-w-lg">
      <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-violet-700 to-slate-950 shadow-2xl shadow-violet-900/40">
        {main ? (
          <img src="/images/hero-teacher.jpg" alt={t('home.photoTeacherAlt')} onError={() => setMain(false)}
            className="aspect-[4/5] w-full object-cover" />
        ) : (
          <div className="grid aspect-[4/5] w-full place-items-center" aria-hidden="true">
            <span className="font-display text-[9rem] font-bold leading-none text-white/15">අ அ A</span>
          </div>
        )}
        {main && <span className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full bg-white/95 px-3 py-1.5 text-xs font-bold text-slate-900 shadow">
          <span className="live-dot h-2 w-2 rounded-full bg-live" />{t('live.liveNow')}
        </span>}
      </div>
      <Photo src="/images/hero-student.jpg" alt={t('home.photoStudentAlt')}
        className="absolute bottom-0 left-0 hidden aspect-square w-40 rounded-3xl border-[5px] border-ink object-cover shadow-xl sm:block" />
      <div className="absolute -right-3 bottom-16 flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-900 shadow-xl sm:-right-6">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-violet-100 text-violet-700"><Languages className="h-5 w-5" /></span>
        <span>{t('home.photoBadge')}</span>
      </div>
    </div>
  );
}
