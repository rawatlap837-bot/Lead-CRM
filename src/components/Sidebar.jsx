import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  CalendarClock,
  ChartNoAxesCombined,
  LogOut,
  Menu,
  X,
  Layers,
  ArrowUpRight,
  Cable,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/auth-state";
import { useToast } from "../context/toast-state";
import { displayDate, todayIST } from "../lib/dates";
const links = [
  ["/", "Dashboard", LayoutDashboard],
  ["/leads", "Leads", Users],
  ["/followups", "Follow-ups", CalendarClock],
  ["/reports", "Reports", ChartNoAxesCombined],
  ['/integrations', 'Lead connections', Cable],
];
export default function Sidebar() {
  const [open, setOpen] = useState(false),
    [desktop, setDesktop] = useState(
      () =>
        typeof window !== "undefined" &&
        window.matchMedia("(min-width: 1024px)").matches,
    ),
    [busy, setBusy] = useState(false),
    { session } = useAuth(),
    toast = useToast(),
    location = useLocation();
  const drawer = useRef(null),
    menuButton = useRef(null);
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);
  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const changed = () => {
      setDesktop(media.matches);
      if (media.matches) setOpen(false);
    };
    media.addEventListener("change", changed);
    return () => media.removeEventListener("change", changed);
  }, []);
  useEffect(() => {
    if (!open || desktop) return;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const controls = () =>
      [...drawer.current.querySelectorAll("a,button")].filter(
        (el) => !el.disabled,
      );
    controls()[0]?.focus();
    const key = (event) => {
      if (event.key === "Escape") setOpen(false);
      if (event.key === "Tab") {
        const list = controls(),
          first = list[0],
          last = list.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", key);
      menuButton.current?.focus();
    };
  }, [open, desktop]);
  async function logout() {
    setBusy(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      toast(error.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="fixed inset-x-0 top-0 z-30 flex h-16 items-center justify-between border-b bg-white px-5 lg:hidden">
        <Brand />
        <button
          ref={menuButton}
          aria-controls="workspace-navigation"
          aria-label={open ? "Close navigation" : "Open navigation"}
          aria-expanded={open}
          className="flex h-11 w-11 items-center justify-center rounded-lg"
          onClick={() => setOpen(!open)}
        >
          {open ? <X /> : <Menu />}
        </button>
      </div>
      {open && (
        <button
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-30 bg-slate-900/30 lg:hidden"
        />
      )}
      <aside
        ref={drawer}
        id="workspace-navigation"
        aria-label="Workspace navigation"
        role={!desktop && open ? "dialog" : undefined}
        aria-modal={!desktop && open ? true : undefined}
        aria-hidden={!desktop && !open}
        {...(!desktop && !open ? { inert: "" } : {})}
        className={`fixed inset-y-0 left-0 z-40 flex w-[min(18rem,calc(100vw-2rem))] flex-col overflow-y-auto overscroll-contain border-r border-slate-200/70 bg-white p-5 transition-transform lg:w-60 lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="mb-6 mt-1 flex shrink-0 items-center justify-between lg:mb-12 lg:mt-3">
          <Brand />
          <button
            className="flex h-11 w-11 items-center justify-center rounded-lg hover:bg-slate-50 lg:hidden"
            aria-label="Close navigation"
            onClick={() => setOpen(false)}
          >
            <X size={20} />
          </button>
        </div>
        <p className="mb-3 px-3 text-[10px] font-bold tracking-[.16em] text-slate-400">
          MAIN MENU
        </p>
        <nav className="space-y-2">
          {links.map(([to, label, Icon]) => (
            <NavLink
              key={to}
              end={to === "/"}
              to={to}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors ${isActive ? "bg-indigo-50 text-indigo-600" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"}`
              }
            >
              <Icon size={19} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto pt-5">
          <div className="mb-5 rounded-xl border border-indigo-100 bg-indigo-50/70 p-4">
            <span className="mb-2 block text-xs font-bold text-indigo-700">
              Every conversation counts.
            </span>
            <p className="text-xs leading-5 text-indigo-500">
              Keep your next step clear and your leads moving forward.
            </p>
            <NavLink
              to="/followups"
              onClick={() => setOpen(false)}
              className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-indigo-700"
            >
              View follow-ups <ArrowUpRight size={14} />
            </NavLink>
          </div>
          <div className="flex items-center gap-3 border-t pt-5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-600">
              {session?.user.email?.slice(0, 1).toUpperCase() || "U"}
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold">
                {session?.user.email}
              </p>
              <p className="mt-1 text-[10px] text-slate-400">Your workspace</p>
            </div>
          </div>
          <button
            className="mt-4 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-500 hover:bg-slate-50"
            onClick={logout}
            disabled={busy}
          >
            <LogOut size={17} />
            {busy ? "Signing out…" : "Logout"}
          </button>
        </div>
      </aside>
      <div className="min-w-0 pt-16 lg:ml-60 lg:pt-0">
        <header className="hidden h-20 items-center justify-between border-b border-slate-200/70 bg-white/80 px-8 lg:flex">
          <p className="text-sm text-slate-400">
            Workspace <span className="mx-3 text-slate-300">/</span>
            <span className="font-medium text-slate-700">
              {links.find(([path]) => path === location.pathname)?.[1] ||
                "Lead detail"}
            </span>
          </p>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            {displayDate(todayIST())}
            <span className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-semibold">
              IST
            </span>
          </div>
        </header>
        <main className="mx-auto min-w-0 max-w-[1600px] p-4 pb-8 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
export function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <span className="rounded-xl bg-indigo-600 p-2 text-white shadow-sm shadow-indigo-200">
        <Layers size={21} />
      </span>
      <span className="text-xl font-bold tracking-tight">
        leadspace<span className="text-indigo-600">.</span>
      </span>
    </div>
  );
}
