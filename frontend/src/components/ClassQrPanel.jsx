import { useTranslation } from 'react-i18next';
import { Download, Printer, QrCode as QrIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import QrCode, { qrDataUrl } from './QrCode';
import { Button, Panel } from './ui';
import { fmtMoney } from '../lib/format';

/** Class QR: students scan it to open the class page (mentor details + Join). Download or print a poster. */
export default function ClassQrPanel({ cls }) {
  const { t } = useTranslation();
  const url = `${window.location.origin}/classes/${cls.id}`;

  const download = async () => {
    const data = await qrDataUrl(url, 1200);
    const a = document.createElement('a');
    a.href = data;
    a.download = `${cls.title.replace(/[^\p{L}\p{N}]+/gu, '-')}-qr.png`;
    a.click();
  };

  const printPoster = async () => {
    const data = await qrDataUrl(url, 900);
    const w = window.open('', '_blank');
    if (!w) { toast.error(t('classQr.popupBlocked')); return; }
    const esc = (s) => String(s || '').replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
    const fee = cls.billingType === 'FREE' ? t('class.free') : `${fmtMoney(cls.fee, cls.currency)}${cls.billingType === 'MONTHLY' ? ` ${t('class.perMonth')}` : ''}`;
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(cls.title)}</title>
      <style>
        @page { size: A4; margin: 16mm; }
        body { font-family: 'Noto Sans','Noto Sans Sinhala','Noto Sans Tamil',Arial,sans-serif; text-align: center; color: #14111F; }
        .brand { font-weight: 800; font-size: 22px; letter-spacing: -.3px; } .brand span { color: #7B2FF7; }
        h1 { font-size: 34px; margin: 28px 0 6px; } .meta { color: #555; font-size: 18px; margin: 4px 0; }
        img { width: 92mm; height: 92mm; margin: 24px auto; display: block; }
        .scan { font-size: 22px; font-weight: 700; } .url { color: #666; font-size: 13px; margin-top: 6px; word-break: break-all; }
        .fee { display: inline-block; margin-top: 10px; padding: 6px 16px; border-radius: 999px; background: #F3F0FB; color: #5716B8; font-weight: 700; }
      </style></head><body>
      <div class="brand">NodeMor <span>Academy</span></div>
      <h1>${esc(cls.title)}</h1>
      <p class="meta">${esc(cls.subject)}${cls.gradeLevel ? ' · ' + esc(cls.gradeLevel) : ''}</p>
      <p class="meta">${esc(t('classQr.mentor'))}: <b>${esc(cls.teacherName)}</b></p>
      ${cls.scheduleText ? `<p class="meta">${esc(cls.scheduleText)}</p>` : ''}
      <div class="fee">${esc(fee)}</div>
      <img src="${data}" alt="QR" />
      <p class="scan">${esc(t('classQr.posterScan'))}</p>
      <p class="url">${esc(url)}</p>
      <script>window.onload = () => setTimeout(() => window.print(), 300);<\/script>
      </body></html>`);
    w.document.close();
  };

  return (
    <Panel title={t('classQr.title')}>
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="rounded-2xl border border-slate-200 bg-white p-2"><QrCode value={url} size={170} alt={t('classQr.title')} /></div>
        <p className="text-sm leading-relaxed text-slate-600"><QrIcon className="mr-1.5 inline h-4 w-4 align-[-2px] text-violet-600" />{t('classQr.text')}</p>
        {cls.status !== 'PUBLISHED' && <p className="w-full rounded-xl bg-amber-50 p-2 text-xs text-amber-800">{t('classQr.publishFirst')}</p>}
        <div className="grid w-full grid-cols-2 gap-2">
          <Button size="sm" onClick={download}><Download className="h-4 w-4" />{t('classQr.download')}</Button>
          <Button size="sm" variant="outline" onClick={printPoster}><Printer className="h-4 w-4" />{t('classQr.print')}</Button>
        </div>
      </div>
    </Panel>
  );
}
