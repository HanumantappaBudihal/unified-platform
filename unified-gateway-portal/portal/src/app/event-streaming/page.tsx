'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function KafkaOverview() {
  const [data, setData] = useState<any>(null);
  const [health, setHealth] = useState('loading');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [h, o] = await Promise.all([
          fetch('/api/health').then((r) => r.json()),
          fetch('/api/overview').then((r) => r.json()),
        ]);
        setHealth(h.kafka?.status || 'offline');
        setData(o.kafka);
      } catch { setHealth('offline'); }
    };
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  const pages = [
    { href: '/event-streaming/topics', label: 'Topics', desc: 'Create, configure, and manage Kafka topics', icon: '≡' },
    { href: '/event-streaming/messages', label: 'Messages', desc: 'Browse, produce, and consume messages', icon: '◫' },
    { href: '/event-streaming/teams', label: 'Teams', desc: 'Team-based topic grouping and ownership', icon: '⧉' },
    { href: '/event-streaming/kafka-ui', label: 'Kafka UI', desc: 'Full-featured Kafka management tool', icon: '⊞' },
  ];

  const extLinks = [
    { href: 'http://localhost:3001', label: 'Kafka Portal', port: '3001' },
    { href: 'http://localhost:8080', label: 'Kafka UI', port: '8080' },
    { href: 'http://localhost:8081', label: 'Schema Registry', port: '8081' },
    { href: 'http://localhost:8082', label: 'REST Proxy', port: '8082' },
    { href: 'http://localhost:3000', label: 'Grafana', port: '3000' },
    { href: 'http://localhost:9090', label: 'Prometheus', port: '9090' },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-8 animate-fade-in-up">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-700 flex items-center justify-center text-lg shadow-lg shadow-indigo-500/20">⚡</div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Event Streaming</h1>
          </div>
          <span className="px-3 py-1 bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-full w-fit">Apache Kafka</span>
        </div>
        <p className="text-gray-500 text-sm mt-2">Message broker and event streaming platform</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
        <StatCard label="Status" value={health === 'healthy' ? 'Online' : health === 'loading' ? '...' : 'Offline'} color={health === 'healthy' ? 'emerald' : 'red'} />
        <StatCard label="Topics" value={data?.topics ?? '...'} color="indigo" />
        <StatCard label="Brokers" value={data?.brokers ?? '...'} color="indigo" />
      </div>

      <h2 className="text-lg font-bold text-gray-900 mb-3">Pages</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        {pages.map((p) => (
          <Link key={p.href} href={p.href} className="group p-4 bg-white rounded-xl border border-indigo-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-base text-indigo-500">{p.icon}</span>
              <p className="font-semibold text-gray-900 group-hover:text-indigo-700 transition-colors">{p.label}</p>
            </div>
            <p className="text-xs text-gray-500">{p.desc}</p>
          </Link>
        ))}
      </div>

      <h2 className="text-lg font-bold text-gray-900 mb-3">External Services</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {extLinks.map((l) => (
          <a key={l.port} href={l.href} target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 hover:border-indigo-200 hover:bg-indigo-50/50 transition-all group">
            <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900 transition-colors">{l.label}</span>
            <span className="text-xs font-mono text-gray-400 group-hover:text-indigo-600 transition-colors">:{l.port}</span>
          </a>
        ))}
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  const c: Record<string, string> = {
    indigo: 'bg-indigo-50 border-indigo-200 text-indigo-700',
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    red: 'bg-red-50 border-red-200 text-red-700',
  };
  return (
    <div className={`rounded-xl border p-4 ${c[color]}`}>
      <p className="text-[11px] font-medium opacity-60 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
    </div>
  );
}
