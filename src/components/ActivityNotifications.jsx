import { Bell, ArrowUpRight, CheckCheck } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import Modal from "./Modal";
import { activityDestination, activitySections } from "../lib/activity";
import useLoad from "../lib/useLoad";
import { fetchPageNames } from "../lib/pageNames";
import { sourceName } from "../lib/personalWorkspace";

export function NotificationBell({ count, onClick }) {
  return (
    <button
      type="button"
      className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
      aria-label={`Notifications${count ? `, ${count} unread` : ""}`}
      onClick={onClick}
    >
      <Bell size={20} />
      {count > 0 && (
        <span
          aria-hidden="true"
          className="absolute right-0 top-0 rounded-full bg-red-600 px-1.5 text-[10px] font-bold leading-5 text-white"
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </button>
  );
}

export default function ActivityNotifications({
  activity,
  ownSource,
  onClose,
  initialSection = "/",
}) {
  const [section, setSection] = useState(initialSection);
  const events = activity.events.filter((event) =>
    activitySections(event).includes(section),
  );
  const unread = events.filter((event) => !event.read);
  const [view, setView] = useState(() => (unread.length ? "unread" : "all"));
  const { data: pageNames } = useLoad(fetchPageNames, []);
  const visibleEvents = (view === "unread" ? unread : events)
    .slice()
    .sort(
      (a, b) =>
        Number(a.read) - Number(b.read) ||
        new Date(b.created_at) - new Date(a.created_at),
    );
  return (
    <Modal title="Notifications" onClose={onClose} busy={activity.saving}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-slate-500">{unread.length} unread</p>
        {section === "/" && (
          <button
            className="inline-flex min-h-11 items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-950 disabled:opacity-40"
            disabled={!unread.length || activity.saving}
            onClick={() => activity.markRead(unread.map((event) => event.id))}
          >
            <CheckCheck size={16} />
            Mark all read
          </button>
        )}
      </div>
      <div
        className="mb-3 flex gap-1 rounded-lg bg-slate-100 p-1"
        aria-label="Notification view"
      >
        {[
          ["unread", `Unread (${unread.length})`],
          ["all", "All activity"],
        ].map(([value, label]) => (
          <button
            key={value}
            aria-pressed={view === value}
            onClick={() => setView(value)}
            className={`min-h-11 flex-1 rounded-md px-3 text-sm font-semibold ${view === value ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"}`}
          >
            {label}
          </button>
        ))}
      </div>
      <label className="field mb-4">
        Filter updates
        <select
          className="input"
          value={section}
          onChange={(event) => {
            setSection(event.target.value);
          }}
        >
          {[
            ["/", "All sections"],
            ["/leads", "Leads"],
            ["/followups", "Follow-ups"],
            ["/reports", "Reports"],
            ["/integrations", "Lead connections"],
          ].map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      {activity.error && (
        <div
          role="alert"
          className="mb-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900"
        >
          {activity.error}
          <button
            className="mt-2 block font-semibold underline"
            onClick={activity.refresh}
          >
            Try again
          </button>
        </div>
      )}
      {activity.loading ? (
        <p role="status">Loading updates…</p>
      ) : !visibleEvents.length && !activity.error ? (
        <div className="py-10 text-center">
          <Bell className="mx-auto mb-3 text-red-500" />
          <p className="font-semibold">You're all caught up</p>
          <p className="mt-2 text-sm text-slate-500">
            {view === "unread" && events.length
              ? "Select All activity to see read updates."
              : "New CRM activity will appear here."}
          </p>
        </div>
      ) : null}
      <ul className="divide-y divide-slate-100">
        {visibleEvents.map((event) => (
          <li
            key={event.id}
            className={`rounded-lg p-3 ${event.read ? "" : "bg-red-50/40"}`}
          >
            <div className="flex items-start justify-between gap-3">
              <p className="break-words text-sm font-semibold">{event.message}</p>
              {!event.read && (
                <span className="shrink-0 rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                  New
                </span>
              )}
            </div>
            <p className="mt-1 break-words text-xs text-slate-500">
              {pageNames?.[event.source] ||
                (event.source.startsWith("Section / ")
                  ? "Custom section"
                  : sourceName(event.source, {}, ownSource))}
            </p>
            <time
              className="mt-2 block text-xs text-slate-400"
              dateTime={event.created_at}
            >
              {new Date(event.created_at).toLocaleString("en-IN", {
                timeZone: "Asia/Kolkata",
                dateStyle: "medium",
                timeStyle: "short",
              })}{" "}
              IST
            </time>
            <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
              <Link
                className="inline-flex min-h-11 items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-950"
                to={activityDestination(event)}
                onClick={() => {
                  activity.markRead([event.id]);
                  onClose();
                }}
              >
                {event.entity_id
                  ? "Open lead"
                  : event.section === "integrations"
                    ? "Open connection"
                    : "Open section"}{" "}
                <ArrowUpRight size={15} />
              </Link>
              {!event.read && (
                <button
                  className="inline-flex min-h-11 items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-950 disabled:opacity-40"
                  disabled={activity.saving}
                  onClick={() => activity.markRead([event.id])}
                >
                  Mark read
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </Modal>
  );
}
