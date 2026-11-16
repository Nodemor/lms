import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/client';
import { useAction } from '../../lib/hooks';
import { Button, Input, PageHeader, Panel, QueryView, Textarea, Toggle } from '../../components/ui';

export default function AdminSettings() {
  const { t } = useTranslation();
  const q = useQuery({ queryKey: ['admin-settings'], queryFn: () => api.get('/admin/settings').then((r) => r.data) });
  const [f, setF] = useState(null);
  useEffect(() => { if (q.data) setF(q.data); }, [q.data]);
  const save = useAction(() => api.put('/admin/settings', {
    'platform.name': f['platform.name'] || '', 'platform.supportEmail': f['platform.supportEmail'] || '', 'attendance.minPercent': String(f['attendance.minPercent'] || '50'),
    'registration.teachersEnabled': String(f['registration.teachersEnabled'] === 'true'), 'registration.studentsEnabled': String(f['registration.studentsEnabled'] === 'true'), 'bank.details': f['bank.details'] || '', 'contact.whatsapp': (f['contact.whatsapp'] || '').replace(/[^\d]/g, ''),
  }), { success: t('common.saved'), invalidate: [['admin-settings']] });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  return (
    <>
      <PageHeader title={t('nav.platformSettings')} />
      <QueryView query={q}>
        {() => f && (
          <Panel>
            <div className="grid max-w-2xl gap-5">
              <Input label={t('admin.platformName')} value={f['platform.name'] || ''} onChange={set('platform.name')} />
              <Input label={t('admin.supportEmail')} type="email" value={f['platform.supportEmail'] || ''} onChange={set('platform.supportEmail')} />
              <Input label={t('admin.whatsappNumber')} value={f['contact.whatsapp'] || ''} onChange={set('contact.whatsapp')} hint={t('admin.whatsappHint')} />
              <Input label={t('admin.attendancePercent')} type="number" min="1" max="100" value={f['attendance.minPercent'] || ''} onChange={set('attendance.minPercent')} hint={t('admin.attendancePercentHint')} />
              <Textarea label={t('admin.bankDetails')} rows={5} value={f['bank.details'] || ''} onChange={set('bank.details')} hint={t('admin.bankDetailsHint')} />
              <Toggle checked={f['registration.teachersEnabled'] === 'true'} onChange={(v) => setF({ ...f, 'registration.teachersEnabled': String(v) })} label={t('admin.teacherSignups')} />
              <Toggle checked={f['registration.studentsEnabled'] === 'true'} onChange={(v) => setF({ ...f, 'registration.studentsEnabled': String(v) })} label={t('admin.studentSignups')} />
              <div><Button loading={save.isPending} onClick={() => save.mutate()}>{t('common.saveChanges')}</Button></div>
            </div>
          </Panel>
        )}
      </QueryView>
    </>
  );
}
