/** Same rules as the backend YouTube parser: returns the 11-character video id or null. */
export function youtubeId(input) {
  if (!input) return null;
  const s = input.trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s;
  try {
    const u = new URL(s.startsWith('http') ? s : `https://${s}`);
    const host = u.hostname.toLowerCase();
    let id = null;
    if (host.endsWith('youtu.be')) id = u.pathname.split('/')[1];
    else if (host.endsWith('youtube.com') || host.endsWith('youtube-nocookie.com')) {
      if (u.pathname === '/watch') id = u.searchParams.get('v');
      else {
        const seg = u.pathname.split('/');
        if (['embed', 'shorts', 'live', 'v'].includes(seg[1])) id = seg[2];
      }
    }
    return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

export const youtubeThumb = (id) => (id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null);

let apiPromise = null;
/** Loads the YouTube IFrame Player API once. */
export function loadYouTubeApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (!apiPromise) {
    apiPromise = new Promise((resolve, reject) => {
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => { prev?.(); resolve(window.YT); };
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      tag.async = true;
      tag.onerror = () => { apiPromise = null; reject(new Error('youtube')); };
      document.head.appendChild(tag);
    });
  }
  return apiPromise;
}
