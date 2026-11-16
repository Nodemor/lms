import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { Search, SearchX } from 'lucide-react';
import api from '../../api/client';
import { useDebounced } from '../../lib/hooks';
import ClassCard from '../../components/ClassCard';
import { EmptyState, Pagination, QueryView, Select } from '../../components/ui';

export default function Explore() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const [q, setQ] = useState(params.get('q') || '');
  const [subject, setSubject] = useState('');
  const [medium, setMedium] = useState('');
  const [page, setPage] = useState(0);
  const dq = useDebounced(q);
  const subjects = useQuery({ queryKey: ['subjects'], queryFn: () => api.get('/public/subjects').then((r) => r.data) });
  const list = useQuery({
    queryKey: ['public-classes', dq, subject, medium, page],
    queryFn: () => api.get('/public/classes', { params: { q: dq, subject, medium, page, size: 12 } }).then((r) => r.data),
    placeholderData: keepPreviousData,
  });
  return (
    <>
    <section className="relative overflow-hidden bg-ink text-white">
      <div className="grid-lines absolute inset-0 opacity-60" aria-hidden="true" />
      <div className="glow-violet absolute -right-40 -top-56 h-[520px] w-[520px]" aria-hidden="true" />
      <div className="relative mx-auto max-w-6xl px-4 pb-24 pt-12 sm:px-6">
        <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">{t('explore.title')}</h1>
        <p className="mt-2 max-w-xl text-white/70">{t('explore.subtitle')}</p>
      </div>
    </section>
    <div className="mx-auto max-w-6xl px-4 pb-14 sm:px-6">
      <div className="relative -mt-14 grid gap-3 rounded-panel bg-white p-3 shadow-panel sm:grid-cols-[1fr_200px_160px]">
        <label className="relative block">
          <span className="sr-only">{t('common.search')}</span>
          <Search className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
          <input className="input pl-10" placeholder={t('explore.searchPlaceholder')} value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} />
        </label>
        <Select aria-label={t('class.subject')} value={subject} onChange={(e) => { setSubject(e.target.value); setPage(0); }}>
          <option value="">{t('explore.allSubjects')}</option>
          {subjects.data?.map((s) => <option key={s} value={s}>{s}</option>)}
        </Select>
        <Select aria-label={t('class.medium')} value={medium} onChange={(e) => { setMedium(e.target.value); setPage(0); }}>
          <option value="">{t('explore.anyMedium')}</option>
          <option value="en">English</option><option value="si">සිංහල</option><option value="ta">தமிழ்</option>
        </Select>
      </div>
      <div className="mt-8">
        <QueryView query={list}>
          {(data) => data.items.length === 0 ? (
            <EmptyState icon={SearchX} title={t('explore.emptyTitle')} text={t('explore.emptyText')} />
          ) : (
            <>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {data.items.map((c) => <ClassCard key={c.id} c={c} to={`/classes/${c.id}`} />)}
              </div>
              <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} />
            </>
          )}
        </QueryView>
      </div>
    </div>
    </>
  );
}
