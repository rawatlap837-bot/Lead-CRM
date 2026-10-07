import { statusLabel } from "../lib/leads";
const colors = {
  new: "bg-blue-50 text-blue-700",
  contacted: "bg-violet-50 text-violet-700",
  "follow-up": "bg-amber-50 text-amber-700",
  converted: "bg-emerald-50 text-emerald-700",
  lost: "bg-slate-100 text-slate-600",
  pending: "bg-amber-50 text-amber-700",
  done: "bg-emerald-50 text-emerald-700",
};
export default function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${colors[status] || colors.lost}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {statusLabel(status)}
    </span>
  );
}
