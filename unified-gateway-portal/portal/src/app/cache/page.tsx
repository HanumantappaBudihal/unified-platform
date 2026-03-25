'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default function CacheOverview() {
  const [data, setData] = useState<any>(null);
  const [health, setHealth] = useState('loading');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [h, o] = await Promise.all([
          fetch('/api/health').then((r) => r.json()),
          fetch('/api/overview').then((r) => r.json()),
        ]);
        setHealth(h.redis?.status || 'offline');
        setData(o.redis);
      } catch { setHealth('offline'); }
    };
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  const pages = [
    { href: '/cache/keys', label: 'Keys', desc: 'Browse and search cached keys across cluster', icon: '⚿' },
    { href: '/cache/apps', label: 'Applications', desc: 'Per-app key prefix isolation and ACLs', icon: '⧉' },
    { href: '/cache/pubsub', label: 'Pub/Sub', desc: 'Real-time messaging channels monitoring', icon: '⇄' },
    { href: '/cache/redis-insight', label: 'Redis Insight', desc: 'Official Redis GUI with CLI and profiler', icon: '⊞' },
  ];

  const extLinks = [
    { href: 'http://localhost:3002', label: 'Cache Portal', port: '3002' },
    { href: 'http://localhost:5540', label: 'Redis Insight', port: '5540' },
    { href: 'http://localhost:3003', label: 'Grafana', port: '3003' },
    { href: 'http://localhost:9091', label: 'Prometheus', port: '9091' },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-8 animate-fade-in-up">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-rose-700 flex items-center justify-center text-lg shadow-lg shadow-red-500/20">◆</div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Cache Server</h1>
          </div>
          <span className="px-3 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded-full w-fit">Redis Cluster</span>
        </div>
        <p className="text-gray-500 text-sm mt-2">Distributed caching with key prefix isolation</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <StatCard label="Status" value={health === 'healthy' ? 'Online' : health === 'loading' ? '...' : 'Offline'} color={health === 'healthy' ? 'emerald' : 'red'} />
        <StatCard label="Nodes" value={data?.nodeCount ?? '...'} color="red" />
        <StatCard label="Ops/sec" value={data?.opsPerSec?.toLocaleString() ?? '...'} color="red" />
        <StatCard label="Memory" value={data?.totalMemoryUsed ? formatBytes(data.totalMemoryUsed) : '...'} color="red" />
      </div>

      <h2 className="text-lg font-bold text-gray-900 mb-3">Pages</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        {pages.map((p) => (
          <Link key={p.href} href={p.href} className="group p-4 bg-white rounded-xl border border-red-200 hover:border-red-300 hover:bg-red-50 transition-all">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-base text-red-500">{p.icon}</span>
              <p className="font-semibold text-gray-900 group-hover:text-red-700 transition-colors">{p.label}</p>
            </div>
            <p className="text-xs text-gray-500">{p.desc}</p>
          </Link>
        ))}
      </div>

      <h2 className="text-lg font-bold text-gray-900 mb-3">External Services</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {extLinks.map((l) => (
          <a key={l.port} href={l.href} target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 hover:border-red-200 hover:bg-red-50/50 transition-all group">
            <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900 transition-colors">{l.label}</span>
            <span className="text-xs font-mono text-gray-400 group-hover:text-red-600 transition-colors">:{l.port}</span>
          </a>
        ))}
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  const c: Record<string, string> = {
    red: 'bg-red-50 border-red-200 text-red-700',
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  };
  return (
    <div className={`rounded-xl border p-4 ${c[color] || c.red}`}>
      <p className="text-[11px] font-medium opacity-60 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
    </div>
  );
}
