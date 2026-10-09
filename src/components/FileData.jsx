import { sourceName } from "../lib/personalWorkspace";
import { useState } from "react";
import useLoad from "../lib/useLoad";
import { fetchFileRows, updateFileRow } from "../lib/flexibleImports";
import Modal from "./Modal";
export default function FileData({ source, version }) {
  const [page, setPage] = useState(0);
  const [edit, setEdit] = useState(null);
  const [fields, setFields] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const {
    data,
    loading,
    error: loadError,
    reload,
  } = useLoad(() => fetchFileRows(source, page), [source, page, version]);
  const rows = data?.data || [];
  const columns = [...new Set(rows.flatMap((row) => Object.keys(row.fields)))];
  async function save(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await updateFileRow(edit.id, fields);
      setEdit(null);
      await reload();
    } catch (issue) {
      setError(issue.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="card mt-6 p-3 sm:p-5">
      <h2 className="section-heading">Uploaded file data</h2>
      <p className="mt-2 text-sm text-slate-500">
        Original rows and columns from your files. The first row is preserved, even if it
        contains headings.
      </p>
      {loadError ? (
        <p className="mt-3 text-sm text-amber-700">{loadError}</p>
      ) : loading ? (
        <p>Loading…</p>
      ) : !rows.length ? (
        <p className="mt-3 text-sm text-slate-500">No uploaded rows in this tab.</p>
      ) : (
        <>
          <div className="mt-4 overflow-x-auto">
            <table className="responsive-table">
              <thead>
                <tr>
                  <th>Page</th>
                  {columns.map((key) => (
                    <th key={key}>{key}</th>
                  ))}
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td data-label="Page" className="break-words">
                      {sourceName(row.source)}
                    </td>
                    {columns.map((key) => (
                      <td
                        key={key}
                        data-label={key}
                        className="max-w-sm whitespace-pre-wrap break-words"
                      >
                        {String(row.fields[key] ?? "")}
                      </td>
                    ))}
                    <td data-label="Actions">
                      <button
                        className="btn-secondary"
                        onClick={() => {
                          setEdit(row);
                          setFields({ ...row.fields });
                          setError("");
                        }}
                      >
                        Edit row
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="file-pagination mt-4 flex flex-wrap gap-3 items-center">
            <button
              className="btn-secondary"
              disabled={!page}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </button>
            <span>
              {data.count} rows · Page {page + 1}
            </span>
            <button
              className="btn-secondary"
              disabled={(page + 1) * 25 >= data.count}
              onClick={() => setPage(page + 1)}
            >
              Next
            </button>
          </div>
        </>
      )}
      {edit && (
        <Modal title="Edit uploaded row" busy={busy} onClose={() => setEdit(null)}>
          <form onSubmit={save} className="space-y-4">
            {Object.keys(fields).map((key) => (
              <label className="block text-sm" key={key}>
                {key}
                <textarea
                  className="input mt-2"
                  disabled={busy}
                  value={String(fields[key] ?? "")}
                  onChange={(e) => setFields({ ...fields, [key]: e.target.value })}
                />
              </label>
            ))}
            {error && <p role="alert">{error}</p>}
            <button className="btn-primary" disabled={busy}>
              {busy ? "Saving…" : "Save changes"}
            </button>
          </form>
        </Modal>
      )}
    </section>
  );
}
