import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Eye, Receipt, Undo2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { errorMessage, openSignedUrl } from '../api/client';
import { useAction } from '../lib/hooks';
import { fmtDateTime, fmtMoney, fmtMonth } from '../lib/format';
import { Button, EmptyState, Modal, StatusBadge, Textarea } from './ui';

/** Payment list. mode: 'teacher' (approve/reject slips, refund), 'student', or 'admin'. */
export default function PaymentsTable({ items, mode, invalidate = [] }) {
  const { t } = useTranslation();
  const [reject, setReject] = useState(null);
  const [refund, setRefund] = useState(null);
  const decide = useAction(({ id, approve, note }) => api.post(`/teacher/payments/${id}/decision`, { approve, note }), {
    invalidate, success: t('common.saved'), onSuccess: () => setReject(null),
  });
  const doRefund = useAction(({ id, note }) => api.post(`/teacher/payments/${id}/refund`, { note }), { invalidate, success: t('payments.refunded'), onSuccess: () => setRefund(null) });

  if (!items.length) return <EmptyState icon={Receipt} title={t('payments.none')} />;
  return (
    <>
      <div className="table-wrap"><table className="table">
        <thead><tr>
          <th>{t('payments.date')}</th>
          {mode !== 'student' && <th>{mode === 'admin' ? t('payments.payer') : t('students.student')}</th>}
          <th>{t('payments.for')}</th><th>{t('payments.method')}</th><th>{t('payments.amount')}</th><th>{t('common.status')}</th>
          <th className="text-right">{t('common.actions')}</th>
        </tr></thead>
        <tbody>{items.map((p) => (
          <tr key={p.id}>
            <td className="whitespace-nowrap text-slate-500">{fmtDateTime(p.createdAt)}</td>
            {mode !== 'student' && <td>{p.studentName || p.teacherName}</td>}
            <td><span className="block">{p.type === 'SUBSCRIPTION' ? t('payments.planName', { plan: p.planName }) : p.classTitle}</span>
              {p.periodMonth && <span className="text-xs text-slate-500">{fmtMonth(p.periodMonth)}</span>}</td>
            <td className="whitespace-nowrap">{t(`payments.methods.${p.method}`)}</td>
            <td className="whitespace-nowrap font-semibold">{fmtMoney(p.amount, p.currency)}</td>
            <td><StatusBadge status={p.status} />{p.note && <span className="mt-1 block max-w-[14rem] truncate text-xs text-slate-500" title={p.note}>{p.note}</span>}</td>
            <td><div className="flex justify-end gap-1">
              {p.hasSlip && <Button size="sm" variant="ghost" onClick={() => openSignedUrl(`/payments/${p.id}/slip`).catch((e) => toast.error(errorMessage(e)))}><Eye className="h-4 w-4" />{t('payments.slip')}</Button>}
              {mode === 'teacher' && p.status === 'PENDING' && p.method === 'BANK_TRANSFER' && <>
                <Button size="sm" loading={decide.isPending} onClick={() => decide.mutate({ id: p.id, approve: true })}><Check className="h-4 w-4" />{t('payments.approve')}</Button>
                <Button size="sm" variant="outline" onClick={() => setReject({ id: p.id, note: '' })}><X className="h-4 w-4" />{t('payments.reject')}</Button>
              </>}
              {mode === 'teacher' && p.status === 'PAID' && <Button size="sm" variant="ghost" onClick={() => setRefund({ id: p.id, note: '' })}><Undo2 className="h-4 w-4" />{t('payments.markRefunded')}</Button>}
            </div></td>
          </tr>
        ))}</tbody>
      </table></div>
      <Modal open={!!reject} onClose={() => setReject(null)} title={t('payments.reject')} size="sm"
        footer={<><Button variant="outline" onClick={() => setReject(null)}>{t('common.cancel')}</Button><Button variant="danger" loading={decide.isPending} onClick={() => decide.mutate({ id: reject.id, approve: false, note: reject.note })}>{t('payments.reject')}</Button></>}>
        <Textarea label={t('payments.rejectReason')} rows={3} value={reject?.note || ''} onChange={(e) => setReject({ ...reject, note: e.target.value })} hint={t('payments.rejectHint')} />
      </Modal>
      <Modal open={!!refund} onClose={() => setRefund(null)} title={t('payments.markRefunded')} size="sm"
        footer={<><Button variant="outline" onClick={() => setRefund(null)}>{t('common.cancel')}</Button><Button loading={doRefund.isPending} onClick={() => doRefund.mutate(refund)}>{t('payments.markRefunded')}</Button></>}>
        <p className="mb-3 text-sm text-slate-600">{t('payments.refundHint')}</p>
        <Textarea label={t('payments.noteOptional')} rows={2} value={refund?.note || ''} onChange={(e) => setRefund({ ...refund, note: e.target.value })} />
      </Modal>
    </>
  );
}
