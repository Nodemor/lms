import { useTranslation } from 'react-i18next';
import { Mail, MessageCircle } from 'lucide-react';
import clsx from 'clsx';
import { prettyPhone, useContact, whatsappLink } from '../lib/contact';

/** WhatsApp + email buttons. `message` pre-fills the WhatsApp chat. */
export default function ContactButtons({ message, className, compact }) {
  const { t } = useTranslation();
  const c = useContact();
  return (
    <div className={clsx('flex flex-wrap gap-2', className)}>
      <a href={whatsappLink(c.whatsapp, message)} target="_blank" rel="noopener noreferrer"
        className="btn h-11 bg-[#25D366] px-5 text-white hover:bg-[#1ebe5a]">
        <MessageCircle className="h-5 w-5" />{compact ? t('contact.whatsapp') : t('contact.whatsappNumber', { number: prettyPhone(c.whatsapp) })}
      </a>
      <a href={`mailto:${c.supportEmail}`} className="btn-outline h-11 px-5"><Mail className="h-5 w-5" />{compact ? t('contact.email') : c.supportEmail}</a>
    </div>
  );
}
