import { useAuth } from '../context/auth-state';
import { useRef, useState } from "react";
import { STATUSES, statusLabel } from "../lib/leads";
import { todayIST } from "../lib/dates";
import { validateLead, validateFollowup } from "../lib/validation";
export function StatusSelect({
  value,
  onChange,
  disabled,
  label = "Lead status",
}) {
  return (
    <select
      aria-label={label}
      className="input !w-auto !py-1.5 sm:text-xs"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      disabled={disabled}
    >
      {!STATUSES.includes(value) && (
        <option value={value}>{value || "Unknown"}</option>
      )}
      {STATUSES.map((status) => (
        <option key={status} value={status}>
          {statusLabel(status)}
        </option>
      ))}
    </select>
  );
}
export function LeadForm({ lead, defaultSource, onSave, onCancel, onBusyChange }) {
  const {access}=useAuth();
  const pending = useRef(false);
  const [values, setValues] = useState({
      name: lead?.name || "",
      email: lead?.email || "",
      phone: lead?.phone || "",
      source: lead?.source || defaultSource || access?.sources?.[0] || "",
      status: lead?.status || "new",
    }),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const change = (event) =>
    setValues((v) => ({ ...v, [event.target.name]: event.target.value }));
  async function submit(event) {
    event.preventDefault();
    const cleaned = Object.fromEntries(
      Object.entries(values).map(([k, v]) => [k, v.trim()]),
    );
    const validation = validateLead(cleaned);
    if (validation) {
      setError(validation);
      return;
    }
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    onBusyChange?.(true);
    setError("");
    try {
      await onSave(cleaned);
    } catch (issue) {
      setError(issue.message);
    } finally {
      setBusy(false);
      pending.current = false;
      onBusyChange?.(false);
    }
  }
  return (
    <form aria-busy={busy} onSubmit={submit} className="space-y-4">
      <fieldset disabled={busy} className="space-y-4">
        <Field
          label="Full name"
          name="name"
          value={values.name}
          onChange={change}
          required
          maxLength={200}
          placeholder="e.g. Priya Sharma"
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Phone"
            name="phone"
            type="tel"
            value={values.phone}
            onChange={change}
            required
            pattern="\+?[0-9]+"
            placeholder="+919876543210"
          />
          <Field
            label="Email"
            name="email"
            type="email"
            value={values.email}
            onChange={change}
            placeholder="name@company.com"
          />
        </div>
        {access && !access.is_admin ? (
          <label className="field">Landing page
            <select className="input" name="source" value={values.source} onChange={change} required>
              {access.sources.map(source=><option key={source} value={source}>{source}</option>)}
            </select>
          </label>
        ) : (
          <Field label="Source" name="source" value={values.source} onChange={change} placeholder="e.g. Website, referral, campaign"/>
        )}
        <label className="field">
          Status
          <select
            name="status"
            className="input"
            value={values.status}
            onChange={change}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {statusLabel(s)}
              </option>
            ))}
          </select>
        </label>
      </fieldset>
      {error && (
        <p role="alert" className="text-sm text-rose-600">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-3 pt-3">
        <button
          type="button"
          className="btn-secondary"
          onClick={onCancel}
          disabled={busy}
        >
          Cancel
        </button>
        <button className="btn-primary" disabled={busy}>
          {busy ? "Saving…" : lead ? "Save changes" : "Add lead"}
        </button>
      </div>
    </form>
  );
}
export function Field({ label, ...props }) {
  return (
    <label className="field">
      {label}
      <input className="input" {...props} />
    </label>
  );
}
export function FollowupForm({
  onSave,
  onCancel,
  reschedule = false,
  onBusyChange,
}) {
  const pending = useRef(false);
  const [values, setValues] = useState({
      description: "",
      connected_on: todayIST(),
      reconnect_on: todayIST(),
    }),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const change = (event) =>
    setValues((v) => ({ ...v, [event.target.name]: event.target.value }));
  async function submit(event) {
    event.preventDefault();
    const validation = validateFollowup(values);
    if (validation) {
      setError(validation);
      return;
    }
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    onBusyChange?.(true);
    setError("");
    try {
      await onSave(values);
      setValues({
        description: "",
        connected_on: todayIST(),
        reconnect_on: todayIST(),
      });
    } catch (issue) {
      setError(issue.message);
    } finally {
      setBusy(false);
      pending.current = false;
      onBusyChange?.(false);
    }
  }
  return (
    <form aria-busy={busy} className="space-y-4" onSubmit={submit}>
      <fieldset disabled={busy} className="space-y-4">
        <label className="field">
          {reschedule ? "New follow-up note" : "What did the lead say?"}
          <textarea
            className="input min-h-28 resize-y"
            name="description"
            value={values.description}
            onChange={change}
            required
            placeholder="Capture the conversation and next steps…"
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Connected on"
            type="date"
            name="connected_on"
            required
            value={values.connected_on}
            onChange={change}
          />
          <Field
            label="Reconnect on"
            type="date"
            name="reconnect_on"
            required
            min={todayIST()}
            value={values.reconnect_on}
            onChange={change}
          />
        </div>
      </fieldset>
      {error && (
        <p role="alert" className="text-sm text-rose-600">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-3">
        {onCancel && (
          <button
            type="button"
            className="btn-secondary"
            disabled={busy}
            onClick={onCancel}
          >
            Cancel
          </button>
        )}
        <button disabled={busy} className="btn-primary">
          {busy
            ? "Saving…"
            : reschedule
              ? "Reschedule follow-up"
              : "Save follow-up"}
        </button>
      </div>
    </form>
  );
}
