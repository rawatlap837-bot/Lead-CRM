import { useEffect, useRef, useState } from "react";
import { setPageName } from "../lib/pageNames";
import { Pencil, Trash2, TriangleAlert, ArrowRight, Files } from "lucide-react";
import Modal from "./Modal";
import { deleteSection } from "../lib/sections";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/auth-state";
export default function PageName({ source, name, onSaved, onDeleted }) {
  const { session, access } = useAuth();
  const personal = source.startsWith("Personal leads / ");
  const directDelete = Boolean(
    onDeleted && (access?.is_admin || source === access?.personal_source),
  );
  const [ownedSection, setOwnedSection] = useState(false);
  const canDelete = directDelete || Boolean(onDeleted && ownedSection);
  const [confirmDelete, setConfirmDelete] = useState(false);
  useEffect(() => {
    let active = true;
    setOwnedSection(false);
    if (!onDeleted || !source.startsWith("Section / ") || directDelete) return;
    supabase
      .from("crm_sections")
      .select("owner_id")
      .eq("source", source)
      .then(({ data, error }) => {
        if (active && !error)
          setOwnedSection(
            Boolean(
              data?.some((row) => access?.is_admin || row.owner_id === session?.user?.id),
            ),
          );
      });
    return () => {
      active = false;
    };
  }, [source, onDeleted, access?.is_admin, session?.user?.id, directDelete]);
  async function remove() {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      await deleteSection(source);
      await onDeleted();
      setConfirmDelete(false);
    } catch (issue) {
      setError(issue.message);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  const [open, setOpen] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [value, setValue] = useState(name || source);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef(false);
  async function save(e) {
    e.preventDefault();
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      await setPageName(source, value);
      await onSaved();
      setOpen(false);
    } catch (issue) {
      setError(issue.message);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return open ? (
    <Modal title="Rename page" busy={busy} onClose={() => setOpen(false)}>
      <form onSubmit={save} aria-busy={busy} className="mt-3 max-w-md space-y-3">
        <label className="block text-sm">
          Display name
          <input
            className="input mt-1"
            required
            maxLength={200}
            disabled={busy}
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </label>
        <p className="text-xs text-slate-500">
          This title is visible to everyone with access to this page. Sheet connections
          and shared access stay linked to the original source.
        </p>
        {error && (
          <p role="alert" className="text-sm text-rose-600">
            {error}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <button className="btn-primary" disabled={busy}>
            {busy ? "Saving…" : "Save name"}
          </button>
          <button
            type="button"
            className="btn-secondary"
            disabled={busy}
            onClick={() => setOpen(false)}
          >
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  ) : (
    <span className="inline-flex shrink-0 items-center">
      <button
        type="button"
        aria-label={`Edit ${name || source}`}
        title={`Edit ${name || source}`}
        aria-expanded={actionsOpen}
        className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-indigo-600"
        onClick={() => setActionsOpen(true)}
      >
        <Pencil size={15} />
      </button>
      {actionsOpen && !confirmDelete && (
        <Modal title="Manage page" onClose={() => setActionsOpen(false)}>
          <div className="mb-5 flex items-center gap-3 rounded-xl bg-slate-50 p-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
              <Files size={19} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Page
              </p>
              <p className="break-words font-semibold text-slate-900">{name || source}</p>
            </div>
          </div>
          <div className="space-y-3">
            <button
              className="group flex min-h-[4.5rem] w-full items-center gap-3 rounded-xl border border-slate-200 p-4 text-left transition hover:border-indigo-300 hover:bg-indigo-50/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              onClick={() => {
                setValue(name || source);
                setActionsOpen(false);
                setOpen(true);
              }}
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
                <Pencil size={17} aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-slate-900">
                  Rename page
                </span>
                <span className="mt-0.5 block text-xs leading-5 text-slate-500">
                  Change the title shown in your CRM.
                </span>
              </span>
              <ArrowRight
                size={17}
                className="shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-indigo-600"
                aria-hidden="true"
              />
            </button>
            {canDelete && (
              <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-4">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-rose-100 text-rose-700">
                    <Trash2 size={17} aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-rose-900">
                      {personal ? "Delete leads" : "Delete page and leads"}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-rose-800/80">
                      {personal
                        ? "Permanently remove the leads, imported rows, and follow-ups in this workspace."
                        : "Permanently remove this page’s leads, imported rows, follow-ups, and shared access."}
                    </p>
                    <button
                      className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-lg border border-rose-300 bg-white px-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                      onClick={() => {
                        setError("");
                        setConfirmDelete(true);
                      }}
                    >
                      <Trash2 size={15} aria-hidden="true" /> Continue to delete
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
      {confirmDelete && (
        <Modal
          title={personal ? "Delete all leads?" : "Delete section?"}
          busy={busy}
          onClose={() => {
            setConfirmDelete(false);
            setActionsOpen(false);
          }}
        >
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
            <TriangleAlert />
          </div>
          <p className="break-words text-sm text-slate-600">
            {personal ? (
              <>
                Permanently delete all leads, imported rows and follow-ups in{" "}
                <strong>{name || source}</strong>? The section stays available.
              </>
            ) : (
              <>
                Permanently delete <strong>{name || source}</strong> and all its leads,
                imported rows, follow-ups and shared access? Connected forms can recreate
                this section when new leads arrive.
              </>
            )}{" "}
            This cannot be undone.
          </p>
          {error && (
            <p role="alert" className="mt-3 text-sm text-rose-600">
              {error}
            </p>
          )}
          <div className="mt-6 flex flex-wrap justify-end gap-2">
            <button
              className="btn-secondary"
              disabled={busy}
              onClick={() => {
                setConfirmDelete(false);
                setActionsOpen(false);
              }}
            >
              Cancel
            </button>
            <button
              className="btn-primary bg-rose-600 hover:bg-rose-700"
              disabled={busy}
              onClick={remove}
            >
              <Trash2 size={16} />
              {busy ? "Deleting..." : "Delete permanently"}
            </button>
          </div>
        </Modal>
      )}
    </span>
  );
}
