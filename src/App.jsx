import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ToastProvider } from "./components/Toast";
import ProtectedRoute from "./components/ProtectedRoute";
import Sidebar from "./components/Sidebar";
import { lazy, Suspense } from "react";
import Spinner from "./components/Spinner";
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Login = lazy(() => import("./pages/Login"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Leads = lazy(() => import("./pages/Leads"));
const LeadDetail = lazy(() => import("./pages/LeadDetail"));
const FollowUps = lazy(() => import("./pages/FollowUps"));
const Reports = lazy(() => import("./pages/Reports"));
const Integrations = lazy(() => import("./pages/Integrations"));
import ErrorBoundary from "./components/ErrorBoundary";
export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <ToastProvider>
          <AuthProvider>
            <Suspense fallback={<Spinner full />}>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route element={<ProtectedRoute />}>
                  <Route element={<Sidebar />}>
                    <Route index element={<Dashboard />} />
                    <Route path="leads" element={<Leads />} />
                    <Route path="leads/:id" element={<LeadDetail />} />
                    <Route path="followups" element={<FollowUps />} />
                    <Route path="reports" element={<Reports />} />
                    <Route path="integrations" element={<Integrations />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Route>
                </Route>
              </Routes>
            </Suspense>
          </AuthProvider>
        </ToastProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
