import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { CreditCard } from 'lucide-react';
import api from '../../../api/client';
import PaymentsTable from '../../../components/PaymentsTable';
import ExportButton from '../../../components/ExportButton';
import { downloadCsv, fetchAllPages, today } from '../../../lib/csv';
import { fmtDateTime, fmtMonth } from '../../../lib/format';
import { EmptyState, Pagination, Panel, QueryView, Select } from '../../../components/ui';

export default function ClassPaymentsTab({ cls }) {
  const { t } = useTranslation();
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(0);
  const key = ['teacher-payments', cls.id, status, page];
  const q = useQuery({ queryKey: key, queryFn: () => api.get('/teacher/payments', { params: { classId: cls.id, status: status || undefined, page } }).then((r) => r.data), placeholderData: keepPreviousData });
  if (cls.billingType === 'FREE') return <div className="panel"><EmptyState icon={CreditCard} title={t('payments.freeClass')} text={t('payments.freeClassText')} /></div>;
  return (
    <Panel padded={false} title={t('tabs.payments')} action={
      <div className="flex items-center gap-2">
        <Select aria-label={t('common.status')} value={status} onChange={(e) => { setStatus(e.target.value); setPage(0); }} className="w-40">
          <option value="">{t('common.all')}</option>{['PENDING', 'PAID', 'FAILED', 'REFUNDED', 'CANCELLED'].map((s) => <option key={s} value={s}>{t(`status.${s}`)}</option>)}
        </Select>
        <ExportButton run={async () => downloadCsv(`payments-${cls.title}-${today()}`, [
    { label: t('payments.date'), value: (p) => fmtDateTime(p.createdAt) },
    { label: t('payments.orderId'), value: (p) => p.orderId },
    { label: t('students.student'), value: (p) => p.studentName || '' },
    { label: t('payments.for'), value: (p) => p.classTitle || p.planName || '' },
    { label: t('payments.month'), value: (p) => (p.periodMonth ? fmtMonth(p.periodMonth) : '') },
    { label: t('payments.method'), value: (p) => t(`payments.methods.${p.method}`) },
    { label: t('payments.amount'), value: (p) => Number(p.amount).toFixed(2) },
    { label: 'Currency', value: (p) => p.currency },
    { label: t('common.status'), value: (p) => t(`status.${p.status}`) },
    { label: t('payments.noteOptional'), value: (p) => p.note || '' },
  ], await fetchAllPages('/teacher/payments', { classId: cls.id, status: status || undefined }))} />
      </div>}>
      <QueryView query={q}>{(d) => <><PaymentsTable items={d.items} mode="teacher" invalidate={[['teacher-payments'], ['enrollments', cls.id], ['teacher-dashboard']]} /><Pagination page={d.page} totalPages={d.totalPages} onChange={setPage} /></>}</QueryView>
    </Panel>
  );
}
