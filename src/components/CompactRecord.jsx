export default function CompactRecord({ title, subtitle, entries, actions }) {
  const preview = entries.filter(([, value]) => String(value ?? "").trim()).slice(1, 3);
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-3">
      <h3 className="truncate text-sm font-semibold text-slate-900" title={String(title)}>
        {title}
      </h3>
      {subtitle && (
        <p className="mt-1 truncate text-[11px] text-slate-400" title={subtitle}>
          {subtitle}
        </p>
      )}
      <dl className="mt-2 space-y-1">
        {preview.map(([key, value]) => (
          <div key={key} className="flex min-w-0 gap-2 text-xs">
            <dt className="max-w-[35%] shrink-0 truncate text-slate-400">{key}</dt>
            <dd className="min-w-0 flex-1 truncate text-slate-600">{String(value)}</dd>
          </div>
        ))}
      </dl>
      <details className="mt-2 border-t border-slate-100 pt-1">
        <summary className="flex min-h-11 cursor-pointer items-center text-xs font-semibold text-indigo-600">
          All details ({entries.length} fields)
        </summary>
        <dl className="space-y-2 pb-3">
          {entries.map(([key, value]) => (
            <div
              key={key}
              className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-2 text-xs"
            >
              <dt className="break-words text-slate-400">{key}</dt>
              <dd className="min-w-0 whitespace-pre-wrap break-words text-slate-700">
                {String(value ?? "") || "—"}
              </dd>
            </div>
          ))}
        </dl>
      </details>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </article>
  );
}
