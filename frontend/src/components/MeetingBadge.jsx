import { useTranslation } from 'react-i18next';
import { MapPin, Video } from 'lucide-react';
import { Badge } from './ui';
import { PROVIDER_LABEL, isInPerson } from '../lib/meetings';

export default function MeetingBadge({ session }) {
  const { t } = useTranslation();
  if (isInPerson(session)) return <Badge tone="amber"><MapPin className="h-3 w-3" />{t('live.inPerson')}</Badge>;
  if (!session.external) return <Badge tone="violet"><Video className="h-3 w-3" />{t('live.builtIn')}</Badge>;
  return <Badge tone="blue"><Video className="h-3 w-3" />{PROVIDER_LABEL[session.meetingProvider] || t('live.meetingLink')}</Badge>;
}
