import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FileSpreadsheet, FileDown, ChevronLeft, ChevronRight } from "lucide-react";
import { fetchReport, STATUSES, statusLabel } from "../lib/leads";
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
export default function Reports() {
  const [period, setPeriod] = useState("month");
  const [value, setValue] = useState(todayIST());
  const [page, setPage] = useState(0);
  const [busy, setBusy] = useState("");
  const toast = useToast();
  const range = useMemo(() => rangeFor(period, value), [period, value]);
  const { data, loading, error, reload } = useLoad(
    () => fetchReport(range),
    [range.from, range.to],
  );
  const flattened = useMemo(() => flattenLeads(data || []), [data]);
  function choosePeriod(next) {
    setPeriod(next);
    setValue(todayIST());
    setPage(0);
  }
  function chooseValue(next) {
    if (next) {
      const date =
        period === "month" ? `${next}-01` : period === "year" ? `${next}-01-01` : next;
      if (!validDate(date)) return;
      setValue(period === "week" ? weekStart(date) : date);
      setPage(0);
    }
  }
  async function download(kind) {
    setBusy(kind);
    try {
      const all = await fetchReport(range);
      if (kind === "excel") {
        const { exportExcel } = await import("../lib/exportExcel");
        exportExcel(all, period, range);
      } else {
        const { exportPdf } = await import("../lib/exportPdf");
        exportPdf(all, period, range);
      }
      toast("Report exported.", "success");
    } catch (issue) {
      toast(issue.message);
    } finally {
      setBusy("");
    }
  }
  const currentYear = Number(todayIST().slice(0, 4));
  return (
    <>
      <PageHeader
        eyebrow="INSIGHTS & EXPORTS"
        title="Reports"
        description="Turn your lead activity into a clearer picture."
      >
        <button
          disabled={loading || !!error || !data?.length || !!busy}
          className="btn-secondary"
          onClick={() => download("excel")}
        >
          <FileSpreadsheet size={16} />
          {busy === "excel" ? "Exporting…" : "Export Excel"}
        </button>
        <button
          disabled={loading || !!error || !data?.length || !!busy}
          className="btn-primary"
          onClick={() => download("pdf")}
        >
          <FileDown size={16} />
          {busy === "pdf" ? "Exporting…" : "Export PDF"}
        </button>
      </PageHeader>
      <div className="card mb-6 flex flex-wrap items-center justify-between gap-4 p-4">
        <div
          role="tablist"
          aria-label="Report period"
          className="grid w-full grid-cols-4 rounded-lg bg-slate-100 p-1 sm:w-auto"
        >
          {["day", "week", "month", "year"].map((p) => (
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
      </div>
      {loading ? (
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
              <h2 className="section-heading">Lead activity</h2>
              <span className="text-xs text-slate-400">
                {range.label} · All exports include the full period
              </span>
            </div>
            {data.length ? (
              <>
                <div className="overflow-x-auto">
                  <table className="responsive-table">
                    <thead>
                      <tr>
                        {flattened.headers.map((h, i) => (
                          <th key={i}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {flattened.rows.slice(page * 25, page * 25 + 25).map((row, i) => (
                        <tr key={data[page * 25 + i].id}>
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
