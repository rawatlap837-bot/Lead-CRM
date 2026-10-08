import { supabase } from '../lib/supabase';
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/auth-state";
import Spinner from "./Spinner";
export default function ProtectedRoute() {
  const { session, loading, access, accessLoading, accessError } = useAuth(),
    location = useLocation();
  if (loading || (session && accessLoading)) return <Spinner full />;
  if(session && (accessError || (access && !access.is_admin && !access.sources?.length))) {
    return <div className="mx-auto max-w-lg p-8"><h1 className="text-xl font-bold">Workspace access required</h1>
    <p className="mt-3 text-sm text-slate-600">{accessError || 'No landing pages are shared with your email yet. Ask your administrator for an invitation.'}</p>
    <button className="btn-secondary mt-5" onClick={()=>supabase.auth.signOut()}>Sign out</button></div>;
  }
  return session ? (
    <Outlet />
  ) : (
    <Navigate to="/login" state={{ from: location.pathname }} replace />
  );
}
