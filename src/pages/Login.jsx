import { useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { ArrowRight, Check } from "lucide-react";
import { useAuth } from "../context/auth-state";
import { isConfigured, supabase, configError } from "../lib/supabase";
import { Brand } from "../components/Sidebar";
import { Field } from "../components/Forms";
import Spinner from "../components/Spinner";
export default function Login() {
  const { session, loading, error: authError } = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  if (loading) return <Spinner full />;
  if (session) return <Navigate to={location.state?.from || "/"} replace />;
  async function submit(event) {
    event.preventDefault();
    if (busy || !isConfigured) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;
    } catch (issue) {
      setError(
        issue.message === "Invalid login credentials"
          ? "Email or password was not accepted. Use Forgot password to reset your password."
          : issue.message,
      );
    } finally {
      setBusy(false);
    }
  }
  async function googleLogin() {
    if (busy || !isConfigured) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const { error: issue } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin + "/",
          queryParams: { prompt: "select_account" },
        },
      });
      if (issue) throw issue;
    } catch (issue) {
      setError(issue.message);
    } finally {
      setBusy(false);
    }
  }
  async function resetPassword() {
    if (busy || !isConfigured) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Enter your email address first.");
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const { error: issue } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: window.location.origin + "/reset-password",
      });
      if (issue) throw issue;
      setNotice(
        "If an account exists for this email, you will receive a password reset link. Open it to choose a new password.",
      );
    } catch (issue) {
      setError(issue.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="grid min-h-dvh bg-white lg:grid-cols-2">
      <section className="login-story relative hidden flex-col justify-between overflow-hidden p-10 text-white lg:flex xl:p-14">
        <div className="absolute -bottom-56 -right-56 h-[650px] w-[650px] rounded-full border-[80px] border-white/5" />
        <Brand />
        <div className="relative max-w-md">
          <p className="mb-5 text-xs font-semibold uppercase tracking-[.2em] text-indigo-200">
            LESS BUSYWORK. MORE CONNECTIONS.
          </p>
          <h1 className="text-4xl font-semibold leading-[1.15] tracking-tight xl:text-5xl">
            Great relationships
            <br />
            start with a<br />
            simple follow-up.
          </h1>
          <p className="mt-6 leading-7 text-indigo-100">
            One workspace to organize your leads, keep conversations moving, and see
            what’s working.
          </p>
          <div className="mt-10 flex flex-wrap gap-5 text-xs text-indigo-100">
            {["Organized leads", "Timely follow-ups", "Clear reporting"].map((text) => (
              <span key={text} className="flex items-center gap-2">
                <Check size={16} />
                {text}
              </span>
            ))}
          </div>
        </div>
        <p className="relative text-xs text-indigo-200">
          Your leads. Your next opportunity.
        </p>
      </section>
      <section className="flex items-center justify-center px-5 py-8 sm:px-6 sm:py-12">
        <div className="w-full max-w-sm">
          <div className="mb-7 lg:hidden">
            <Brand />
          </div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-[.15em] text-indigo-600">
            WELCOME BACK
          </p>
          <h2 className="text-3xl font-bold tracking-tight">Sign in to your workspace</h2>
          <p className="mt-3 mb-8 text-sm text-slate-500">
            Pick up where your last conversation left off.
          </p>
          {!isConfigured && (
            <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <p className="font-semibold">Connect your Supabase project</p>
              <p className="mt-2">
                {configError ||
                  "Copy .env.example to .env, add your project base URL and anon key, then restart the development server."}
              </p>
            </div>
          )}
          <button
            type="button"
            className="btn-secondary w-full !py-3"
            disabled={busy || !isConfigured}
            onClick={googleLogin}
          >
            <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.9-1.75 2.98-4.33 2.98-7.36Z"
              />
              <path
                fill="#34A853"
                d="M12 22c2.7 0 4.96-.9 6.62-2.41l-3.24-2.51c-.9.6-2.05.96-3.38.96-2.6 0-4.8-1.76-5.59-4.12H3.07v2.59A10 10 0 0 0 12 22Z"
              />
              <path
                fill="#FBBC05"
                d="M6.41 13.92a6 6 0 0 1 0-3.84V7.49H3.07a10 10 0 0 0 0 9.02l3.34-2.59Z"
              />
              <path
                fill="#EA4335"
                d="M12 5.96c1.47 0 2.79.5 3.82 1.49l2.87-2.87A9.62 9.62 0 0 0 12 2a10 10 0 0 0-8.93 5.49l3.34 2.59C7.2 7.72 9.4 5.96 12 5.96Z"
              />
            </svg>
            Continue with Google
          </button>
          <div className="my-5 flex items-center gap-3 text-xs text-slate-400">
            <span className="h-px flex-1 bg-slate-200" />
            <span>or sign in with email</span>
            <span className="h-px flex-1 bg-slate-200" />
          </div>
          <form onSubmit={submit} aria-busy={busy} className="space-y-5">
            <Field
              label="Email address"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@company.com"
            />
            <Field
              label="Password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Enter your password"
            />
            <label className="flex min-h-6 items-center gap-2 text-xs text-slate-500">
              <input
                type="checkbox"
                checked={showPassword}
                onChange={(event) => setShowPassword(event.target.checked)}
                className="h-4 w-4 accent-indigo-600"
              />
              Show password
            </label>
            {(error || authError) && (
              <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-600">
                {error || authError}
              </p>
            )}
            <button
              className="btn-primary !w-full !py-3"
              disabled={busy || !isConfigured}
            >
              {busy ? (
                "Signing in…"
              ) : (
                <>
                  Sign in <ArrowRight size={17} />
                </>
              )}
            </button>
          </form>
          <button
            type="button"
            className="mt-3 w-full text-sm font-semibold text-indigo-600"
            disabled={busy || !isConfigured}
            onClick={resetPassword}
          >
            Forgot password?
          </button>
          {notice && (
            <p role="status" className="mt-3 text-sm text-emerald-700">
              {notice}
            </p>
          )}
          <p className="mt-7 text-center text-xs leading-5 text-slate-400">
            New here? Continue with Google to enter an empty workspace. Shared landing
            pages appear when your administrator grants access.
          </p>
        </div>
      </section>
    </div>
  );
}
