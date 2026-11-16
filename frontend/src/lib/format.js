import { intlLocale } from '../i18n';

const TZ = { timeZone: 'Asia/Colombo' };

export function fmtDateTime(v) {
  if (!v) return '—';
  return new Intl.DateTimeFormat(intlLocale(), { ...TZ, dateStyle: 'medium', timeStyle: 'short' }).format(new Date(v));
}
export function fmtDate(v) {
  if (!v) return '—';
  return new Intl.DateTimeFormat(intlLocale(), { ...TZ, dateStyle: 'medium' }).format(new Date(v));
}
export function fmtTime(v) {
  if (!v) return '';
  return new Intl.DateTimeFormat(intlLocale(), { ...TZ, timeStyle: 'short' }).format(new Date(v));
}
export function fmtMoney(amount, currency = 'LKR') {
  const n = Number(amount || 0);
  try {
    return new Intl.NumberFormat(intlLocale(), { style: 'currency', currency, maximumFractionDigits: 2 }).format(n);
  } catch {
    return `${currency} ${n.toFixed(2)}`;
  }
}
export function fmtNumber(n) {
  return new Intl.NumberFormat(intlLocale()).format(Number(n || 0));
}
export function fmtBytes(b) {
  const n = Number(b || 0);
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 ** 3).toFixed(2)} GB`;
}
export function fmtDuration(sec) {
  const s = Math.max(0, Math.round(Number(sec || 0)));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}` : `${m}:${String(r).padStart(2, '0')}`;
}
export function fmtMonth(ym) {
  if (!ym) return '';
  const [y, m] = ym.split('-').map(Number);
  return new Intl.DateTimeFormat(intlLocale(), { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(y, m - 1, 1)));
}
/** ISO instant -> value for <input type="datetime-local"> in the browser's local time. */
export function toLocalInput(v) {
  if (!v) return '';
  const d = new Date(v);
  const pad = (x) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
export function fromLocalInput(v) {
  return v ? new Date(v).toISOString() : null;
}
export function relativeTime(v) {
  if (!v) return '';
  const diff = (new Date(v).getTime() - Date.now()) / 1000;
  const rtf = new Intl.RelativeTimeFormat(intlLocale(), { numeric: 'auto' });
  const abs = Math.abs(diff);
  if (abs < 60) return rtf.format(Math.round(diff), 'second');
  if (abs < 3600) return rtf.format(Math.round(diff / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), 'hour');
  return rtf.format(Math.round(diff / 86400), 'day');
}
export function currentMonth() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Colombo', year: 'numeric', month: '2-digit' }).format(new Date()).slice(0, 7);
}
export function addMonths(ym, n) {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}
