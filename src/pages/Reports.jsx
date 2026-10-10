import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FileSpreadsheet, FileDown, ChevronLeft, ChevronRight } from "lucide-react";
import { fetchLeadSources, fetchReport, STATUSES, statusLabel } from "../lib/leads";
import { todayIST, rangeFor, displayDate, weekStart } from "../lib/dates";
import { validDate } from "../lib/validation";
import { flattenLeads } from "../lib/answers";
import useLoad from "../lib/useLoad";
import { useToast } from "../context/toast-state";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import Spinner from "../components/Spinner";
import LoadError from "../components/LoadError";
import EmptyState from "../components/EmptyState";
import { fetchPageNames } from "../lib/pageNames";
import { sourceName } from "../lib/personalWorkspace";
import { useAuth } from "../context/auth-state";
export default function Reports() {
  const [period, setPeriod] = useState("month");
  const [value, setValue] = useState(todayIST());
  const [source, setSource] = useState("");
  const [page, setPage] = useState(0);
  const [busy, setBusy] = useState("");
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const toast = useToast();
  const { access } = useAuth();
  const {
    data: sources,
    loading: sourcesLoading,
    error: sourcesError,
  } = useLoad(fetchLeadSources, []);
  const {
    data: pageNames,
    loading: namesLoading,
    error: namesError,
  } = useLoad(fetchPageNames, []);
  const range = useMemo(
    () =>
      period === "all"
        ? {
            start: "all-time",
            end: "all-time",
            label: "All time",
          }
        : rangeFor(period, value),
    [period, value],
  );
  const { data, loading, error, reload } = useLoad(
    () => fetchReport(range, source),
    [range.from, range.to, source],
  );
  const flattened = useMemo(() => flattenLeads(data || []), [data]);
  useEffect(() => {
    setPage(0);
    setSelectedIds(new Set());
  }, [source, period, value]);
  function choosePeriod(next) {
    setPeriod(next);
    setValue(todayIST());
    setPage(0);
    setSelectedIds(new Set());
  }
  function chooseValue(next) {
    if (next) {
      const date =
        period === "month" ? `${next}-01` : period === "year" ? `${next}-01-01` : next;
      if (!validDate(date)) return;
      setValue(period === "week" ? weekStart(date) : date);
      setPage(0);
      setSelectedIds(new Set());
    }
  }
  async function download(kind, selectedOnly = false) {
    setBusy(`${kind}${selectedOnly ? "-selected" : ""}`);
    try {
      const all = selectedOnly
        ? data.filter((lead) => selectedIds.has(lead.id))
        : await fetchReport(range, source);
      if (!all.length) throw new Error("Select at least one lead to export.");
      const exportPeriod = selectedOnly ? "selected" : source ? "source" : period;
      const exportRange = selectedOnly
        ? { ...range, label: `${all.length} selected leads` }
        : source
          ? {
              ...range,
              label: `${sourceName(source, pageNames, access?.personal_source)} · ${range.label}`,
            }
          : range;
      if (kind === "excel") {
        const { exportExcel } = await import("../lib/exportExcel");
        exportExcel(all, exportPeriod, exportRange);
      } else {
        const { exportPdf } = await import("../lib/exportPdf");
        exportPdf(all, exportPeriod, exportRange);
      }
      toast(
        selectedOnly ? `${all.length} selected leads exported.` : "Report exported.",
        "success",
      );
    } catch (issue) {
      toast(issue.message);
    } finally {
      setBusy("");
    }
  }
  const visibleLeads = (data || []).slice(page * 25, page * 25 + 25);
  const selectedCount = data?.filter((lead) => selectedIds.has(lead.id)).length || 0;
  const allVisibleSelected =
    visibleLeads.length > 0 && visibleLeads.every((lead) => selectedIds.has(lead.id));
  function toggleVisible() {
    setSelectedIds((previous) => {
      const next = new Set(previous);
      if (allVisibleSelected) visibleLeads.forEach((lead) => next.delete(lead.id));
      else visibleLeads.forEach((lead) => next.add(lead.id));
      return next;
    });
  }
  const currentYear = Number(todayIST().slice(0, 4));
  const filterLoading = sourcesLoading || namesLoading;
  const filterError = sourcesError || namesError;
  return (
    <>
      <PageHeader
        eyebrow="INSIGHTS & EXPORTS"
        title="Reports"
        description="Turn your lead activity into a clearer picture."
      >
        <button
          disabled={
            loading ||
            !!error ||
            filterLoading ||
            !!filterError ||
            !data?.length ||
            !!busy
          }
          className="btn-secondary"
          onClick={() => download("excel")}
        >
          <FileSpreadsheet size={16} />
          {busy === "excel" ? "Exporting…" : "Export Excel"}
        </button>
        <button
          disabled={
            loading ||
            !!error ||
            filterLoading ||
            !!filterError ||
            !data?.length ||
            !!busy
          }
          className="btn-primary"
          onClick={() => download("pdf")}
        >
          <FileDown size={16} />
          {busy === "pdf" ? "Exporting…" : "Export PDF"}
        </button>
      </PageHeader>
      <div className="card mb-6 flex flex-wrap items-center justify-between gap-4 p-4">
        <label className="flex w-full flex-wrap items-center gap-3 text-xs text-slate-500 sm:w-auto">
          <span className="filter-caption">Lead source</span>
          <select
            aria-label="Filter reports by lead source"
            className="input min-w-0 flex-1 sm:!w-auto"
            value={source}
            disabled={filterLoading || !!filterError}
            onChange={(event) => setSource(event.target.value)}
          >
            <option value="">All sources</option>
            {(sources || []).map((item) => (
              <option key={item} value={item}>
                {sourceName(item, pageNames, access?.personal_source)}
              </option>
            ))}
          </select>
        </label>
        <div
          role="tablist"
          aria-label="Report period"
          className="grid w-full grid-cols-5 rounded-lg bg-slate-100 p-1 sm:w-auto"
        >
          {["day", "week", "month", "year", "all"].map((p) => (
            <button
              key={p}
              role="tab"
              aria-selected={period === p}
              className={`min-h-11 rounded-md px-2 py-2 sm:px-5 text-xs font-semibold capitalize ${period === p ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500"}`}
              onClick={() => choosePeriod(p)}
            >
              {p}
            </button>
          ))}
        </div>
        {period === "all" ? (
          <span className="text-xs font-medium text-slate-500">Including all dates</span>
        ) : (
          <label className="report-date-filter flex w-full flex-wrap items-center gap-3 text-xs text-slate-500 sm:w-auto">
            <span className="filter-caption">Select {period}</span>
            {period === "year" ? (
              <select
                aria-label="Select year"
                className="input min-w-0 flex-1 sm:!w-auto"
                value={value.slice(0, 4)}
                onChange={(e) => chooseValue(e.target.value)}
              >
                {Array.from({ length: 31 }, (_, i) => currentYear + 1 - i).map((y) => (
                  <option key={y}>{y}</option>
                ))}
              </select>
            ) : (
              <input
                aria-label={`Select ${period}`}
                className="input min-w-0 flex-1 sm:!w-auto"
                type={period === "day" || period === "week" ? "date" : period}
                value={
                  period === "week"
                    ? weekStart(value)
                    : period === "month"
                      ? value.slice(0, 7)
                      : value
                }
                onChange={(e) => chooseValue(e.target.value)}
              />
            )}
            <span className="rounded-md bg-indigo-50 px-2 py-1 text-[10px] font-semibold text-indigo-600">
              IST
            </span>
          </label>
        )}
      </div>
      {filterError ? (
        <LoadError error={filterError} reload={() => window.location.reload()} />
      ) : loading ? (
        <Spinner />
      ) : error ? (
        <LoadError error={error} reload={reload} />
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-6">
            <div className="rounded-xl bg-indigo-600 p-4 sm:p-5 text-white">
              <p className="text-xs text-indigo-100">Total leads</p>
              <p className="mt-3 text-3xl font-bold">{data.length}</p>
            </div>
            {STATUSES.map((status) => (
              <div key={status} className="card p-4 sm:p-5">
                <p className="text-xs text-slate-500">{statusLabel(status)}</p>
                <p className="mt-3 text-3xl font-bold">
                  {data.filter((lead) => lead.status === status).length}
                </p>
              </div>
            ))}
          </div>
          <section className="card">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-6 py-5">
              <h2 className="section-heading">
                Lead activity
                {source
                  ? ` · ${sourceName(source, pageNames, access?.personal_source)}`
                  : ""}
              </h2>
              <span className="text-xs text-slate-400">
                {range.label} · Select leads below to export only those rows
              </span>
            </div>
            {data.length ? (
              <>
                {selectedCount > 0 && (
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-indigo-100 bg-indigo-50/70 px-5 py-3">
                    <p className="text-sm font-semibold text-indigo-950">
                      {selectedCount} lead{selectedCount === 1 ? "" : "s"} selected
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        className="btn-secondary"
                        disabled={!!busy}
                        onClick={() => download("excel", true)}
                      >
                        <FileSpreadsheet size={16} />
                        {busy === "excel-selected"
                          ? "Exporting…"
                          : "Export selected Excel"}
                      </button>
                      <button
                        className="btn-primary"
                        disabled={!!busy}
                        onClick={() => download("pdf", true)}
                      >
                        <FileDown size={16} />
                        {busy === "pdf-selected" ? "Exporting…" : "Export selected PDF"}
                      </button>
                      <button
                        className="min-h-11 px-3 text-sm font-semibold text-slate-600 hover:text-slate-900"
                        disabled={!!busy}
                        onClick={() => setSelectedIds(new Set())}
                      >
                        Clear selection
                      </button>
                    </div>
                  </div>
                )}
                <div className="overflow-x-auto">
                  <table className="responsive-table">
                    <thead>
                      <tr>
                        <th>
                          <input
                            type="checkbox"
                            aria-label="Select all leads on this page"
                            checked={allVisibleSelected}
                            onChange={toggleVisible}
                          />
                        </th>
                        {flattened.headers.map((h, i) => (
                          <th key={i}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {flattened.rows.slice(page * 25, page * 25 + 25).map((row, i) => (
                        <tr key={data[page * 25 + i].id}>
                          <td data-label="Select">
                            <input
                              type="checkbox"
                              aria-label={`Select lead ${row[0] || "unnamed"}`}
                              checked={selectedIds.has(data[page * 25 + i].id)}
                              onChange={() =>
                                setSelectedIds((previous) => {
                                  const next = new Set(previous);
                                  const id = data[page * 25 + i].id;
                                  if (next.has(id)) next.delete(id);
                                  else next.add(id);
                                  return next;
                                })
                              }
                            />
                          </td>
                          {row.map((cell, column) => (
                            <td
                              data-label={flattened.headers[column]}
                              className={
                                column > 5
                                  ? "min-w-48 max-w-xs whitespace-pre-wrap break-words"
                                  : "whitespace-nowrap"
                              }
                              key={column}
                            >
                              {column === 0 ? (
                                <Link
                                  className="font-semibold hover:text-indigo-600"
                                  to={`/leads/${data[page * 25 + i].id}`}
                                >
                                  {cell || "Unnamed lead"}
                                </Link>
                              ) : column === 3 ? (
                                <StatusBadge status={cell} />
                              ) : column === 5 ? (
                                displayDate(cell)
                              ) : (
                                cell || "—"
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-4 text-xs text-slate-500">
                  <span>{data.length} leads in this period</span>
                  <div className="flex items-center gap-3">
                    <button
                      aria-label="Previous report page"
                      className="btn-secondary !p-2"
                      disabled={page === 0}
                      onClick={() => setPage(page - 1)}
                    >
                      <ChevronLeft size={16} />
                    </button>
                    Page {page + 1} of {Math.ceil(data.length / 25)}
                    <button
                      aria-label="Next report page"
                      className="btn-secondary !p-2"
                      disabled={(page + 1) * 25 >= data.length}
                      onClick={() => setPage(page + 1)}
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <EmptyState
                title="No leads in this period"
                description="Choose another period to explore your lead activity."
              />
            )}
          </section>
        </>
      )}
    </>
  );
}
