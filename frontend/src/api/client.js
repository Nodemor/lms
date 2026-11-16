import axios from 'axios';
import i18n from '../i18n';

let accessToken = null;
let onSessionExpired = () => {};
let refreshPromise = null;

export const setAccessToken = (t) => { accessToken = t; };
export const getAccessToken = () => accessToken;
export const setSessionExpiredHandler = (fn) => { onSessionExpired = fn; };

const api = axios.create({ baseURL: '/api', withCredentials: true, timeout: 30000 });

api.interceptors.request.use((config) => {
  config.headers['Accept-Language'] = i18n.language || 'en';
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

/** One shared refresh call even if many requests fail at the same moment. */
export function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = axios
      .post('/api/auth/refresh', null, { withCredentials: true, headers: { 'Accept-Language': i18n.language } })
      .then((r) => { accessToken = r.data.accessToken; return r.data; })
      .finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
}

api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;
    if (status === 401 && original && !original._retried && !original.url?.startsWith('/auth/')) {
      original._retried = true;
      try {
        await refreshSession();
        original.headers.Authorization = `Bearer ${accessToken}`;
        return api(original);
      } catch {
        accessToken = null;
        onSessionExpired();
      }
    }
    return Promise.reject(error);
  },
);

/** Turns any API/network error into a translated, human message. */
export function errorMessage(error) {
  if (!error?.response) return i18n.t('errors.network');
  const data = error.response.data || {};
  const key = data.code ? data.code.replace(/^error\./, 'errors.') : null;
  if (key && i18n.exists(key)) return i18n.t(key);
  return data.message || i18n.t('errors.generic');
}

export function fieldErrors(error) {
  return error?.response?.data?.fieldErrors || {};
}

/**
 * Two-step upload: ask the API for a signed URL (checks permissions, type, size and plan quota),
 * then upload straight to storage with progress.
 */
export async function uploadFile(file, purpose, classId, onProgress) {
  const { data: ticket } = await api.post('/uploads/presign', { purpose, classId, fileName: file.name, size: file.size });
  await new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(ticket.method || 'PUT', ticket.url);
    Object.entries(ticket.headers || {}).forEach(([k, v]) => xhr.setRequestHeader(k, v));
    xhr.upload.onprogress = (e) => { if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100)); };
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300
      ? resolve()
      : reject(Object.assign(new Error('upload'), { response: { status: xhr.status, data: safeJson(xhr.responseText) } })));
    xhr.onerror = () => reject(new Error('network'));
    xhr.send(file);
  });
  return { key: ticket.key, fileName: file.name, size: file.size };
}

function safeJson(t) { try { return JSON.parse(t); } catch { return {}; } }

/** Opens a signed file URL (preview in a new tab, or download). */
export async function openSignedUrl(path, download = false) {
  const win = download ? null : window.open('', '_blank');
  try {
    const { data } = await api.get(path, { params: download ? { download: true } : undefined });
    if (download) {
      const a = document.createElement('a');
      a.href = data.url; a.rel = 'noopener'; document.body.appendChild(a); a.click(); a.remove();
    } else if (win) {
      win.opener = null; win.location.href = data.url;
    }
  } catch (e) {
    if (win) win.close();
    throw e;
  }
}

export default api;
