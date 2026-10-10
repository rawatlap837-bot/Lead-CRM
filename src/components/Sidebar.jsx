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
  ArrowUpRight,
  Cable,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/auth-state";
import { useToast } from "../context/toast-state";
import { displayDate, todayIST } from "../lib/dates";
import ConnectionStatus from "./ConnectionStatus";
import ActivityNotifications, { NotificationBell } from "./ActivityNotifications";
import useActivity from "../lib/useActivity";
import { activitySections } from "../lib/activity";
const links = [
  ["/", "Dashboard", LayoutDashboard],
  ["/leads", "Leads", Users],
  ["/followups", "Follow-ups", CalendarClock],
  ["/reports", "Reports", ChartNoAxesCombined],
  ["/integrations", "Lead connections", Cable],
];
export default function Sidebar() {
  const [open, setOpen] = useState(false);
  const [desktop, setDesktop] = useState(
    () =>
      typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches,
  );
  const [busy, setBusy] = useState(false);
  const { session, access } = useAuth();
  const activity = useActivity(session?.user?.id);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationSection, setNotificationSection] = useState("/");
  const toast = useToast();
  const location = useLocation();
  const sectionPath = locationSection(location.pathname);
  const drawer = useRef(null);
  const menuButton = useRef(null);
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
      [...drawer.current.querySelectorAll("a,button")].filter((el) => !el.disabled);
    controls()[0]?.focus();
    const key = (event) => {
      if (event.key === "Escape") setOpen(false);
      if (event.key === "Tab") {
        const list = controls();
        const first = list[0];
        const last = list.at(-1);
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
      <div className="mobile-header fixed inset-x-0 top-0 z-30 flex items-center justify-between border-b border-white/10 bg-slate-950 px-4 text-white lg:hidden">
        <Brand />
        <div className="flex items-center gap-1">
          <NotificationBell
            count={activity.unread.length}
            onClick={() => {
              setNotificationSection("/");
              setNotificationsOpen(true);
            }}
          />
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
        className={`workspace-sidebar fixed inset-y-0 left-0 z-40 flex w-[min(18rem,calc(100vw-1rem))] flex-col overflow-y-auto overscroll-contain border-r p-4 sm:p-5 transition-transform lg:w-64 lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}
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
                `nav-link flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors ${isActive ? "active" : ""}`
              }
            >
              <Icon size={19} />
              {label}
              {activity.counts[to] > 0 && (
                <span
                  className="ml-auto h-2 w-2 shrink-0 rounded-full bg-red-500"
                  aria-label={`${activity.counts[to]} unread updates`}
                />
              )}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto pt-5">
          <div className="sidebar-tip mb-5 rounded-xl border p-4">
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
          <div className="account-divider flex items-center gap-3 border-t pt-5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-600">
              {session?.user.email?.slice(0, 1).toUpperCase() || "U"}
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold">{session?.user.email}</p>
              <p className="mt-1 text-[10px] text-slate-400">
                {access?.is_admin
                  ? "Administrator"
                  : access?.sources?.length
                    ? "Shared page workspace"
                    : "New workspace"}
              </p>
            </div>
          </div>
          <button
            className="logout-button mt-4 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm"
            onClick={logout}
            disabled={busy}
          >
            <LogOut size={17} />
            {busy ? "Signing out…" : "Logout"}
          </button>
        </div>
      </aside>
      <div className="workspace-content min-w-0 lg:ml-64">
        <header className="hidden h-20 items-center justify-between border-b border-slate-200/70 bg-white/80 px-8 lg:flex">
          <p className="text-sm text-slate-400">
            Workspace <span className="mx-3 text-slate-300">/</span>
            <span className="font-medium text-slate-700">
              {links.find(([path]) => path === location.pathname)?.[1] || "Lead detail"}
            </span>
          </p>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            {displayDate(todayIST())}
            <span className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-semibold">
              IST
            </span>
            <NotificationBell
              count={activity.unread.length}
              onClick={() => {
                setNotificationSection("/");
                setNotificationsOpen(true);
              }}
            />
          </div>
        </header>
        <main
          id="main-content"
          className="mx-auto min-w-0 max-w-[1600px] p-4 pb-8 sm:p-6 lg:p-8"
        >
          <ConnectionStatus />
          {activity.counts[sectionPath] > 0 && (
            <div
              role="status"
              className="mb-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-slate-200 pb-2"
            >
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-xs text-slate-500">
                  <span
                    className="h-1.5 w-1.5 shrink-0 rounded-full bg-red-500"
                    aria-hidden="true"
                  />
                  {activity.counts[sectionPath]} unread{" "}
                  {activity.counts[sectionPath] === 1 ? "update" : "updates"} in this
                  section
                </p>
                <p className="mt-1 truncate text-sm font-medium text-slate-800">
                  {
                    activity.events.find(
                      (event) =>
                        !event.read && activitySections(event).includes(sectionPath),
                    )?.message
                  }
                </p>
              </div>
              <button
                className="inline-flex min-h-11 items-center text-xs font-semibold text-slate-700 hover:text-slate-950 focus-visible:outline-red-500"
                onClick={() => {
                  setNotificationSection(sectionPath);
                  setNotificationsOpen(true);
                  activity.markRead(
                    activity.events
                      .filter(
                        (event) =>
                          !event.read && activitySections(event).includes(sectionPath),
                      )
                      .map((event) => event.id),
                  );
                }}
              >
                View updates
              </button>
            </div>
          )}
          <Outlet context={{ activity }} />
        </main>
      </div>
      {notificationsOpen && (
        <ActivityNotifications
          activity={activity}
          initialSection={notificationSection}
          ownSource={access?.personal_source}
          onClose={() => setNotificationsOpen(false)}
        />
      )}
    </div>
  );
}
function locationSection(pathname) {
  if (pathname.startsWith("/leads")) return "/leads";
  return pathname;
}
export function Brand() {
  return (
    <div className="flex min-w-0 items-center gap-2 sm:gap-2.5">
      <span className="flex h-10 w-12 shrink-0 items-center justify-center overflow-hidden sm:h-12 sm:w-14">
        <img
          src="/cc.webp"
          alt=""
          className="h-12 w-12 max-w-none shrink-0 scale-110 object-contain sm:h-14 sm:w-14"
        />
      </span>
      <span className="whitespace-nowrap text-base font-bold tracking-tight sm:text-lg">
        Creative crew
      </span>
    </div>
  );
}
