import { useRef, useState } from "react";
import { createSection } from "../lib/sections";

export default function NewSection({ onCreated, onCancel, onBusyChange }) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef(false);
  const created = useRef(null);
  async function submit(event) {
    event.preventDefault();
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    onBusyChange(true);
    setError("");
    try {
      const trimmed = name.trim();
      if (created.current?.name !== trimmed)
        created.current = { name: trimmed, source: await createSection(trimmed) };
      await onCreated(created.current.source);
    } catch (issue) {
      setError(issue.message);
    } finally {
      pending.current = false;
      setBusy(false);
      onBusyChange(false);
    }
  }
  return (
    <form onSubmit={submit} aria-busy={busy} className="space-y-4">
      <label className="field">
        Section name
        <input
          className="input"
          required
          maxLength={200}
          value={name}
          disabled={busy}
          onChange={(event) => setName(event.target.value)}
          placeholder="e.g. Digital marketing or October enquiries"
        />
      </label>
      <p className="text-sm text-slate-500">
        Keep leads and file imports together in a named section. Only you, administrators,
        and people explicitly given access can see it.
      </p>
      {error && (
        <p role="alert" className="text-sm text-rose-600">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <button className="btn-primary" disabled={busy}>
          {busy ? "Creating…" : "Create section"}
        </button>
        <button
          type="button"
          className="btn-secondary"
          disabled={busy}
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
