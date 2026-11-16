import { useQuery } from '@tanstack/react-query';
import api from '../api/client';

const DEFAULTS = { platformName: 'NodeMor Academy', supportEmail: 'nodemoracademy@gmail.com', whatsapp: '94719247009' };

/** Contact details from Platform settings (Super Admin can change them). */
export function useContact() {
  const q = useQuery({ queryKey: ['public-settings'], queryFn: () => api.get('/public/settings').then((r) => r.data), staleTime: 10 * 60 * 1000 });
  return { ...DEFAULTS, ...(q.data || {}) };
}

/** wa.me link with an optional pre-filled message. Number in international format without "+". */
export function whatsappLink(number, message) {
  const n = String(number || '').replace(/[^\d]/g, '').replace(/^0/, '94');
  return `https://wa.me/${n}${message ? `?text=${encodeURIComponent(message)}` : ''}`;
}

/** 94719247009 -> 071 924 7009 */
export function prettyPhone(number) {
  const d = String(number || '').replace(/[^\d]/g, '');
  const local = d.startsWith('94') ? `0${d.slice(2)}` : d;
  return local.length === 10 ? `${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}` : local;
}
