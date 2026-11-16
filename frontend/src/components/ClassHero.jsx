import { useTranslation } from 'react-i18next';
import { CalendarClock, GraduationCap, Users } from 'lucide-react';
import { Price } from './ClassCard';
import { StatusBadge } from './ui';

const MEDIUM_LABEL = { en: 'English', si: 'සිංහල', ta: 'தமிழ்' };

/** Banner at the top of a class page: cover image, title and the facts people look for first. */
export default function ClassHero({ cls, showStatus, actions }) {
  const { t } = useTranslation();
  const letter = [...(cls.subject || cls.title || '?')][0];
  return (
    <section className="relative mb-5 overflow-hidden rounded-panel bg-ink text-white">
      {cls.thumbnailUrl
        ? <img src={cls.thumbnailUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-35" />
        : <span aria-hidden="true" className="absolute -right-4 -top-10 font-display text-[11rem] font-bold leading-none text-violet-500/25">{letter}</span>}
      <div className="absolute inset-0 bg-ink/40" aria-hidden="true" />
      <div className="relative flex flex-col gap-5 p-5 sm:p-7 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-sm text-white/75">
            <span>{cls.subject}</span>
            {cls.gradeLevel && <><span aria-hidden="true">/</span><span>{cls.gradeLevel}</span></>}
            <span className="rounded bg-white/15 px-1.5 py-0.5 text-xs" lang={cls.medium}>{MEDIUM_LABEL[cls.medium]}</span>
            {showStatus && <StatusBadge status={cls.status} />}
          </div>
          <h1 className="mt-2 text-2xl font-bold leading-tight sm:text-3xl">{cls.title}</h1>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-white/80">
            <span className="flex items-center gap-1.5"><GraduationCap className="h-4 w-4" />{cls.teacherName}</span>
            <span className="flex items-center gap-1.5"><Users className="h-4 w-4" />{t('class.studentCount', { count: cls.studentCount })}</span>
            {cls.scheduleText && <span className="flex items-center gap-1.5"><CalendarClock className="h-4 w-4" />{cls.scheduleText}</span>}
            <span className="[&_span]:text-white [&_.text-emerald-700]:text-emerald-300"><Price c={cls} /></span>
          </div>
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </section>
  );
}
