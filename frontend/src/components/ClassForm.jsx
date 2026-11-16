import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ImagePlus, Trash2 } from 'lucide-react';
import { uploadFile, errorMessage } from '../api/client';
import { Button, Input, Select, Textarea } from './ui';
import toast from 'react-hot-toast';

export const EMPTY_CLASS = {
  title: '', description: '', subject: '', gradeLevel: '', medium: 'en', scheduleText: '',
  enrollmentMode: 'OPEN', billingType: 'MONTHLY', fee: '', maxStudents: '', thumbnailKey: null, thumbnailUrl: null,
};

export default function ClassForm({ initial = EMPTY_CLASS, onSubmit, submitting, submitLabel }) {
  const { t } = useTranslation();
  const [f, setF] = useState({ ...EMPTY_CLASS, ...initial, fee: initial.fee ?? '', maxStudents: initial.maxStudents ?? '' });
  const [errors, setErrors] = useState({});
  const [progress, setProgress] = useState(null);
  const [preview, setPreview] = useState(initial.thumbnailUrl || null);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const pickThumb = async (file) => {
    if (!file) return;
    setProgress(0);
    try {
      const up = await uploadFile(file, 'CLASS_THUMBNAIL', null, setProgress);
      setF((x) => ({ ...x, thumbnailKey: up.key }));
      setPreview(URL.createObjectURL(file));
    } catch (e) { toast.error(errorMessage(e)); } finally { setProgress(null); }
  };

  const submit = (e) => {
    e.preventDefault();
    const er = {};
    if (!f.title.trim()) er.title = t('validation.required');
    if (!f.subject.trim()) er.subject = t('validation.required');
    if (f.billingType !== 'FREE' && !(Number(f.fee) > 0)) er.fee = t('errors.fee_required');
    setErrors(er);
    if (Object.keys(er).length) return;
    onSubmit({
      title: f.title.trim(), description: f.description, subject: f.subject.trim(), gradeLevel: f.gradeLevel,
      medium: f.medium, scheduleText: f.scheduleText, enrollmentMode: f.enrollmentMode, billingType: f.billingType,
      fee: f.billingType === 'FREE' ? 0 : Number(f.fee), maxStudents: f.maxStudents ? Number(f.maxStudents) : null,
      thumbnailKey: f.thumbnailKey || null,
    });
  };

  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
      <div className="sm:col-span-2">
        <span className="label">{t('class.cover')}</span>
        <div className="flex items-center gap-4">
          <div className="grid h-20 w-32 shrink-0 place-items-center overflow-hidden rounded-xl bg-slate-100">
            {preview ? <img src={preview} alt="" className="h-full w-full object-cover" /> : <ImagePlus className="h-6 w-6 text-slate-400" />}
          </div>
          <div className="flex flex-wrap gap-2">
            <label className="btn-outline btn-sm cursor-pointer">
              {progress != null ? t('upload.uploading', { progress }) : t('class.uploadCover')}
              <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => pickThumb(e.target.files[0])} />
            </label>
            {f.thumbnailKey && <Button type="button" size="sm" variant="ghost" onClick={() => { setF({ ...f, thumbnailKey: null }); setPreview(null); }}><Trash2 className="h-4 w-4" />{t('common.remove')}</Button>}
          </div>
        </div>
      </div>
      <Input label={t('class.title')} value={f.title} onChange={set('title')} error={errors.title} className="sm:col-span-2" maxLength={200} />
      <Input label={t('class.subject')} value={f.subject} onChange={set('subject')} error={errors.subject} placeholder={t('class.subjectPlaceholder')} maxLength={100} />
      <Input label={t('class.grade')} value={f.gradeLevel} onChange={set('gradeLevel')} placeholder={t('class.gradePlaceholder')} maxLength={60} />
      <Select label={t('class.medium')} value={f.medium} onChange={set('medium')}>
        <option value="en">English</option><option value="si">සිංහල</option><option value="ta">தமிழ்</option>
      </Select>
      <Input label={t('class.schedule')} value={f.scheduleText} onChange={set('scheduleText')} placeholder={t('class.schedulePlaceholder')} maxLength={300} />
      <Textarea label={t('class.description')} value={f.description} onChange={set('description')} className="sm:col-span-2" rows={5} />
      <Select label={t('class.billing')} value={f.billingType} onChange={set('billingType')}>
        <option value="FREE">{t('class.billingTypes.FREE')}</option>
        <option value="MONTHLY">{t('class.billingTypes.MONTHLY')}</option>
        <option value="ONE_TIME">{t('class.billingTypes.ONE_TIME')}</option>
      </Select>
      <Input label={t('class.feeLkr')} type="number" min="0" step="0.01" value={f.fee} onChange={set('fee')} disabled={f.billingType === 'FREE'} error={errors.fee} />
      <Select label={t('class.enrollment')} value={f.enrollmentMode} onChange={set('enrollmentMode')}>
        <option value="OPEN">{t('class.modes.OPEN')}</option>
        <option value="APPROVAL">{t('class.modes.APPROVAL')}</option>
      </Select>
      <Input label={t('class.maxStudents')} type="number" min="1" value={f.maxStudents} onChange={set('maxStudents')} hint={t('class.maxStudentsHint')} />
      <div className="sm:col-span-2"><Button type="submit" loading={submitting} disabled={progress != null}>{submitLabel || t('common.save')}</Button></div>
    </form>
  );
}
