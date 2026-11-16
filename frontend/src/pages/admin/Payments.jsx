import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import api from '../../api/client';
import PaymentsTable from '../../components/PaymentsTable';
import { PageHeader, Pagination, Panel, QueryView, Select } from '../../components/ui';

export default function AdminPayments() {
  const { t } = useTranslation();
  const [status, setStatus] = useState('');
  const [type, setType] = useState('');
  const [page, setPage] = useState(0);
  const q = useQuery({ queryKey: ['admin-payments', status, type, page], queryFn: () => api.get('/admin/payments', { params: { status: status || undefined, type: type || undefined, page } }).then((r) => r.data), placeholderData: keepPreviousData });
  return (
    <>
      <PageHeader title={t('nav.payments')} subtitle={t('admin.paymentsSubtitle')} />
      <Panel padded={false}>
        <div className="grid gap-3 border-b border-slate-100 p-4 sm:grid-cols-2 lg:max-w-xl">
          <Select aria-label={t('payments.type')} value={type} onChange={(e) => { setType(e.target.value); setPage(0); }}>
            <option value="">{t('admin.allTypes')}</option><option value="CLASS_FEE">{t('payments.types.CLASS_FEE')}</option><option value="SUBSCRIPTION">{t('payments.types.SUBSCRIPTION')}</option>
          </Select>
          <Select aria-label={t('common.status')} value={status} onChange={(e) => { setStatus(e.target.value); setPage(0); }}>
            <option value="">{t('common.all')}</option>{['PENDING', 'PAID', 'FAILED', 'REFUNDED', 'CANCELLED'].map((s) => <option key={s} value={s}>{t(`status.${s}`)}</option>)}
          </Select>
        </div>
        <QueryView query={q}>{(d) => <><PaymentsTable items={d.items} mode="admin" /><Pagination page={d.page} totalPages={d.totalPages} onChange={setPage} /></>}</QueryView>
      </Panel>
    </>
  );
}
