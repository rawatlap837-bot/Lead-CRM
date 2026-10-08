import { useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { ArrowRight, Check, Layers } from "lucide-react";
import { useAuth } from "../context/auth-state";
import { isConfigured, supabase, configError } from "../lib/supabase";
import { Brand } from "../components/Sidebar";
import { Field } from "../components/Forms";
import Spinner from "../components/Spinner";
export default function Login() {
  const { session, loading, error: authError } = useAuth(),
    location = useLocation(),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [notice,setNotice]=useState("");
  if (loading) return <Spinner full />;
  if (session) return <Navigate to={location.state?.from || "/"} replace />;
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;
    } catch (issue) {
      setError(issue.message === "Invalid login credentials" ? "Email or password was not accepted. Use Forgot password or email yourself a sign-in link. Your administrator role does not create a password." : issue.message);
    } finally {
      setBusy(false);
    }
  }
  async function emailLogin() {
    if(busy) return;
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {setError("Enter your email address first."); return;}
    setBusy(true); setError(""); setNotice("");
    try {
      const {error:issue}=await supabase.auth.signInWithOtp({email:email.trim(),options:{shouldCreateUser:false,emailRedirectTo:window.location.origin+'/'}});
      if(issue) throw issue;
      setNotice("Check your email for a sign-in link. Use the email your administrator invited.");
    } catch(issue) {setError(issue.message);} finally {setBusy(false);}
  }
  async function resetPassword() {
    if(busy || !isConfigured) return;
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {setError("Enter your email address first."); return;}
    setBusy(true); setError(""); setNotice("");
    try {
      const {error:issue}=await supabase.auth.resetPasswordForEmail(email.trim(),{redirectTo:window.location.origin+'/reset-password'});
      if(issue) throw issue;
      setNotice("If an account exists for this email, you will receive a password reset link. Open it to choose a new password.");
    } catch(issue) {setError(issue.message);} finally {setBusy(false);}
  }
  return (
    <div className="grid min-h-dvh bg-white lg:grid-cols-2">
      <section className="relative hidden flex-col justify-between overflow-hidden bg-indigo-600 p-14 text-white lg:flex">
        <div className="absolute -bottom-56 -right-56 h-[650px] w-[650px] rounded-full border-[80px] border-white/5" />
        <div className="flex items-center gap-3 text-xl font-bold">
          <Layers /> leadspace.
        </div>
        <div className="relative max-w-md">
          <p className="mb-5 text-xs font-semibold uppercase tracking-[.2em] text-indigo-200">
            LESS BUSYWORK. MORE CONNECTIONS.
          </p>
          <h1 className="text-5xl font-semibold leading-[1.15] tracking-tight">
            Great relationships
            <br />
            start with a<br />
            simple follow-up.
          </h1>
          <p className="mt-6 leading-7 text-indigo-100">
            One workspace to organize your leads, keep conversations moving, and
            see what’s working.
          </p>
          <div className="mt-10 flex flex-wrap gap-5 text-xs text-indigo-100">
            {["Organized leads", "Timely follow-ups", "Clear reporting"].map(
              (text) => (
                <span key={text} className="flex items-center gap-2">
                  <Check size={16} />
                  {text}
                </span>
              ),
            )}
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
          <h2 className="text-3xl font-bold tracking-tight">
            Sign in to your workspace
          </h2>
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
          <form onSubmit={submit} className="space-y-5">
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
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Enter your password"
            />
            {(error || authError) && (
              <p
                role="alert"
                className="rounded-lg bg-rose-50 p-3 text-sm text-rose-600"
              >
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
          <button type="button" className="btn-secondary mt-3 w-full" disabled={busy || !isConfigured} onClick={emailLogin}>Email me a sign-in link</button>
          <button type="button" className="mt-3 w-full text-sm font-semibold text-indigo-600" disabled={busy || !isConfigured} onClick={resetPassword}>Forgot password?</button>
          {notice && <p role="status" className="mt-3 text-sm text-emerald-700">{notice}</p>}
          <p className="mt-7 text-center text-xs leading-5 text-slate-400">
            Use the email your administrator invited. Your access is limited to the landing pages shared with you.
          </p>
        </div>
      </section>
    </div>
  );
}
