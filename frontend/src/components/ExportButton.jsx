import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileDown } from 'lucide-react';
import toast from 'react-hot-toast';
import { errorMessage } from '../api/client';
import { Button } from './ui';

/** "Export to Excel" button. `run` loads the data and downloads the CSV. */
export default function ExportButton({ run, size = 'sm', variant = 'outline' }) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const click = async () => {
    setBusy(true);
    try { await run(); toast.success(t('export.done')); } catch (e) { toast.error(errorMessage(e)); } finally { setBusy(false); }
  };
  return <Button size={size} variant={variant} loading={busy} onClick={click}><FileDown className="h-4 w-4" />{t('export.button')}</Button>;
}
