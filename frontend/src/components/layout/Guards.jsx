import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { PageLoader } from '../ui';
import { useAuth, homePathFor } from '../../context/AuthContext';

export function RequireAuth({ roles }) {
  const { user, ready } = useAuth();
  const loc = useLocation();
  if (!ready) return <PageLoader />;
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(loc.pathname + loc.search)}`} replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to={homePathFor(user)} replace />;
  return <Outlet />;
}

export function GuestOnly() {
  const { user, ready } = useAuth();
  if (!ready) return <PageLoader />;
  if (user) return <Navigate to={homePathFor(user)} replace />;
  return <Outlet />;
}

export function HomeRedirect() {
  const { user, ready } = useAuth();
  if (!ready) return <PageLoader />;
  return <Navigate to={homePathFor(user)} replace />;
}
