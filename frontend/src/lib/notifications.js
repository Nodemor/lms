import i18n from '../i18n';

/** Notifications store only a type + parameters; the sentence is built in the reader's current language. */
export function notificationText(n) {
  const key = `notifications.types.${n.type}`;
  if (!i18n.exists(key)) return i18n.t('notifications.types.GENERIC');
  return i18n.t(key, { ...(n.params || {}) });
}
