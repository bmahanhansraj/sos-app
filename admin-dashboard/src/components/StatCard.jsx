export default function StatCard({ label, value, sublabel, accent = 'ink' }) {
  const accentClass = { ink: 'text-ink', beacon: 'text-beacon', live: 'text-live', ok: 'text-ok', danger: 'text-danger' }[accent];
  return (
    <div className="panel p-5">
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
      <p className={`mt-2 font-display text-3xl font-medium ${accentClass}`}>{value}</p>
      {sublabel && <p className="mt-1 text-xs text-muted">{sublabel}</p>}
    </div>
  );
}
