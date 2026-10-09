import { sourceName } from "../lib/personalWorkspace";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Phone,
  Mail,
  MessageCircle,
  Pencil,
  Trash2,
  Check,
  CalendarDays,
} from "lucide-react";
import {
  fetchLead,
  fetchFollowups,
  saveLead,
  deleteLead,
  changeStatus,
  addFollowup,
  markDone,
} from "../lib/leads";
import { normalizeAnswers } from "../lib/answers";
import { displayDate } from "../lib/dates";
import useLoad from "../lib/useLoad";
import { useToast } from "../context/toast-state";
import { LeadForm, FollowupForm, StatusSelect } from "../components/Forms";
import PageHeader from "../components/PageHeader";
import Modal from "../components/Modal";
import StatusBadge from "../components/StatusBadge";
import Spinner from "../components/Spinner";
import EmptyState from "../components/EmptyState";
import LoadError from "../components/LoadError";
import Avatar from "../components/Avatar";
import useAutoRefresh from "../lib/useAutoRefresh";
export default function LeadDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [edit, setEdit] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(null);
  const [saving, setSaving] = useState(false);
  const { data, loading, error, reload } = useLoad(async () => {
    const [lead, history] = await Promise.all([fetchLead(id), fetchFollowups(id)]);
    return { lead, history };
  }, [id]);
  useAutoRefresh(reload);
  async function update(values) {
    try {
      await saveLead(values, id);
      toast("Lead updated.", "success");
      setEdit(false);
      await reload();
    } catch (issue) {
      toast(issue.message);
      throw issue;
    }
  }
  async function action(key, operation) {
    setBusy(key);
    try {
      await operation();
      toast("Saved successfully.", "success");
      await reload();
    } catch (issue) {
      toast(issue.message);
    } finally {
      setBusy(null);
    }
  }
  async function add(values) {
    try {
      await addFollowup({ ...values, lead_id: id });
      toast("Follow-up saved.", "success");
    } catch (issue) {
      toast(issue.message);
      throw issue;
    } finally {
      await reload();
    }
  }
  async function remove() {
    setBusy("delete");
    try {
      await deleteLead(id);
      toast("Lead deleted.", "success");
      navigate("/leads");
    } catch (issue) {
      toast(issue.message);
    } finally {
      setBusy(null);
    }
  }
  if (loading && !data) return <Spinner full />;
  if (error) return <LoadError error={error} reload={reload} />;
  if (!data) return null;
  const { lead, history } = data;
  const answers = normalizeAnswers(lead.answers);
  return (
    <>
      <Link
        className="mb-6 inline-flex items-center gap-2 text-xs font-medium text-slate-500 hover:text-indigo-600"
        to="/leads"
      >
        <ArrowLeft size={15} />
        Back to leads
      </Link>
      <PageHeader
        title="Lead detail"
        description="The full conversation, and what comes next."
      >
        <button className="btn-secondary" onClick={() => setEdit(true)}>
          <Pencil size={15} />
          Edit lead
        </button>
        <button className="btn-secondary !text-rose-600" onClick={() => setConfirm(true)}>
          <Trash2 size={15} />
          Delete
        </button>
      </PageHeader>
      <section className="card mb-6 p-4 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <Avatar name={lead.name} />
            <div className="min-w-0">
              <h2 className="break-words text-xl font-bold">{lead.name}</h2>
              <p className="mt-1 text-xs text-slate-400">
                Added {displayDate(lead.created_at)} · {sourceName(lead.source)}
              </p>
            </div>
          </div>
          <StatusSelect
            value={lead.status}
            disabled={busy === "status"}
            onChange={(value) => action("status", () => changeStatus(id, value))}
          />
        </div>
        <div className="contact-actions mt-5 flex flex-wrap gap-3">
          <a className="btn-secondary" href={`tel:${lead.phone}`}>
            <Phone size={15} />
            {lead.phone || "No phone"}
          </a>
          {lead.phone && (
            <a
              className="btn-secondary !text-emerald-700"
              href={`https://wa.me/${lead.phone.replace(/\D/g, "")}`}
              target="_blank"
              rel="noreferrer"
            >
              <MessageCircle size={15} />
              WhatsApp
            </a>
          )}
          {lead.email && (
            <a className="btn-secondary" href={`mailto:${lead.email}`}>
              <Mail size={15} />
              {lead.email}
            </a>
          )}
        </div>
      </section>
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-6">
          <section className="card p-4 sm:p-6">
            <h2 className="section-heading">Questions & Answers</h2>
            {answers.length ? (
              <dl className="mt-5 divide-y divide-slate-100">
                {answers.map((answer, i) => (
                  <div className="py-4 first:pt-0" key={i}>
                    <dt className="text-xs font-semibold text-slate-500">
                      {answer.question}
                    </dt>
                    <dd className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-800">
                      {answer.answer || "—"}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : (
              <EmptyState
                title="No answers submitted"
                description="Responses collected with this lead will appear here."
              />
            )}
          </section>
          <section className="card p-4 sm:p-6">
            <h2 className="section-heading">
              Follow-up history{" "}
              <span className="ml-2 text-xs font-normal text-slate-400">
                {history.length} conversations
              </span>
            </h2>
            {history.length ? (
              <div className="mt-5 space-y-4">
                {history.map((item) => (
                  <div className="rounded-xl border border-slate-100 p-4" key={item.id}>
                    <div className="mb-3 flex items-center justify-between">
                      <StatusBadge status={item.status} />
                      {item.status !== "done" && (
                        <button
                          className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600"
                          disabled={busy === item.id}
                          onClick={() => action(item.id, () => markDone(item.id))}
                        >
                          <Check size={14} />
                          {busy === item.id ? "Saving…" : "Mark done"}
                        </button>
                      )}
                    </div>
                    <p className="whitespace-pre-wrap break-words text-sm leading-6">
                      {item.description}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-400">
                      <span>Connected {displayDate(item.connected_on)}</span>
                      <span>Reconnect {displayDate(item.reconnect_on)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="A fresh conversation"
                description="Add your first follow-up to start a history with this lead."
              />
            )}
          </section>
        </div>
        <section className="card p-4 sm:p-6">
          <div className="mb-5 flex items-center gap-3">
            <span className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
              <CalendarDays size={20} />
            </span>
            <div className="min-w-0">
              <h2 className="section-heading">Add follow-up</h2>
              <p className="mt-1 text-xs text-slate-400">
                Capture a note. Plan your next conversation.
              </p>
            </div>
          </div>
          <FollowupForm onSave={add} />
        </section>
      </div>
      {edit && (
        <Modal title="Edit lead" onClose={() => setEdit(false)} busy={saving}>
          <LeadForm
            lead={lead}
            onBusyChange={setSaving}
            onSave={update}
            onCancel={() => setEdit(false)}
          />
        </Modal>
      )}
      {confirm && (
        <Modal
          title="Delete this lead?"
          busy={busy === "delete"}
          onClose={() => setConfirm(false)}
        >
          <p className="text-sm leading-6 text-slate-500">
            This will permanently delete {lead.name} and all their follow-up history.
          </p>
          <div className="mt-6 flex justify-end gap-3">
            <button
              disabled={busy === "delete"}
              className="btn-secondary"
              onClick={() => setConfirm(false)}
            >
              Cancel
            </button>
            <button
              disabled={busy === "delete"}
              className="btn-primary !bg-rose-600"
              onClick={remove}
            >
              {busy === "delete" ? "Deleting…" : "Delete lead"}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
