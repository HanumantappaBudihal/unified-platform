interface StatusBadgeProps {
  status: 'healthy' | 'unhealthy' | 'degraded' | 'checking';
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const styles = {
    healthy: 'badge-green',
    unhealthy: 'badge-red',
    degraded: 'badge-yellow',
    checking: 'badge-blue',
  };

  const labels = {
    healthy: 'Healthy',
    unhealthy: 'Down',
    degraded: 'Degraded',
    checking: 'Checking...',
  };

  const dotColor = {
    healthy: 'bg-emerald-500',
    unhealthy: 'bg-rose-500',
    degraded: 'bg-amber-500',
    checking: 'bg-indigo-500',
  };

  return (
    <span className={styles[status]}>
      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${dotColor[status]}`} />
      {labels[status]}
    </span>
  );
}
