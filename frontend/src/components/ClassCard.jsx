import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Users } from 'lucide-react';
import { fmtMoney } from '../lib/format';
import { StatusBadge } from './ui';

const MEDIUM_LABEL = { en: 'English', si: 'සිංහල', ta: 'தமிழ்' };

export function Price({ c }) {
  const { t } = useTranslation();
  if (c.billingType === 'FREE') return <span className="font-semibold text-emerald-700">{t('class.free')}</span>;
  return (
    <span className="font-semibold">
      {fmtMoney(c.fee, c.currency)}
      {c.billingType === 'MONTHLY' && <span className="text-sm font-normal text-slate-500"> {t('class.perMonth')}</span>}
    </span>
  );
}

export function Thumb({ c, className = 'aspect-[16/9]' }) {
  if (c.thumbnailUrl) {
    return (
      <div className={`${className} w-full overflow-hidden bg-slate-100`}>
        <img src={c.thumbnailUrl} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" loading="lazy" />
      </div>
    );
  }
  // A generated cover when there is no photo: each subject gets its own colour, so cards don't look identical.
  const letter = [...(c.subject || c.title || '?')][0];
  const palettes = [
    ['#2E0C61', '#7B2FF7'], ['#064E3B', '#10B981'], ['#0C4A6E', '#0EA5E9'], ['#7C2D12', '#F97316'],
    ['#831843', '#EC4899'], ['#1E3A8A', '#6366F1'], ['#713F12', '#EAB308'], ['#134E4A', '#14B8A6'],
  ];
  const key = (c.subject || c.title || '').toLowerCase();
  let h = 0;
  for (const ch of key) h = (h * 31 + ch.codePointAt(0)) % 997;
  const [dark, light] = palettes[h % palettes.length];
  return (
    <div className={`${className} relative grid w-full place-items-center overflow-hidden`} style={{ background: `linear-gradient(135deg, ${dark}, ${light})` }}>
      <span className="absolute -right-6 -top-8 h-32 w-32 rounded-full bg-white/10" aria-hidden="true" />
      <span className="absolute -bottom-10 -left-6 h-28 w-28 rounded-full bg-black/10" aria-hidden="true" />
      <span className="relative font-display text-6xl font-bold text-white drop-shadow-sm transition duration-500 group-hover:scale-110">{letter}</span>
      <span className="absolute bottom-3 left-4 rounded-full bg-black/25 px-2.5 py-0.5 text-xs font-medium text-white">{c.subject}</span>
    </div>
  );
}

export default function ClassCard({ c, to, showStatus, progress }) {
  const { t } = useTranslation();
  const pct = progress && progress.lessons > 0 ? Math.round((progress.completed / progress.lessons) * 100) : null;
  return (
    <Link to={to} className="card-lift group flex flex-col overflow-hidden rounded-panel border border-slate-200 bg-white hover:border-violet-300">
      <Thumb c={c} />
      <div className="flex flex-1 flex-col p-4">
        <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <span>{c.subject}</span>
          {c.gradeLevel && <><span aria-hidden="true">/</span><span>{c.gradeLevel}</span></>}
          <span className="rounded bg-slate-100 px-1.5 py-0.5" lang={c.medium}>{MEDIUM_LABEL[c.medium]}</span>
          {showStatus && <StatusBadge status={c.status} />}
        </div>
        <h3 className="line-clamp-2 text-[17px] font-semibold leading-snug group-hover:text-violet-700">{c.title}</h3>
        <p className="mt-1 text-sm text-slate-500">{c.teacherName}</p>
        {pct != null && (
          <div className="mt-3">
            <div className="mb-1 flex justify-between text-xs text-slate-500"><span>{t('dashboard.lessonsDone', { done: progress.completed, total: progress.lessons })}</span><span className="font-semibold text-violet-700">{pct}%</span></div>
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-violet-500" style={{ width: `${pct}%` }} /></div>
          </div>
        )}
        <div className="mt-auto flex items-center justify-between pt-4 text-sm">
          <Price c={c} />
          <span className="flex items-center gap-1 text-slate-500"><Users className="h-4 w-4" />{t('class.studentCount', { count: c.studentCount })}</span>
        </div>
      </div>
    </Link>
  );
}
