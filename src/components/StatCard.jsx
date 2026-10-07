export default function StatCard({
  label,
  value,
  icon: Icon,
  color = "indigo",
  hint,
}) {
  const colors = {
    indigo: "bg-indigo-50 text-indigo-600",
    blue: "bg-blue-50 text-blue-600",
    amber: "bg-amber-50 text-amber-600",
    rose: "bg-rose-50 text-rose-600",
    emerald: "bg-emerald-50 text-emerald-600",
  };
  return (
    <div className="card p-3.5 sm:p-5">
      <div className="mb-3 flex items-start justify-between gap-2 sm:mb-4">
        <span className="text-xs font-medium leading-5 text-slate-500">
          {label}
        </span>
        {Icon && (
          <span className={`shrink-0 rounded-lg p-1.5 sm:p-2 ${colors[color]}`}>
            <Icon size={17} />
          </span>
        )}
      </div>
      <p className="text-2xl font-bold tracking-tight sm:text-3xl">
        {Number(value || 0).toLocaleString()}
      </p>
      {hint && (
        <p className="mt-2 hidden text-xs text-slate-500 sm:block">{hint}</p>
      )}
    </div>
  );
}
