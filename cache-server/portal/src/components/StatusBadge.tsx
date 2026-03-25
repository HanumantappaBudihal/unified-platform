export default function StatusBadge({ status }: { status: 'up' | 'down' | 'degraded' | 'unknown' }) {
  const styles = {
    up: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    down: 'bg-rose-50 text-rose-700 border-rose-200',
    degraded: 'bg-amber-50 text-amber-700 border-amber-200',
    unknown: 'bg-slate-50 text-slate-700 border-slate-200',
  };

  const dots = {
    up: 'bg-emerald-500',
    down: 'bg-rose-500',
    degraded: 'bg-amber-500',
    unknown: 'bg-slate-400',
  };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${styles[status]}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dots[status]}`}></span>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}
