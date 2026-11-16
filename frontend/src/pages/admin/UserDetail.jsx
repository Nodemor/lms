import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ShieldCheck, ShieldOff } from 'lucide-react';
import api from '../../api/client';
import { useAction } from '../../lib/hooks';
import { fmtDateTime } from '../../lib/format';
import ClassCard from '../../components/ClassCard';
import { Avatar, Badge, Button, Input, Modal, PageHeader, Panel, QueryView, Select, StatusBadge, Textarea } from '../../components/ui';

export default function AdminUserDetail() {
  const { id } = useParams();
  const { t } = useTranslation();
  const [suspend, setSuspend] = useState(false);
  const [reason, setReason] = useState('');
  const [planOpen, setPlanOpen] = useState(false);
  const [plan, setPlan] = useState({ planCode: 'STARTER', months: 1 });
  const q = useQuery({ queryKey: ['admin-user', id], queryFn: () => api.get(`/admin/users/${id}`).then((r) => r.data) });
  const plans = useQuery({ queryKey: ['admin-plans'], queryFn: () => api.get('/admin/plans').then((r) => r.data), enabled: planOpen });
  const setStatus = useAction((s) => api.post(`/admin/users/${id}/status`, { status: s, reason }), { success: t('common.saved'), invalidate: [['admin-user', id], ['admin-users']], onSuccess: () => { setSuspend(false); setReason(''); } });
  const assign = useAction(() => api.post(`/admin/users/${id}/plan`, { ...plan, months: Number(plan.months) }), { success: t('admin.planAssigned'), invalidate: [['admin-user', id]], onSuccess: () => setPlanOpen(false) });
  return (
    <QueryView query={q}>
      {(d) => {
        const u = d.user;
        return (
          <>
            <PageHeader back={<Link to="/admin/users" className="mb-2 inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-violet-700"><ChevronLeft className="h-4 w-4" />{t('nav.users')}</Link>}
              title={u.fullName}
              actions={u.role !== 'SUPER_ADMIN' && (u.status === 'SUSPENDED'
                ? <Button onClick={() => setStatus.mutate('ACTIVE')} loading={setStatus.isPending}><ShieldCheck className="h-4 w-4" />{t('admin.reactivate')}</Button>
                : <Button variant="danger" onClick={() => setSuspend(true)}><ShieldOff className="h-4 w-4" />{t('admin.suspend')}</Button>)} />
            <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
              <Panel>
                <div className="flex items-center gap-4"><Avatar name={u.fullName} size="lg" /><div><p className="font-semibold">{u.email}</p><p className="text-sm text-slate-500">{u.phone || '—'}</p></div></div>
                <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
                  <dt className="text-slate-500">{t('admin.role')}</dt><dd><Badge tone="violet">{t(`roles.${u.role}`)}</Badge></dd>
                  <dt className="text-slate-500">{t('common.status')}</dt><dd><StatusBadge status={u.status} /></dd>
                  <dt className="text-slate-500">{t('admin.emailVerified')}</dt><dd>{u.emailVerified ? t('common.yes') : t('common.no')}</dd>
                  <dt className="text-slate-500">{t('common.language')}</dt><dd>{u.preferredLanguage}</dd>
                  <dt className="text-slate-500">{t('admin.joined')}</dt><dd>{fmtDateTime(u.createdAt)}</dd>
                  <dt className="text-slate-500">{t('admin.lastLogin')}</dt><dd>{fmtDateTime(u.lastLoginAt)}</dd>
                  {u.role === 'STUDENT' && <><dt className="text-slate-500">{t('admin.enrollments')}</dt><dd>{d.enrollments}</dd></>}
                </dl>
              </Panel>
              {u.role === 'TEACHER' && (
                <div className="grid content-start gap-6">
                  <Panel title={t('nav.subscription')} action={<Button size="sm" variant="outline" onClick={() => setPlanOpen(true)}>{t('admin.assignPlan')}</Button>}>
                    <p className="font-display text-xl font-bold">{d.subscription.effectivePlan.name}</p>
                    <p className="text-sm text-slate-500">{d.subscription.currentPeriodEnd ? t('subscription.renews', { date: fmtDateTime(d.subscription.currentPeriodEnd) }) : t('admin.noExpiry')}</p>
                  </Panel>
                  <div className="grid gap-5 sm:grid-cols-2">{d.classes.map((c) => <ClassCard key={c.id} c={c} to={`/classes/${c.id}`} showStatus />)}</div>
                </div>
              )}
            </div>
            <Modal open={suspend} onClose={() => setSuspend(false)} title={t('admin.suspend')} size="sm"
              footer={<><Button variant="outline" onClick={() => setSuspend(false)}>{t('common.cancel')}</Button><Button variant="danger" loading={setStatus.isPending} onClick={() => setStatus.mutate('SUSPENDED')}>{t('admin.suspend')}</Button></>}>
              <p className="mb-3 text-sm text-slate-600">{t('admin.suspendHint')}</p>
              <Textarea label={t('admin.reason')} rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
            </Modal>
            <Modal open={planOpen} onClose={() => setPlanOpen(false)} title={t('admin.assignPlan')} size="sm"
              footer={<><Button variant="outline" onClick={() => setPlanOpen(false)}>{t('common.cancel')}</Button><Button loading={assign.isPending} onClick={() => assign.mutate()}>{t('admin.assignPlan')}</Button></>}>
              <div className="grid gap-4">
                <Select label={t('admin.plan')} value={plan.planCode} onChange={(e) => setPlan({ ...plan, planCode: e.target.value })}>
                  {plans.data?.filter((p) => p.code !== 'FREE').map((p) => <option key={p.code} value={p.code}>{p.name}</option>)}
                </Select>
                <Input label={t('admin.months')} type="number" min="1" max="36" value={plan.months} onChange={(e) => setPlan({ ...plan, months: e.target.value })} />
                <p className="text-xs text-slate-500">{t('admin.assignPlanHint')}</p>
              </div>
            </Modal>
          </>
        );
      }}
    </QueryView>
  );
}
