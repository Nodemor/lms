import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import api, { refreshSession, setAccessToken, setSessionExpiredHandler } from '../api/client';
import i18n from '../i18n';

const AuthContext = createContext(null);

export function homePathFor(user) {
  if (!user) return '/login';
  return { SUPER_ADMIN: '/admin', TEACHER: '/teacher', STUDENT: '/student' }[user.role] || '/';
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const qc = useQueryClient();

  const applySession = useCallback((data) => {
    setAccessToken(data.accessToken);
    setUser(data.user);
    if (data.user?.preferredLanguage && data.user.preferredLanguage !== i18n.language) {
      i18n.changeLanguage(data.user.preferredLanguage);
    }
  }, []);

  useEffect(() => {
    setSessionExpiredHandler(() => { setAccessToken(null); setUser(null); qc.clear(); });
    refreshSession().then(applySession).catch(() => {}).finally(() => setReady(true));
  }, [applySession, qc]);

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    applySession(data);
    return data.user;
  }, [applySession]);

  const verifyEmail = useCallback(async (email, code) => {
    const { data } = await api.post('/auth/verify-email', { email, code });
    applySession(data);
    return data.user;
  }, [applySession]);

  const logout = useCallback(async () => {
    try { await api.post('/auth/logout'); } catch { /* ignore */ }
    setAccessToken(null);
    setUser(null);
    qc.clear();
  }, [qc]);

  const changeLanguage = useCallback(async (lng) => {
    await i18n.changeLanguage(lng);
    if (user) {
      try { const { data } = await api.put('/me/language', { language: lng }); setUser(data); } catch { /* keep local choice */ }
    }
  }, [user]);

  const value = useMemo(() => ({ user, ready, login, logout, verifyEmail, setUser, changeLanguage }),
    [user, ready, login, logout, verifyEmail, changeLanguage]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
