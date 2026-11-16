import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';

const LINES = { en: 'Teach your class online.', si: 'ඔබේ පන්තිය මාර්ගගතව උගන්වන්න.', ta: 'உங்கள் வகுப்பை இணையத்தில் கற்பியுங்கள்.' };

/** Split auth layout: brand panel (left, hidden on phones) and the form card (right). */
export default function AuthShell({ title, subtitle, children, footer }) {
  const { t, i18n } = useTranslation();
  const [photo, setPhoto] = useState(true);
  return (
    <div className="grid min-h-[calc(100vh-4rem)] lg:grid-cols-[1fr_1.05fr]">
      <aside className="relative hidden overflow-hidden bg-ink p-12 text-white lg:flex lg:flex-col lg:justify-end">
        {photo && <img src="/images/auth.jpg" alt="" onError={() => setPhoto(false)} className="absolute inset-0 h-full w-full object-cover" />}
        <div className={`absolute inset-0 ${photo ? 'bg-gradient-to-t from-ink via-ink/75 to-ink/40' : ''}`} aria-hidden="true" />
        {!photo && <div className="glow-violet absolute -bottom-40 -right-40 h-[520px] w-[520px]" aria-hidden="true" />}
        <div className="relative">
          <h2 className="max-w-md text-4xl font-bold leading-tight" lang={i18n.language}>{LINES[i18n.language] || LINES.en}</h2>
          <div className="mt-3 space-y-0.5 border-l-2 border-violet-500 pl-3 text-white/50">
            {Object.keys(LINES).filter((l) => l !== i18n.language).map((l) => <p key={l} lang={l}>{LINES[l]}</p>)}
          </div>
          <ul className="mt-10 space-y-4">
            {[1, 2, 3].map((n) => (
              <li key={n} className="flex items-start gap-3 text-white/85"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-violet-400" />{t(`auth.side${n}`)}</li>
            ))}
          </ul>
        </div>
      </aside>
      <div className="flex items-center justify-center bg-mist px-4 py-12">
        <div className="animate-rise w-full max-w-md">
          <div className="panel p-7 sm:p-9">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
            {subtitle && <p className="mt-2 text-sm text-slate-500">{subtitle}</p>}
            <div className="mt-7">{children}</div>
          </div>
          {footer && <div className="mt-5 text-center text-sm text-slate-600">{footer}</div>}
        </div>
      </div>
    </div>
  );
}
