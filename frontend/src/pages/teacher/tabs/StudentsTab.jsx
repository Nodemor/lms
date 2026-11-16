import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { Banknote, Check, RotateCcw, Search, UserMinus, UserPlus, Users, X } from 'lucide-react';
import api from '../../../api/client';
import { useAction, useDebounced } from '../../../lib/hooks';
import { currentMonth, fmtDate, fmtMonth, addMonths } from '../../../lib/format';
import ExportButton from '../../../components/ExportButton';
import { downloadCsv, fetchAllPages, today } from '../../../lib/csv';
import { Avatar, Badge, Button, ConfirmDialog, EmptyState, Input, Modal, Pagination, Panel, QueryView, Select, StatusBadge, Textarea } from '../../../components/ui';

export default function StudentsTab({ cls }) {
  const { t } = useTranslation();
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(0);
  const [addOpen, setAddOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [cashFor, setCashFor] = useState(null);
  const [cash, setCash] = useState({ periodMonth: currentMonth(), note: '' });
  const [removeId, setRemoveId] = useState(null);
  const dq = useDebounced(q);
  const list = useQuery({
    queryKey: ['enrollments', cls.id, status, dq, page],
    queryFn: () => api.get(`/teacher/classes/${cls.id}/enrollments`, { params: { status: status || undefined, q: dq, page, size: 20 } }).then((r) => r.data),
    placeholderData: keepPreviousData,
  });
  const inv = [['enrollments', cls.id], ['teacher-class', cls.id], ['teacher-dashboard']];
  const decide = useAction(({ id, action }) => api.post(`/teacher/classes/${cls.id}/enrollments/${id}/${action}`), { invalidate: inv, success: t('common.saved'), onSuccess: () => setRemoveId(null) });
  const add = useAction(() => api.post(`/teacher/classes/${cls.id}/enrollments`, { email: email.trim() }), { invalidate: inv, success: t('students.added'), onSuccess: () => { setAddOpen(false); setEmail(''); } });
  const recordCash = useAction(() => api.post(`/teacher/classes/${cls.id}/payments/cash`, { studentId: cashFor.studentId, periodMonth: cls.billingType === 'MONTHLY' ? cash.periodMonth : null, note: cash.note }),
    { invalidate: inv.concat([['teacher-payments']]), success: t('payments.cashRecorded'), onSuccess: () => setCashFor(null) });
  const months = [-1, 0, 1, 2].map((n) => addMonths(currentMonth(), n));

  return (
    <Panel padded={false} title={t('tabs.students')} action={
      <div className="flex gap-2">
        <ExportButton run={async () => downloadCsv(`students-${cls.title}-${today()}`, [
          { label: t('students.student'), value: (e) => e.studentName },
          { label: t('auth.email'), value: (e) => e.studentEmail },
          { label: t('auth.phone'), value: (e) => e.studentPhone || '' },
          { label: t('common.status'), value: (e) => t(`status.${e.status}`) },
          { label: t('students.feeStatus'), value: (e) => (e.paidCurrentPeriod == null ? '' : e.paidCurrentPeriod ? t('students.paid') : t('students.unpaid')) },
          { label: t('students.joined'), value: (e) => fmtDate(e.createdAt) },
        ], await fetchAllPages(`/teacher/classes/${cls.id}/enrollments`, { status: status || undefined, q: dq }))} />
        <Button size="sm" onClick={() => setAddOpen(true)}><UserPlus className="h-4 w-4" />{t('students.add')}</Button>
      </div>}>
      <div className="grid gap-3 border-b border-slate-100 p-4 sm:grid-cols-[1fr_200px]">
        <label className="relative"><span className="sr-only">{t('common.search')}</span><Search className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
          <input className="input pl-10" placeholder={t('students.search')} value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} /></label>
        <Select aria-label={t('common.status')} value={status} onChange={(e) => { setStatus(e.target.value); setPage(0); }}>
          <option value="">{t('common.all')}</option>
          {['PENDING', 'ACTIVE', 'REJECTED', 'CANCELLED', 'REMOVED'].map((s) => <option key={s} value={s}>{t(`status.${s}`)}</option>)}
        </Select>
      </div>
      <QueryView query={list}>
        {(data) => data.items.length === 0 ? <EmptyState icon={Users} title={t('students.none')} text={t('students.noneText')} /> : (
          <>
            <div className="table-wrap"><table className="table">
              <thead><tr><th>{t('students.student')}</th><th>{t('common.status')}</th>{cls.billingType !== 'FREE' && <th>{t('students.feeStatus')}</th>}<th>{t('students.joined')}</th><th className="text-right">{t('common.actions')}</th></tr></thead>
              <tbody>
                {data.items.map((e) => (
                  <tr key={e.id}>
                    <td><div className="flex items-center gap-3"><Avatar name={e.studentName} size="sm" /><div className="min-w-0"><p className="font-medium">{e.studentName}</p><p className="text-xs text-slate-500">{e.studentEmail}{e.studentPhone ? ` · ${e.studentPhone}` : ''}</p></div></div></td>
                    <td><StatusBadge status={e.status} /></td>
                    {cls.billingType !== 'FREE' && <td>{e.status === 'ACTIVE' && (e.paidCurrentPeriod ? <Badge tone="green">{t('students.paid')}</Badge> : <Badge tone="amber">{t('students.unpaid')}</Badge>)}</td>}
                    <td className="whitespace-nowrap text-slate-500">{fmtDate(e.createdAt)}</td>
                    <td><div className="flex justify-end gap-1">
                      {e.status === 'PENDING' && <>
                        <Button size="sm" onClick={() => decide.mutate({ id: e.id, action: 'approve' })}><Check className="h-4 w-4" />{t('students.approve')}</Button>
                        <Button size="sm" variant="outline" onClick={() => decide.mutate({ id: e.id, action: 'reject' })}><X className="h-4 w-4" />{t('students.reject')}</Button>
                      </>}
                      {e.status === 'ACTIVE' && <>
                        {cls.billingType !== 'FREE' && !e.paidCurrentPeriod && <Button size="sm" variant="outline" onClick={() => setCashFor(e)}><Banknote className="h-4 w-4" />{t('payments.recordCash')}</Button>}
                        <Button size="sm" variant="ghost" onClick={() => setRemoveId(e.id)} aria-label={t('students.remove')}><UserMinus className="h-4 w-4" /></Button>
                      </>}
                      {['REMOVED', 'REJECTED', 'CANCELLED'].includes(e.status) && <Button size="sm" variant="ghost" onClick={() => decide.mutate({ id: e.id, action: 'restore' })}><RotateCcw className="h-4 w-4" />{t('students.restore')}</Button>}
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table></div>
            <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} />
          </>
        )}
      </QueryView>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title={t('students.add')} size="sm"
        footer={<><Button variant="outline" onClick={() => setAddOpen(false)}>{t('common.cancel')}</Button><Button loading={add.isPending} disabled={!email.includes('@')} onClick={() => add.mutate()}>{t('students.add')}</Button></>}>
        <p className="mb-4 text-sm text-slate-500">{t('students.addHint')}</p>
        <Input label={t('auth.email')} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </Modal>

      <Modal open={!!cashFor} onClose={() => setCashFor(null)} title={t('payments.recordCash')} size="sm"
        footer={<><Button variant="outline" onClick={() => setCashFor(null)}>{t('common.cancel')}</Button><Button loading={recordCash.isPending} onClick={() => recordCash.mutate()}>{t('payments.recordCash')}</Button></>}>
        <p className="mb-4 text-sm text-slate-600">{t('payments.cashHint', { name: cashFor?.studentName })}</p>
        {cls.billingType === 'MONTHLY' && (
          <Select label={t('payments.month')} value={cash.periodMonth} onChange={(e) => setCash({ ...cash, periodMonth: e.target.value })} className="mb-4">
            {months.map((m) => <option key={m} value={m}>{fmtMonth(m)}</option>)}
          </Select>
        )}
        <Textarea label={t('payments.noteOptional')} rows={2} value={cash.note} onChange={(e) => setCash({ ...cash, note: e.target.value })} />
      </Modal>

      <ConfirmDialog open={!!removeId} danger title={t('students.remove')} text={t('students.removeConfirm')} confirmLabel={t('students.remove')}
        loading={decide.isPending} onConfirm={() => decide.mutate({ id: removeId, action: 'remove' })} onClose={() => setRemoveId(null)} />
    </Panel>
  );
}
