import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { BellOff, CheckCheck } from 'lucide-react';
import clsx from 'clsx';
import api from '../../api/client';
import { useAction } from '../../lib/hooks';
import { fmtDateTime } from '../../lib/format';
import { notificationText } from '../../lib/notifications';
import { Button, EmptyState, PageHeader, Pagination, Panel, QueryView } from '../../components/ui';

export default function Notifications() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const [page, setPage] = useState(0);
  const q = useQuery({ queryKey: ['notifications', page], queryFn: () => api.get('/notifications', { params: { page, size: 20 } }).then((r) => r.data) });
  const readAll = useAction(() => api.post('/notifications/read-all'), { invalidate: [['notifications'], ['notif-count']], success: t('notifications.allRead') });
  const open = async (n) => {
    if (!n.read) await api.post(`/notifications/${n.id}/read`).catch(() => {});
    if (n.link) nav(n.link); else q.refetch();
  };
  return (
    <>
      <PageHeader title={t('nav.notifications')} actions={<Button variant="outline" onClick={() => readAll.mutate()} loading={readAll.isPending}><CheckCheck className="h-4 w-4" />{t('notifications.markAll')}</Button>} />
      <Panel padded={false}>
        <QueryView query={q}>
          {(data) => data.items.length === 0 ? <EmptyState icon={BellOff} title={t('notifications.empty')} text={t('notifications.emptyText')} /> : (
            <>
              <ul className="divide-y divide-slate-100">
                {data.items.map((n) => (
                  <li key={n.id}>
                    <button onClick={() => open(n)} className={clsx('flex w-full items-start gap-3 px-5 py-4 text-left hover:bg-mist', !n.read && 'bg-violet-50/50')}>
                      <span className={clsx('mt-2 h-2 w-2 shrink-0 rounded-full', n.read ? 'bg-slate-200' : 'bg-violet-500')} />
                      <span className="flex-1">
                        <span className="block text-sm text-slate-800">{notificationText(n)}</span>
                        <span className="text-xs text-slate-500">{fmtDateTime(n.createdAt)}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} />
            </>
          )}
        </QueryView>
      </Panel>
    </>
  );
}
