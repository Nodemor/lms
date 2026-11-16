import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight, Atom, BookOpenCheck, Calculator, CreditCard, FileText, FlaskConical, Globe2, Languages, Laptop, Leaf,
  Radio, ShieldCheck, Smartphone, Sparkles, Video,
} from 'lucide-react';
import api from '../../api/client';
import ClassCard from '../../components/ClassCard';
import PhotoHero from '../../components/PhotoHero';

/** The hero line in all three scripts is the identity of the product: one classroom, three languages. */
const HERO_LINES = {
  en: 'Teach your class online.',
  si: 'ඔබේ පන්තිය මාර්ගගතව උගන්වන්න.',
  ta: 'உங்கள் வகுப்பை இணையத்தில் கற்பியுங்கள்.',
};

const SUBJECTS = [
  { key: 'maths', q: 'Maths', icon: Calculator, tone: 'bg-violet-100 text-violet-700' },
  { key: 'science', q: 'Science', icon: FlaskConical, tone: 'bg-emerald-100 text-emerald-700' },
  { key: 'ict', q: 'ICT', icon: Laptop, tone: 'bg-sky-100 text-sky-700' },
  { key: 'english', q: 'English', icon: Languages, tone: 'bg-amber-100 text-amber-700' },
  { key: 'physics', q: 'Physics', icon: Atom, tone: 'bg-rose-100 text-rose-700' },
  { key: 'biology', q: 'Biology', icon: Leaf, tone: 'bg-lime-100 text-lime-700' },
  { key: 'commerce', q: 'Commerce', icon: CreditCard, tone: 'bg-orange-100 text-orange-700' },
  { key: 'languages', q: 'Sinhala', icon: Globe2, tone: 'bg-fuchsia-100 text-fuchsia-700' },
];

export default function Home() {
  const { t, i18n } = useTranslation();
  const latest = useQuery({ queryKey: ['public-classes', 'home'], queryFn: () => api.get('/public/classes', { params: { size: 6 } }).then((r) => r.data) });
  const others = Object.keys(HERO_LINES).filter((l) => l !== i18n.language);
  const features = [
    { icon: Radio, title: t('home.f1Title'), text: t('home.f1Text'), tone: 'bg-red-50 text-live' },
    { icon: Video, title: t('home.f2Title'), text: t('home.f2Text'), tone: 'bg-violet-50 text-violet-600' },
    { icon: FileText, title: t('home.f3Title'), text: t('home.f3Text'), tone: 'bg-sky-50 text-sky-600' },
    { icon: BookOpenCheck, title: t('home.f4Title'), text: t('home.f4Text'), tone: 'bg-amber-50 text-amber-600' },
    { icon: CreditCard, title: t('home.f5Title'), text: t('home.f5Text'), tone: 'bg-emerald-50 text-emerald-600' },
    { icon: ShieldCheck, title: t('home.f6Title'), text: t('home.f6Text'), tone: 'bg-slate-100 text-slate-700' },
  ];
  const stats = [
    { icon: Languages, label: t('home.statLanguages') },
    { icon: Smartphone, label: t('home.statPhones') },
    { icon: Sparkles, label: t('home.statFree') },
  ];

  return (
    <>
      {/* ---------------- hero ---------------- */}
      <section className="relative overflow-hidden bg-ink text-white">
        <div className="grid-lines absolute inset-0 opacity-60" aria-hidden="true" />
        <div className="glow-soft absolute -left-40 -top-40 h-[480px] w-[480px]" aria-hidden="true" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-14 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:pb-24 lg:pt-20">
          <div className="animate-rise">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-white/80">
              <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />{t('home.badge')}
            </span>
            <h1 className="mt-5 text-[clamp(2.3rem,6vw,4.4rem)] font-bold leading-[1.05] tracking-tight" lang={i18n.language}>
              {HERO_LINES[i18n.language] || HERO_LINES.en}
            </h1>
            <div className="mt-4 space-y-1 border-l-2 border-violet-500 pl-4 text-base text-white/50 sm:text-lg">
              {others.map((l) => <p key={l} lang={l}>{HERO_LINES[l]}</p>)}
            </div>
            <p className="mt-6 max-w-xl text-lg text-white/75">{t('home.lead')}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/register?role=TEACHER" className="btn-primary h-12 px-6 text-base shadow-lg shadow-violet-500/30">{t('home.ctaTeacher')}<ArrowRight className="h-4 w-4" /></Link>
              <Link to="/classes" className="btn h-12 border border-white/25 px-6 text-base text-white hover:bg-white/10">{t('home.ctaStudent')}</Link>
            </div>
            <ul className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-sm text-white/70">
              {stats.map((s) => <li key={s.label} className="flex items-center gap-2"><s.icon className="h-4 w-4 text-violet-300" />{s.label}</li>)}
            </ul>
          </div>
          <PhotoHero />
        </div>
      </section>

      {/* ---------------- subjects ---------------- */}
      <section className="border-b border-slate-100 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <p className="text-sm font-semibold text-slate-500">{t('home.subjectsTitle')}</p>
          <div className="mt-4 flex flex-wrap gap-2.5">
            {SUBJECTS.map((s) => (
              <Link key={s.key} to={`/classes?q=${encodeURIComponent(s.q)}`}
                className="card-lift inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white py-1.5 pl-1.5 pr-4 text-sm font-semibold hover:border-violet-300">
                <span className={`grid h-8 w-8 place-items-center rounded-full ${s.tone}`}><s.icon className="h-4 w-4" /></span>
                {t(`home.subjects.${s.key}`)}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- features ---------------- */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-wider text-violet-600">{t('home.featuresKicker')}</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{t('home.featuresTitle')}</h2>
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="card-lift rounded-panel border border-slate-200 bg-white p-6">
              <span className={`grid h-12 w-12 place-items-center rounded-2xl ${f.tone}`}><f.icon className="h-6 w-6" /></span>
              <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
              <p className="mt-1.5 leading-relaxed text-slate-600">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------- steps ---------------- */}
      <section className="bg-mist">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{t('home.stepsTitle')}</h2>
          <ol className="relative mt-10 grid gap-6 md:grid-cols-3">
            <span className="absolute left-0 right-0 top-8 hidden h-px bg-violet-200 md:block" aria-hidden="true" />
            {[1, 2, 3].map((n) => (
              <li key={n} className="relative rounded-panel bg-white p-6 shadow-panel">
                <span className="grid h-16 w-16 place-items-center rounded-2xl bg-ink font-display text-2xl font-bold text-violet-400">{n}</span>
                <h3 className="mt-5 text-lg font-semibold">{t(`home.step${n}Title`)}</h3>
                <p className="mt-1.5 text-slate-600">{t(`home.step${n}Text`)}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ---------------- latest classes ---------------- */}
      {latest.data?.items?.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
          <div className="flex items-end justify-between gap-4">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{t('home.latestTitle')}</h2>
            <Link to="/classes" className="inline-flex items-center gap-1 text-sm font-semibold text-violet-700 hover:underline">{t('home.seeAll')}<ArrowRight className="h-4 w-4" /></Link>
          </div>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {latest.data.items.map((c) => <ClassCard key={c.id} c={c} to={`/classes/${c.id}`} />)}
          </div>
        </section>
      )}

      {/* ---------------- call to action ---------------- */}
      <section className="px-4 pb-16 sm:px-6">
        <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[28px] bg-violet-600 px-6 py-12 text-white sm:px-12">
          <span className="absolute -right-10 -top-16 font-display text-[14rem] font-bold leading-none text-white/10" aria-hidden="true">අ</span>
          <span className="absolute -bottom-24 right-40 font-display text-[12rem] font-bold leading-none text-white/10" aria-hidden="true">அ</span>
          <div className="relative max-w-xl">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{t('home.ctaTitle')}</h2>
            <p className="mt-3 text-lg text-white/85">{t('home.ctaText')}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link to="/register?role=TEACHER" className="btn h-12 bg-white px-6 text-base text-violet-700 hover:bg-violet-50">{t('home.ctaTeacher')}</Link>
              <Link to="/register?role=STUDENT" className="btn h-12 border border-white/40 px-6 text-base text-white hover:bg-white/10">{t('home.ctaStudentJoin')}</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
