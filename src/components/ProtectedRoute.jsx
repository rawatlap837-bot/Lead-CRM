import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/auth-state";
import Spinner from "./Spinner";
export default function ProtectedRoute() {
  const { session, loading } = useAuth(),
    location = useLocation();
  if (loading) return <Spinner full />;
  return session ? (
    <Outlet />
  ) : (
    <Navigate to="/login" state={{ from: location.pathname }} replace />
  );
}
