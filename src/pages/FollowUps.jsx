import { useState } from "react";
import { Link } from "react-router-dom";
import { Phone, MessageCircle, Check, CalendarClock } from "lucide-react";
import {
  fetchFollowups,
  followupGroup,
  markDone,
  rescheduleFollowup,
} from "../lib/leads";
import { displayDate, todayIST } from "../lib/dates";
import useLoad from "../lib/useLoad";
import { useToast } from "../context/toast-state";
import { FollowupForm } from "../components/Forms";
import PageHeader from "../components/PageHeader";
import EmptyState from "../components/EmptyState";
import Spinner from "../components/Spinner";
import Modal from "../components/Modal";
import LoadError from "../components/LoadError";
import useAutoRefresh from "../lib/useAutoRefresh";
const tabs = [
  ["overdue", "Overdue"],
  ["today", "Due today"],
  ["upcoming", "Upcoming"],
  ["done", "Done"],
];
export default function FollowUps() {
  const today = todayIST();
  const [tab, setTab] = useState("today");
  const [reschedule, setReschedule] = useState(null);
  const [busy, setBusy] = useState(null);
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const { data, loading, error, reload } = useLoad(() => fetchFollowups(), [today]);
  useAutoRefresh(reload);
  async function done(id) {
    setBusy(id);
    try {
      await markDone(id);
      toast("Follow-up completed.", "success");
      await reload();
    } catch (issue) {
      toast(issue.message);
    } finally {
      setBusy(null);
    }
  }
  async function save(values) {
    try {
      await rescheduleFollowup(reschedule, values);
      toast("Follow-up rescheduled.", "success");
      setReschedule(null);
    } catch (issue) {
      toast(issue.message);
      throw issue;
    } finally {
      await reload();
    }
  }
  const items = (data || []).filter((item) => followupGroup(item, today) === tab);
  const unscheduled = (data || []).filter(
    (item) => followupGroup(item, today) === "unscheduled",
  );
  if (tab === "done") items.sort((a, b) => b.created_at.localeCompare(a.created_at));
  return (
    <>
      <PageHeader
        title="Follow-ups"
        description="The right conversation, at the right time."
      />
      {unscheduled.length > 0 && (
        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          {unscheduled.length} pending follow-up(s) have no reconnect date. Open the lead
          to add a scheduled follow-up:{" "}
          {unscheduled.map((item, i) => (
            <span key={item.id}>
              {i > 0 && ", "}
              <Link className="underline" to={`/leads/${item.lead_id}`}>
                {item.leads?.name || "Lead"}
              </Link>
            </span>
          ))}
        </div>
      )}
      <section className="card">
        <div
          className="grid grid-cols-2 border-b border-slate-100 p-2 sm:flex sm:px-5"
          role="tablist"
          aria-label="Follow-up status"
        >
          {tabs.map(([key, label]) => (
            <button
              key={key}
              role="tab"
              aria-selected={tab === key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-2 whitespace-nowrap justify-center border-b-2 px-2 py-3 text-xs sm:px-4 sm:py-5 sm:text-sm font-medium ${tab === key ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-800"}`}
            >
              {label}
              <span
                className={`rounded-md px-1.5 py-0.5 text-[10px] ${key === tab ? "bg-indigo-50" : "bg-slate-100"}`}
              >
                {data
                  ? data.filter((item) => followupGroup(item, today) === key).length
                  : "—"}
              </span>
            </button>
          ))}
        </div>
        {loading ? (
          <Spinner />
        ) : error ? (
          <LoadError error={error} reload={reload} />
        ) : items.length ? (
          <div className="overflow-x-auto">
            <table className="responsive-table">
              <thead>
                <tr>
                  {[
                    "Lead",
                    "Conversation",
                    "Connected on",
                    "Reconnect on",
                    "Actions",
                  ].map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td data-label="Lead">
                      <Link
                        className="font-semibold hover:text-indigo-600"
                        to={`/leads/${item.lead_id}`}
                      >
                        {item.leads?.name || "Lead unavailable"}
                      </Link>
                      <p className="mt-1 text-xs text-slate-400">
                        {item.leads?.phone || "No phone"}
                      </p>
                    </td>
                    <td
                      data-label="Conversation"
                      className="min-w-64 max-w-sm whitespace-pre-wrap break-words leading-6"
                    >
                      {item.description}
                    </td>
                    <td
                      data-label="Connected on"
                      className="whitespace-nowrap text-slate-500"
                    >
                      {displayDate(item.connected_on)}
                    </td>
                    <td
                      data-label="Reconnect on"
                      className={`whitespace-nowrap font-medium ${tab === "overdue" ? "text-rose-600" : "text-slate-500"}`}
                    >
                      {displayDate(item.reconnect_on)}
                    </td>
                    <td data-label="Actions">
                      <div className="flex flex-wrap gap-2">
                        {item.leads?.phone && (
                          <>
                            <a
                              href={`tel:${item.leads.phone}`}
                              className="btn-secondary !px-2.5 !py-2 !text-xs"
                            >
                              <Phone size={13} />
                              Call
                            </a>
                            <a
                              href={`https://wa.me/${item.leads.phone.replace(/\D/g, "")}`}
                              target="_blank"
                              rel="noreferrer"
                              className="btn-secondary !px-2.5 !py-2 !text-xs !text-emerald-700"
                            >
                              <MessageCircle size={13} />
                              WhatsApp
                            </a>
                          </>
                        )}
                        {tab !== "done" && (
                          <>
                            <button
                              onClick={() => done(item.id)}
                              disabled={busy === item.id}
                              className="btn-secondary !px-2.5 !py-2 !text-xs !text-indigo-600"
                            >
                              <Check size={13} />
                              {busy === item.id ? "Saving…" : "Mark done"}
                            </button>
                            <button
                              disabled={busy === item.id}
                              onClick={() => setReschedule(item)}
                              className="btn-secondary !px-2.5 !py-2 !text-xs"
                            >
                              <CalendarClock size={13} />
                              Reschedule
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title={
              tab === "overdue"
                ? "No overdue follow-ups"
                : tab === "done"
                  ? "No completed follow-ups yet"
                  : "Your calendar is clear"
            }
            description={
              tab === "done"
                ? "Completed conversations will appear here."
                : "Follow-ups in this period will appear here. Add one from a lead’s detail page."
            }
          />
        )}
      </section>
      {reschedule && (
        <Modal
          title={`Reschedule · ${reschedule.leads?.name || "Lead"}`}
          onClose={() => setReschedule(null)}
          busy={saving}
        >
          <p className="mb-5 text-sm text-slate-500">
            Create a new follow-up and mark the previous one done. Your conversation
            history stays intact.
          </p>
          <FollowupForm
            reschedule
            onBusyChange={setSaving}
            onSave={save}
            onCancel={() => setReschedule(null)}
          />
        </Modal>
      )}
    </>
  );
}
