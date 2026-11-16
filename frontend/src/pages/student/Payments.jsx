import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import api from '../../api/client';
import PaymentsTable from '../../components/PaymentsTable';
import { PageHeader, Pagination, Panel, QueryView } from '../../components/ui';

export default function StudentPayments() {
  const { t } = useTranslation();
  const [page, setPage] = useState(0);
  const q = useQuery({ queryKey: ['student-payments', page], queryFn: () => api.get('/student/payments', { params: { page } }).then((r) => r.data), placeholderData: keepPreviousData });
  return (
    <>
      <PageHeader title={t('nav.payments')} subtitle={t('payments.studentSubtitle')} />
      <Panel padded={false}><QueryView query={q}>{(d) => <><PaymentsTable items={d.items} mode="student" /><Pagination page={d.page} totalPages={d.totalPages} onChange={setPage} /></>}</QueryView></Panel>
    </>
  );
}
