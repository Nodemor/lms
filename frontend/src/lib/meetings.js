/** Recognises the meeting service from a link (for labels/icons only; the server validates links). */
export function meetingProvider(url) {
  if (!url) return null;
  try {
    const host = new URL(url.trim().startsWith('http') ? url.trim() : `https://${url.trim()}`).hostname.toLowerCase();
    if (host.endsWith('zoom.us') || host.endsWith('zoom.com')) return 'ZOOM';
    if (host === 'meet.google.com') return 'GOOGLE_MEET';
    if (host.endsWith('teams.microsoft.com') || host.endsWith('teams.live.com')) return 'TEAMS';
    return 'OTHER';
  } catch {
    return null;
  }
}

export function isValidMeetingUrl(url) {
  if (!url?.trim()) return false;
  try {
    const u = new URL(url.trim().startsWith('http') ? url.trim() : `https://${url.trim()}`);
    return u.protocol === 'https:' && u.hostname.includes('.');
  } catch {
    return false;
  }
}

export const PROVIDER_LABEL = { ZOOM: 'Zoom', GOOGLE_MEET: 'Google Meet', TEAMS: 'Microsoft Teams' };

export const isInPerson = (s) => s.inPerson || s.meetingProvider === 'IN_PERSON';

/** A student may open an external meeting 15 minutes early, or any time while it is live. */
export function canJoin(session, now = Date.now()) {
  if (isInPerson(session)) return false;
  if (session.status === 'LIVE') return true;
  return session.status === 'SCHEDULED' && session.external && session.joinOpensAt && new Date(session.joinOpensAt).getTime() <= now;
}
