import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import api from '../../api/client';
import PaymentsTable from '../../components/PaymentsTable';
import ExportButton from '../../components/ExportButton';
import { downloadCsv, fetchAllPages, today } from '../../lib/csv';
import { fmtDateTime, fmtMonth } from '../../lib/format';
import { PageHeader, Pagination, Panel, QueryView, Select } from '../../components/ui';

export default function TeacherPayments() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const [status, setStatus] = useState(params.get('status') || '');
  const [classId, setClassId] = useState('');
  const [page, setPage] = useState(0);
  const classes = useQuery({ queryKey: ['teacher-classes'], queryFn: () => api.get('/teacher/classes').then((r) => r.data) });
  const q = useQuery({
    queryKey: ['teacher-payments', classId, status, page],
    queryFn: () => api.get('/teacher/payments', { params: { classId: classId || undefined, status: status || undefined, page } }).then((r) => r.data),
    placeholderData: keepPreviousData,
  });
  return (
    <>
      <PageHeader title={t('nav.payments')} subtitle={t('payments.teacherSubtitle')}
        actions={<ExportButton size="md" run={async () => downloadCsv(`payments-${today()}`, [
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
  ], await fetchAllPages('/teacher/payments', { classId: classId || undefined, status: status || undefined }))} />} />
      <Panel padded={false}>
        <div className="grid gap-3 border-b border-slate-100 p-4 sm:grid-cols-2 lg:max-w-2xl">
          <Select aria-label={t('nav.classes')} value={classId} onChange={(e) => { setClassId(e.target.value); setPage(0); }}>
            <option value="">{t('payments.allClasses')}</option>
            {classes.data?.filter((c) => c.billingType !== 'FREE').map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </Select>
          <Select aria-label={t('common.status')} value={status} onChange={(e) => { setStatus(e.target.value); setPage(0); }}>
            <option value="">{t('common.all')}</option>{['PENDING', 'PAID', 'FAILED', 'REFUNDED', 'CANCELLED'].map((s) => <option key={s} value={s}>{t(`status.${s}`)}</option>)}
          </Select>
        </div>
        <QueryView query={q}>{(d) => <><PaymentsTable items={d.items} mode="teacher" invalidate={[['teacher-payments'], ['teacher-dashboard']]} /><Pagination page={d.page} totalPages={d.totalPages} onChange={setPage} /></>}</QueryView>
      </Panel>
    </>
  );
}
