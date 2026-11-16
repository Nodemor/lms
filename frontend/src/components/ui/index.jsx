import { forwardRef, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { AlertTriangle, ChevronLeft, ChevronRight, Inbox, Loader2, UploadCloud, X } from 'lucide-react';

export function Spinner({ className }) {
  return <Loader2 className={clsx('animate-spin', className || 'h-5 w-5')} aria-hidden="true" />;
}

export function PageLoader() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-violet-600" role="status">
      <Spinner className="h-7 w-7" /><span className="sr-only">{t('common.loading')}</span>
    </div>
  );
}

export function Button({ variant = 'primary', size, loading, children, className, ...rest }) {
  return (
    <button className={clsx(`btn-${variant}`, size === 'sm' && 'btn-sm', className)} disabled={loading || rest.disabled} {...rest}>
      {loading && <Spinner className="h-4 w-4" />}
      {children}
    </button>
  );
}

export function Field({ label, error, hint, children, htmlFor, className }) {
  return (
    <div className={className}>
      {label && <label className="label" htmlFor={htmlFor}>{label}</label>}
      {children}
      {hint && !error && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
      {error && <p className="mt-1 text-xs font-medium text-red-600" role="alert">{error}</p>}
    </div>
  );
}

export const Input = forwardRef(function Input({ label, error, hint, className, id, ...rest }, ref) {
  const auto = useId();
  const fid = id || auto;
  return (
    <Field label={label} error={error} hint={hint} htmlFor={fid} className={className}>
      <input ref={ref} id={fid} className={clsx('input', error && 'input-error')} aria-invalid={!!error} {...rest} />
    </Field>
  );
});

export const Textarea = forwardRef(function Textarea({ label, error, hint, className, id, rows = 4, ...rest }, ref) {
  const auto = useId();
  const fid = id || auto;
  return (
    <Field label={label} error={error} hint={hint} htmlFor={fid} className={className}>
      <textarea ref={ref} id={fid} rows={rows} className={clsx('input h-auto py-2.5 leading-relaxed', error && 'input-error')} {...rest} />
    </Field>
  );
});

export const Select = forwardRef(function Select({ label, error, hint, className, id, children, ...rest }, ref) {
  const auto = useId();
  const fid = id || auto;
  return (
    <Field label={label} error={error} hint={hint} htmlFor={fid} className={className}>
      <select ref={ref} id={fid} className={clsx('input pr-8', error && 'input-error')} {...rest}>{children}</select>
    </Field>
  );
});

export function Toggle({ checked, onChange, label, description }) {
  const id = useId();
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start gap-3 py-1">
      <span className="relative mt-0.5 inline-flex shrink-0">
        <input id={id} type="checkbox" className="peer sr-only" checked={!!checked} onChange={(e) => onChange(e.target.checked)} />
        <span className="h-6 w-11 rounded-full bg-slate-300 transition peer-checked:bg-violet-500 peer-focus-visible:ring-2 peer-focus-visible:ring-violet-300" />
        <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
      </span>
      <span>
        <span className="block text-sm font-medium text-slate-800">{label}</span>
        {description && <span className="block text-xs text-slate-500">{description}</span>}
      </span>
    </label>
  );
}

export function Panel({ title, action, children, className, padded = true }) {
  return (
    <section className={clsx('panel', className)}>
      {(title || action) && (
        <header className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          {title && <h2 className="text-base font-semibold">{title}</h2>}
          {action}
        </header>
      )}
      <div className={padded ? 'p-5' : ''}>{children}</div>
    </section>
  );
}

const TONES = {
  gray: 'bg-slate-100 text-slate-700',
  violet: 'bg-violet-100 text-violet-800',
  green: 'bg-emerald-100 text-emerald-800',
  amber: 'bg-amber-100 text-amber-800',
  red: 'bg-red-100 text-red-700',
  blue: 'bg-sky-100 text-sky-800',
  live: 'bg-live text-white',
};
export function Badge({ tone = 'gray', children, className }) {
  return <span className={clsx('chip', TONES[tone], className)}>{children}</span>;
}

const STATUS_TONE = {
  ACTIVE: 'green', PUBLISHED: 'green', PAID: 'green', GRADED: 'green', RESOLVED: 'green', ENDED: 'gray', SUBMITTED: 'blue',
  PENDING: 'amber', PENDING_VERIFICATION: 'amber', DRAFT: 'gray', SCHEDULED: 'violet', IN_PROGRESS: 'blue', OPEN: 'amber',
  LIVE: 'live', REJECTED: 'red', FAILED: 'red', SUSPENDED: 'red', CANCELLED: 'gray', REMOVED: 'red', REFUNDED: 'gray',
  ARCHIVED: 'gray', CLOSED: 'gray', PAST_DUE: 'red',
};
export function StatusBadge({ status }) {
  const { t } = useTranslation();
  if (!status) return null;
  return <Badge tone={STATUS_TONE[status] || 'gray'}>{t(`status.${status}`)}</Badge>;
}

export function EmptyState({ icon: Icon = Inbox, title, text, action }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <span className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-violet-50 text-violet-600"><Icon className="h-7 w-7" /></span>
      <h3 className="text-base font-semibold">{title}</h3>
      {text && <p className="mt-1 max-w-md text-sm text-slate-500">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ onRetry }) {
  const { t } = useTranslation();
  return (
    <EmptyState icon={AlertTriangle} title={t('errors.loadFailed')} text={t('errors.loadFailedHint')}
      action={onRetry && <Button variant="outline" onClick={onRetry}>{t('common.retry')}</Button>} />
  );
}

/** Placeholder blocks shown while content loads (feels faster than a spinner). */
export function Skeleton({ rows = 4 }) {
  const { t } = useTranslation();
  return (
    <div className="animate-pulse space-y-4 p-5" role="status" aria-label={t('common.loading')}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <div className="h-11 w-11 shrink-0 rounded-xl bg-slate-200" />
          <div className="flex-1 space-y-2"><div className="h-3.5 w-2/3 rounded bg-slate-200" /><div className="h-3 w-1/3 rounded bg-slate-100" /></div>
        </div>
      ))}
    </div>
  );
}

/** Wraps a react-query result: shows a skeleton, an error with retry, or children(data). */
export function QueryView({ query, children, loader }) {
  if (query.isLoading) return loader || <Skeleton />;
  if (query.isError) return <ErrorState onRetry={() => query.refetch()} />;
  return children(query.data);
}

export function Modal({ open, onClose, title, children, footer, size = 'md' }) {
  const { t } = useTranslation();
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    setTimeout(() => ref.current?.querySelector('input,textarea,select,button')?.focus(), 30);
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [open, onClose]);
  if (!open) return null;
  const width = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl', xl: 'max-w-5xl' }[size];
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-0 sm:items-center sm:p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
      <div ref={ref} role="dialog" aria-modal="true" aria-label={title}
        className={clsx('flex max-h-[92vh] w-full flex-col rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl', width)}>
        <header className="flex items-center justify-between gap-4 border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button className="btn-ghost h-9 w-9 p-0" onClick={onClose} aria-label={t('common.close')}><X className="h-5 w-5" /></button>
        </header>
        <div className="overflow-y-auto px-6 py-5">{children}</div>
        {footer && <footer className="flex flex-wrap justify-end gap-2 border-t border-slate-100 px-6 py-4">{footer}</footer>}
      </div>
    </div>,
    document.body,
  );
}

export function ConfirmDialog({ open, title, text, confirmLabel, danger, loading, onConfirm, onClose }) {
  const { t } = useTranslation();
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm"
      footer={<>
        <Button variant="outline" onClick={onClose}>{t('common.cancel')}</Button>
        <Button variant={danger ? 'danger' : 'primary'} loading={loading} onClick={onConfirm}>{confirmLabel || t('common.confirm')}</Button>
      </>}>
      <p className="text-sm text-slate-600">{text}</p>
    </Modal>
  );
}

export function Tabs({ tabs, active, onChange }) {
  return (
    <div className="-mx-1 overflow-x-auto pb-1" role="tablist">
      <div className="flex min-w-max gap-1 px-1">
        {tabs.map((tab) => (
          <button key={tab.id} role="tab" aria-selected={active === tab.id} onClick={() => onChange(tab.id)}
            className={clsx('inline-flex h-10 items-center gap-2 rounded-xl px-3.5 text-sm font-semibold transition',
              active === tab.id ? 'bg-ink text-white' : 'text-slate-600 hover:bg-white hover:text-slate-900')}>
            {tab.icon && <tab.icon className="h-4 w-4" />}{tab.label}
            {tab.count > 0 && <span className={clsx('rounded-full px-1.5 text-[11px]', active === tab.id ? 'bg-violet-500' : 'bg-amber-200 text-amber-900')}>{tab.count}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Pagination({ page, totalPages, onChange }) {
  const { t } = useTranslation();
  if (!totalPages || totalPages <= 1) return null;
  return (
    <nav className="flex items-center justify-between gap-3 px-4 py-3 text-sm" aria-label={t('common.pagination')}>
      <Button variant="outline" size="sm" disabled={page <= 0} onClick={() => onChange(page - 1)}><ChevronLeft className="h-4 w-4" />{t('common.previous')}</Button>
      <span className="text-slate-500">{t('common.pageOf', { page: page + 1, total: totalPages })}</span>
      <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => onChange(page + 1)}>{t('common.next')}<ChevronRight className="h-4 w-4" /></Button>
    </nav>
  );
}

export function PageHeader({ title, subtitle, actions, back }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {back}
        <h1 className="text-2xl font-bold tracking-tight sm:text-[28px]">{title}</h1>
        {subtitle && <p className="mt-1 text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Stat({ label, value, icon: Icon, tone = 'violet', hint }) {
  const tones = { violet: 'bg-violet-50 text-violet-700', green: 'bg-emerald-50 text-emerald-700', amber: 'bg-amber-50 text-amber-700', red: 'bg-red-50 text-red-700', ink: 'bg-ink text-white' };
  return (
    <div className="panel flex items-center gap-4 p-4">
      {Icon && <span className={clsx('grid h-11 w-11 shrink-0 place-items-center rounded-xl', tones[tone])}><Icon className="h-5 w-5" /></span>}
      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-slate-500">{label}</p>
        <p className="font-display text-2xl font-bold leading-tight">{value}</p>
        {hint && <p className="text-xs text-slate-500">{hint}</p>}
      </div>
    </div>
  );
}

export function Avatar({ name = '', size = 'md' }) {
  const initials = name.trim().split(/\s+/).slice(0, 2).map((p) => [...p][0] || '').join('').toUpperCase() || '?';
  const s = { sm: 'h-8 w-8 text-xs', md: 'h-10 w-10 text-sm', lg: 'h-14 w-14 text-lg' }[size];
  return <span className={clsx('grid shrink-0 place-items-center rounded-full bg-violet-100 font-bold text-violet-800', s)} aria-hidden="true">{initials}</span>;
}

/** File picker with drag & drop and an upload progress bar. */
export function FileDrop({ accept, onFile, progress, fileName, hint, disabled }) {
  const { t } = useTranslation();
  const [drag, setDrag] = useState(false);
  const id = useId();
  return (
    <div>
      <label htmlFor={id}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); if (!disabled && e.dataTransfer.files[0]) onFile(e.dataTransfer.files[0]); }}
        className={clsx('flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-7 text-center transition',
          drag ? 'border-violet-500 bg-violet-50' : 'border-slate-300 bg-slate-50 hover:border-violet-400', disabled && 'pointer-events-none opacity-60')}>
        <UploadCloud className="mb-2 h-7 w-7 text-violet-600" />
        <span className="text-sm font-semibold">{fileName || t('upload.choose')}</span>
        <span className="mt-1 text-xs text-slate-500">{hint || t('upload.dragHint')}</span>
        <input id={id} type="file" className="sr-only" accept={accept} disabled={disabled}
          onChange={(e) => { if (e.target.files[0]) onFile(e.target.files[0]); e.target.value = ''; }} />
      </label>
      {progress != null && (
        <div className="mt-3" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full bg-violet-500 transition-all" style={{ width: `${progress}%` }} /></div>
          <p className="mt-1 text-xs text-slate-500">{progress < 100 ? t('upload.uploading', { progress }) : t('upload.done')}</p>
        </div>
      )}
    </div>
  );
}

export function ProgressBar({ value, tone = 'violet' }) {
  const v = Math.max(0, Math.min(100, Number(value || 0)));
  const c = { violet: 'bg-violet-500', green: 'bg-emerald-500', amber: 'bg-amber-500' }[tone];
  return <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200"><div className={clsx('h-full', c)} style={{ width: `${v}%` }} /></div>;
}
