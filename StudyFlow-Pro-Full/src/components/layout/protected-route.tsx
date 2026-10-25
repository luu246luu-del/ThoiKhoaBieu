import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores';
import { LoadingScreen } from './loading-screen';

export function ProtectedRoute() {
  const { user, isInitialized, isLoading } = useAuthStore();
  const location = useLocation();

  if (!isInitialized || isLoading) {
    return <LoadingScreen message="Đang kiểm tra phiên làm việc..." />;
  }

  if (!user) {
    // Redirect to login page and remember where the user tried to go
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
