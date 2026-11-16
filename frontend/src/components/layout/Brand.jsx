import { Link } from 'react-router-dom';
import clsx from 'clsx';

/** NodeMor logo mark (white artwork). On light backgrounds it is inverted to black. */
export function LogoMark({ className = 'h-8 w-8', dark = true }) {
  return <img src="/logo-mark.png" alt="" aria-hidden="true" className={clsx(className, 'object-contain', !dark && 'invert')} />;
}

export default function Brand({ to = '/', dark = false, compact = false }) {
  return (
    <Link to={to} className={`flex items-center gap-2.5 ${dark ? 'text-white' : 'text-ink'}`} aria-label="NodeMor Academy">
      <LogoMark dark={dark} className={compact ? 'h-7 w-7' : 'h-8 w-8'} />
      <span className={clsx('h-6 w-px', dark ? 'bg-violet-500' : 'bg-violet-400')} aria-hidden="true" />
      <span className={clsx('whitespace-nowrap font-display font-bold tracking-tight', compact ? 'text-[17px]' : 'text-xl')}>NodeMor <span className="text-violet-500">Academy</span></span>
    </Link>
  );
}
