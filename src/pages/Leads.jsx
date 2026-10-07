import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
} from "lucide-react";
import {
  fetchLeads,
  saveLead,
  changeStatus,
  STATUSES,
  statusLabel,
} from "../lib/leads";
import { displayDate } from "../lib/dates";
import useLoad from "../lib/useLoad";
import { useToast } from "../context/toast-state";
import { LeadForm, StatusSelect } from "../components/Forms";
import Modal from "../components/Modal";
import PageHeader from "../components/PageHeader";
import Spinner from "../components/Spinner";
import LoadError from "../components/LoadError";
import EmptyState from "../components/EmptyState";
import Avatar from "../components/Avatar";
import useAutoRefresh from '../lib/useAutoRefresh';
export default function Leads() {
  const [params, setParams] = useSearchParams(),
    [modal, setModal] = useState(params.get("add") === "1"),
    [search, setSearch] = useState(""),
    [debounced, setDebounced] = useState(""),
    [status, setStatus] = useState(""),
    [page, setPage] = useState(0),
    [busy, setBusy] = useState(null),
    [saving, setSaving] = useState(false),
    toast = useToast();
  useEffect(() => {
    if (params.get("add") === "1") setModal(true);
  }, [params]);
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced(search);
      setPage(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);
  const { data, loading, error, reload } = useLoad(
    () => fetchLeads({ search: debounced, status, page }),
    [debounced, status, page],
  );
  useAutoRefresh(reload);
  useEffect(() => {
    if (data && page > 0 && !data.data.length)
      setPage(Math.max(0, Math.ceil(data.count / 25) - 1));
  }, [data, page]);
  function close() {
    setModal(false);
    setParams({}, { replace: true });
  }
  async function add(values) {
    try {
      await saveLead(values);
      toast("Lead added successfully.", "success");
      close();
      if (page !== 0) setPage(0);
      else await reload();
    } catch (issue) {
      toast(issue.message);
      throw issue;
    }
  }
  async function update(id, value) {
    setBusy(id);
    try {
      await changeStatus(id, value);
      toast("Status updated.", "success");
      await reload();
    } catch (issue) {
      toast(issue.message);
    } finally {
      setBusy(null);
    }
  }
  return (
    <>
      <PageHeader
        title="Leads"
        description="All your opportunities, in one place."
      >
        <button className="btn-primary" onClick={() => setModal(true)}>
          <Plus size={17} />
          Add lead
        </button>
      </PageHeader>
      <section className="card">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 p-5">
          <label className="relative w-full max-w-sm">
            <span className="sr-only">Search leads</span>
            <Search
              className="absolute left-3 top-3 text-slate-400"
              size={17}
            />
            <input
              className="input !pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, email or phone…"
            />
          </label>
          <label className="flex w-full items-center gap-3 text-xs text-slate-500 sm:w-auto">
            Status
            <select
              className="input flex-1 sm:!w-auto"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(0);
              }}
            >
              <option value="">All statuses</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {statusLabel(s)}
                </option>
              ))}
            </select>
          </label>
        </div>
        {loading ? (
          <Spinner />
        ) : error ? (
          <LoadError error={error} reload={reload} />
        ) : data.data.length ? (
          <>
            <div className="overflow-x-auto">
              <table className="responsive-table">
                <thead>
                  <tr>
                    {[
                      "Name",
                      "Phone",
                      "Email",
                      "Status",
                      "Source",
                      "Created date",
                      "Actions",
                    ].map((h) => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.data.map((lead) => (
                    <tr key={lead.id}>
                      <td data-label="Name">
                        <Link
                          className="flex items-center gap-3 font-semibold hover:text-indigo-600"
                          to={`/leads/${lead.id}`}
                        >
                          <Avatar name={lead.name} />
                          {lead.name}
                        </Link>
                      </td>
                      <td data-label="Phone">
                        <a
                          className="hover:text-indigo-600"
                          href={`tel:${lead.phone}`}
                        >
                          {lead.phone}
                        </a>
                      </td>
                      <td data-label="Email" className="text-slate-500">
                        {lead.email || "—"}
                      </td>
                      <td data-label="Status">
                        <StatusSelect
                          value={lead.status}
                          disabled={busy === lead.id}
                          onChange={(value) => update(lead.id, value)}
                          label={`Status for ${lead.name}`}
                        />
                      </td>
                      <td data-label="Source">{lead.source || "—"}</td>
                      <td
                        data-label="Created date"
                        className="whitespace-nowrap text-slate-500"
                      >
                        {displayDate(lead.created_at)}
                      </td>
                      <td data-label="Actions">
                        <Link
                          className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600"
                          to={`/leads/${lead.id}`}
                        >
                          View <ArrowUpRight size={14} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-t border-slate-100 px-5 py-4 text-xs text-slate-500">
              <span>
                Showing {page * 25 + 1}–{Math.min((page + 1) * 25, data.count)}{" "}
                of {data.count} leads
              </span>
              <div className="flex items-center gap-3">
                <button
                  aria-label="Previous page"
                  className="btn-secondary !p-2"
                  disabled={page === 0}
                  onClick={() => setPage(page - 1)}
                >
                  <ChevronLeft size={16} />
                </button>
                <span>
                  Page {page + 1} of {Math.max(1, Math.ceil(data.count / 25))}
                </span>
                <button
                  aria-label="Next page"
                  className="btn-secondary !p-2"
                  disabled={(page + 1) * 25 >= data.count}
                  onClick={() => setPage(page + 1)}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <EmptyState
            title={
              search || status
                ? "No matching leads"
                : "Your next connection starts here"
            }
            description={
              search || status
                ? "Try another search or status filter."
                : "Add your first lead and keep every conversation organized."
            }
          />
        )}
      </section>
      {modal && (
        <Modal title="Add a new lead" onClose={close} busy={saving}>
          <LeadForm onSave={add} onCancel={close} onBusyChange={setSaving} />
        </Modal>
      )}
    </>
  );
}
