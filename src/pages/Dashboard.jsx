import { sourceName } from "../lib/personalWorkspace";
import { Link } from "react-router-dom";
import {
  Users,
  UserPlus,
  CalendarClock,
  AlertCircle,
  Trophy,
  ArrowRight,
  Plus,
} from "lucide-react";
import useLoad from "../lib/useLoad";
import { fetchDashboard } from "../lib/leads";
import { displayDate, todayIST } from "../lib/dates";
import PageHeader from "../components/PageHeader";
import StatCard from "../components/StatCard";
import StatusBadge from "../components/StatusBadge";
import EmptyState from "../components/EmptyState";
import Spinner from "../components/Spinner";
import LoadError from "../components/LoadError";
import Avatar from "../components/Avatar";
import useAutoRefresh from "../lib/useAutoRefresh";
import { useAuth } from "../context/auth-state";
export default function Dashboard() {
  const { access, session } = useAuth();
  const canCreate = Boolean(access?.is_admin || access?.sources?.length);
  const name = session?.user?.user_metadata?.full_name?.split(" ")[0];
  const today = todayIST();
  const { data, loading, error, reload } = useLoad(fetchDashboard, [today]);
  useAutoRefresh(reload);
  return (
    <>
      <PageHeader
        eyebrow="YOUR DAILY OVERVIEW"
        title="Dashboard"
        description="Your leads and next conversations at a glance."
      >
        {canCreate && (
          <Link className="btn-primary" to="/leads?add=1">
            <Plus size={17} />
            Add lead
          </Link>
        )}
      </PageHeader>
      {loading ? (
        <Spinner />
      ) : error ? (
        <LoadError error={error} reload={reload} />
      ) : (
        <>
          <section className="dashboard-hero mb-6 flex flex-wrap items-center justify-between gap-6 rounded-2xl p-6 text-white sm:p-8">
            <div className="max-w-xl">
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-indigo-200">
                Creative crew / Overview
              </p>
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                {canCreate
                  ? `Make your next move${name ? `, ${name}` : ""}.`
                  : "Welcome to your workspace."}
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                {canCreate
                  ? `${data.due} follow-ups due today. Keep your pipeline moving, one conversation at a time.`
                  : "Your workspace is ready and starts empty. Landing pages and leads will appear when your administrator shares access with your email."}
              </p>
            </div>
            <Link
              className="btn-secondary !border-white/20 !bg-white/10 !text-white hover:!bg-white/20"
              to={canCreate ? "/followups" : "/integrations"}
            >
              {canCreate ? "Plan your follow-ups" : "View my landing pages"}{" "}
              <ArrowRight size={16} />
            </Link>
          </section>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5 sm:gap-4">
            {[
              ["Total leads", data.total, Users, "indigo", "All your opportunities"],
              ["New leads today", data.newToday, UserPlus, "blue", "Added today · IST"],
              [
                "Follow-ups due today",
                data.due,
                CalendarClock,
                "amber",
                "Keep the conversation going",
              ],
              [
                "Overdue follow-ups",
                data.overdue,
                AlertCircle,
                "rose",
                "Ready for your attention",
              ],
              [
                "Converted leads",
                data.converted,
                Trophy,
                "emerald",
                "Relationships that paid off",
              ],
            ].map(([label, value, icon, color, hint]) => (
              <StatCard key={label} {...{ label, value, icon, color, hint }} />
            ))}
          </div>
          <div className="mt-7 grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
            <section className="card">
              <SectionTitle
                title="Today’s follow-ups"
                subtitle={displayDate(today)}
                to="/followups"
              />
              {data.dueList.length ? (
                <div className="divide-y divide-slate-100">
                  {data.dueList.map((item) => (
                    <Link
                      className="flex items-start gap-3 px-4 py-4 sm:px-6 sm:py-5 hover:bg-slate-50"
                      key={item.id}
                      to={`/leads/${item.lead_id}`}
                    >
                      <Avatar name={item.leads?.name} />
                      <div className="min-w-0 flex-1">
                        <p className="break-words text-sm font-semibold">
                          {item.leads?.name || "Lead unavailable"}
                        </p>
                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                          {item.description}
                        </p>
                        <p className="mt-2 text-xs text-slate-400">
                          {item.leads?.phone || "No phone"}
                        </p>
                      </div>
                      <span className="shrink-0 whitespace-nowrap rounded-md bg-amber-50 px-2 py-1 text-[10px] font-medium text-amber-700">
                        Due today
                      </span>
                    </Link>
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="You’re all caught up"
                  description="No follow-ups scheduled for today. A clear calendar, a fresh opportunity."
                />
              )}
            </section>
            <section className="card">
              <SectionTitle
                title="Recent leads"
                subtitle="Your latest opportunities"
                to="/leads"
              />
              {data.recent.length ? (
                <div className="divide-y divide-slate-100">
                  {data.recent.map((lead) => (
                    <Link
                      className="flex items-center gap-3 px-4 py-4 sm:px-6 sm:py-5 hover:bg-slate-50"
                      key={lead.id}
                      to={`/leads/${lead.id}`}
                    >
                      <Avatar name={lead.name} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{lead.name}</p>
                        <p className="mt-1 text-xs text-slate-400">
                          {sourceName(lead.source, {}, access?.personal_source)} ·{" "}
                          {displayDate(lead.created_at)}
                        </p>
                      </div>
                      <StatusBadge status={lead.status} />
                    </Link>
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="Meet your next opportunity"
                  description={
                    canCreate
                      ? "Add your first lead to start building stronger relationships."
                      : "Leads will appear here once a landing page is shared with you."
                  }
                  action={
                    canCreate && (
                      <Link className="btn-primary" to="/leads?add=1">
                        Add your first lead
                      </Link>
                    )
                  }
                />
              )}
            </section>
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-indigo-100 bg-indigo-50/60 px-4 py-4 sm:px-6 sm:py-5">
            <div>
              <p className="text-sm font-semibold text-indigo-900">
                See the bigger picture.
              </p>
              <p className="mt-1 text-xs text-indigo-500">
                Explore your lead activity and export reports for any period.
              </p>
            </div>
            <Link
              className="flex items-center gap-2 text-sm font-semibold text-indigo-600"
              to="/reports"
            >
              Explore reports <ArrowRight size={16} />
            </Link>
          </div>
        </>
      )}
    </>
  );
}
function SectionTitle({ title, subtitle, to }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 p-4 sm:p-6">
      <div className="min-w-0">
        <h2 className="font-semibold">{title}</h2>
        <p className="mt-1 text-xs text-slate-400">{subtitle}</p>
      </div>
      <Link
        to={to}
        className="flex min-h-11 shrink-0 items-center gap-1 text-xs font-semibold text-indigo-600"
      >
        View all <ArrowRight size={14} />
      </Link>
    </div>
  );
}
