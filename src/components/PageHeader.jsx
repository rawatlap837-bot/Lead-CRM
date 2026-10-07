export default function PageHeader({
  eyebrow = "WORKSPACE",
  title,
  description,
  children,
}) {
  return (
    <div className="mb-5 flex flex-col gap-4 sm:mb-7 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-[.2em] text-indigo-500">
          {eyebrow}
        </p>
        <h1 className="break-words text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          {title}
        </h1>
        <p className="mt-2 text-sm text-slate-500">{description}</p>
      </div>
      {children && (
        <div className="page-actions flex flex-wrap items-center gap-2 sm:gap-3">
          {children}
        </div>
      )}
    </div>
  );
}
