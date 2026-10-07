export default function LoadError({ error, reload }) {
  return (
    <div role="alert" className="card p-8 text-center">
      <h3 className="font-semibold">We couldn’t load these records</h3>
      <p className="my-3 text-sm text-slate-500">{error}</p>
      <button onClick={reload} className="btn-secondary">
        Try again
      </button>
    </div>
  );
}
