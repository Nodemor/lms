import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Pencil } from 'lucide-react';
import api from '../../api/client';
import { useAction } from '../../lib/hooks';
import { fmtMoney, fmtNumber } from '../../lib/format';
import { Badge, Button, Input, Modal, PageHeader, Panel, QueryView, Toggle } from '../../components/ui';

export default function AdminPlans() {
  const { t } = useTranslation();
  const [edit, setEdit] = useState(null);
  const q = useQuery({ queryKey: ['admin-plans'], queryFn: () => api.get('/admin/plans').then((r) => r.data) });
  const save = useAction(() => api.put(`/admin/plans/${edit.id}`, { ...edit, priceMonthly: Number(edit.priceMonthly), maxClasses: Number(edit.maxClasses), maxStudents: Number(edit.maxStudents), storageMb: Number(edit.storageMb) }),
    { success: t('common.saved'), invalidate: [['admin-plans'], ['plans']], onSuccess: () => setEdit(null) });
  const set = (k) => (e) => setEdit({ ...edit, [k]: e.target.value });
  return (
    <>
      <PageHeader title={t('nav.plans')} subtitle={t('admin.plansSubtitle')} />
      <Panel padded={false}>
        <QueryView query={q}>
          {(list) => (
            <div className="table-wrap"><table className="table">
              <thead><tr><th>{t('admin.plan')}</th><th>{t('admin.price')}</th><th>{t('nav.classes')}</th><th>{t('nav.students')}</th><th>{t('subscription.storage')}</th><th>{t('common.status')}</th><th /></tr></thead>
              <tbody>{list.map((p) => (
                <tr key={p.id}>
                  <td className="font-semibold">{p.name} <span className="text-xs text-slate-400">{p.code}</span></td>
                  <td>{fmtMoney(p.priceMonthly, p.currency)}</td><td>{p.maxClasses}</td><td>{fmtNumber(p.maxStudents)}</td><td>{Math.round(p.storageMb / 1024)} GB</td>
                  <td>{p.active ? <Badge tone="green">{t('status.ACTIVE')}</Badge> : <Badge>{t('admin.inactive')}</Badge>}</td>
                  <td><Button size="sm" variant="ghost" onClick={() => setEdit({ ...p })}><Pencil className="h-4 w-4" />{t('common.edit')}</Button></td>
                </tr>
              ))}</tbody>
            </table></div>
          )}
        </QueryView>
      </Panel>
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.name || ''}
        footer={<><Button variant="outline" onClick={() => setEdit(null)}>{t('common.cancel')}</Button><Button loading={save.isPending} onClick={() => save.mutate()}>{t('common.save')}</Button></>}>
        {edit && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label={t('admin.planName')} value={edit.name} onChange={set('name')} />
            <Input label={t('admin.priceLkr')} type="number" min="0" value={edit.priceMonthly} onChange={set('priceMonthly')} disabled={edit.code === 'FREE'} />
            <Input label={t('admin.maxClasses')} type="number" min="1" value={edit.maxClasses} onChange={set('maxClasses')} />
            <Input label={t('admin.maxStudents')} type="number" min="1" value={edit.maxStudents} onChange={set('maxStudents')} />
            <Input label={t('admin.storageMb')} type="number" min="100" value={edit.storageMb} onChange={set('storageMb')} />
            <div className="sm:col-span-2 grid gap-1">
              <Toggle checked={edit.advancedAnalytics} onChange={(v) => setEdit({ ...edit, advancedAnalytics: v })} label={t('plans.analytics')} />
              <Toggle checked={edit.prioritySupport} onChange={(v) => setEdit({ ...edit, prioritySupport: v })} label={t('plans.priority')} />
              <Toggle checked={edit.customBranding} onChange={(v) => setEdit({ ...edit, customBranding: v })} label={t('plans.branding')} />
              {edit.code !== 'FREE' && <Toggle checked={edit.active} onChange={(v) => setEdit({ ...edit, active: v })} label={t('admin.planActive')} />}
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
