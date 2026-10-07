export default function Spinner({ full = false }) {
  return (
    <div
      role="status"
      className={`flex items-center justify-center gap-3 text-sm text-slate-500 ${full ? "min-h-[50vh]" : "py-12"}`}
    >
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-600" />
      Loading…
    </div>
  );
}
