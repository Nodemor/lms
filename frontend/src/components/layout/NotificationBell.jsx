import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Bell } from 'lucide-react';
import clsx from 'clsx';
import api from '../../api/client';
import { relativeTime } from '../../lib/format';
import { notificationText } from '../../lib/notifications';

export default function NotificationBell() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const nav = useNavigate();
  const qc = useQueryClient();
  const count = useQuery({ queryKey: ['notif-count'], queryFn: () => api.get('/notifications/unread-count').then((r) => r.data.count), refetchInterval: 30000 });
  const list = useQuery({ queryKey: ['notifications', 'bell'], queryFn: () => api.get('/notifications', { params: { size: 8 } }).then((r) => r.data), enabled: open });

  useEffect(() => {
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const openItem = async (n) => {
    setOpen(false);
    if (!n.read) { await api.post(`/notifications/${n.id}/read`).catch(() => {}); qc.invalidateQueries({ queryKey: ['notif-count'] }); }
    if (n.link) nav(n.link);
  };

  return (
    <div className="relative" ref={ref}>
      <button className="btn-ghost relative h-10 w-10 p-0" onClick={() => setOpen((v) => !v)} aria-label={t('nav.notifications')} aria-expanded={open}>
        <Bell className="h-5 w-5" />
        {count.data > 0 && <span className="absolute right-1.5 top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-live px-1 text-[10px] font-bold text-white">{count.data > 99 ? '99+' : count.data}</span>}
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-2 w-[min(92vw,360px)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <span className="text-sm font-semibold">{t('nav.notifications')}</span>
            <Link to="/notifications" className="text-xs font-semibold text-violet-700" onClick={() => setOpen(false)}>{t('notifications.viewAll')}</Link>
          </div>
          <ul className="max-h-96 overflow-y-auto">
            {list.data?.items?.length ? list.data.items.map((n) => (
              <li key={n.id}>
                <button onClick={() => openItem(n)} className={clsx('flex w-full gap-3 px-4 py-3 text-left hover:bg-mist', !n.read && 'bg-violet-50/60')}>
                  <span className={clsx('mt-1.5 h-2 w-2 shrink-0 rounded-full', n.read ? 'bg-transparent' : 'bg-violet-500')} />
                  <span className="min-w-0">
                    <span className="block text-sm text-slate-800">{notificationText(n)}</span>
                    <span className="text-xs text-slate-500">{relativeTime(n.createdAt)}</span>
                  </span>
                </button>
              </li>
            )) : <li className="px-4 py-8 text-center text-sm text-slate-500">{list.isLoading ? t('common.loading') : t('notifications.empty')}</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
