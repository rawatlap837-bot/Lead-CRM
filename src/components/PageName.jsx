import { useRef, useState } from "react";
import { setPageName } from "../lib/pageNames";
export default function PageName({ source, name, onSaved }) {
  const [open, setOpen] = useState(false);
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
        This title is visible to everyone with access to this page. Sheet connections and
        shared access stay linked to the original source.
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
  ) : (
    <button
      className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-indigo-600"
      onClick={() => {
        setValue(name || source);
        setOpen(true);
      }}
    >
      Rename page
    </button>
  );
}
