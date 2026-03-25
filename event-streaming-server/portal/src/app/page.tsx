'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import StatusBadge from '@/components/StatusBadge';

interface ServiceStatus {
  name: string;
  url: string;
  status: 'healthy' | 'unhealthy';
  latencyMs: number;
}

interface HealthResponse {
  status: 'healthy' | 'degraded';
  timestamp: string;
  services: ServiceStatus[];
}

interface TopicSummary {
  total: number;
  dlq: number;
  application: number;
}

export default function Dashboard() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [topics, setTopics] = useState<TopicSummary | null>(null);
  const [brokers, setBrokers] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAll() {
      setLoading(true);
      try {
        const [healthRes, topicsRes, brokersRes] = await Promise.all([
          fetch('/api/health').then((r) => r.json()).catch(() => null),
          fetch('/api/topics?internal=true').then((r) => r.json()).catch(() => null),
          fetch('/api/brokers').then((r) => r.json()).catch(() => null),
        ]);
        setHealth(healthRes);
        if (topicsRes?.topics) {
          const all = topicsRes.topics;
          setTopics({
            total: all.length,
            dlq: all.filter((t: { isDlq: boolean }) => t.isDlq).length,
            application: all.filter((t: { isDlq: boolean; name: string }) => !t.isDlq && !t.name.startsWith('_')).length,
          });
        }
        if (brokersRes?.brokers) setBrokers(brokersRes.brokers);
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
    const interval = setInterval(fetchAll, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
          <p className="text-slate-500 text-sm mt-1">Real-time cluster overview</p>
        </div>
        {health && (
          <div className="flex items-center gap-3">
            <StatusBadge status={health.status === 'healthy' ? 'healthy' : 'degraded'} />
            <span className="text-xs text-slate-400">
              {new Date(health.timestamp).toLocaleTimeString()}
            </span>
          </div>
        )}
      </div>

      {loading && !health ? (
        <div className="text-slate-400">Loading cluster status...</div>
      ) : (
        <>
          {/* Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <StatCard label="Brokers" value={brokers.length || '—'} sub={brokers.length > 0 ? `IDs: ${brokers.join(', ')}` : 'Unavailable'} color="indigo" />
            <StatCard label="Topics" value={topics?.application ?? '—'} sub="Application topics" color="emerald" />
            <StatCard label="DLQ Topics" value={topics?.dlq ?? '—'} sub="Dead letter queues" color={topics && topics.dlq > 0 ? 'amber' : 'slate'} />
            <StatCard label="Total Topics" value={topics?.total ?? '—'} sub="Including internal" color="slate" />
          </div>

          {/* Service Health */}
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Service Health</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {health?.services.map((svc) => (
              <div key={svc.name} className="card flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-700">{svc.name}</p>
                  <p className="text-xs text-slate-400 mt-1">{svc.url}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-400">{svc.latencyMs}ms</span>
                  <StatusBadge status={svc.status} />
                </div>
              </div>
            ))}
          </div>

          {/* Quick Links */}
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Quick Links</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <QuickLink title="Kafka UI" description="Topic management, consumer groups, schemas" href="/tools/kafka-ui" color="indigo" />
            <QuickLink title="Grafana" description="Monitoring dashboards, metrics" href="/tools/grafana" color="emerald" />
            <QuickLink title="Prometheus" description="Metrics explorer, alert rules" href="/tools/prometheus" color="amber" />
            <QuickLink title="Alertmanager" description="Active alerts, silences, routing" href="/tools/alertmanager" color="rose" />
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub: string; color?: string }) {
  const accents: Record<string, string> = {
    indigo: 'border-l-indigo-500',
    emerald: 'border-l-emerald-500',
    amber: 'border-l-amber-500',
    rose: 'border-l-rose-500',
    slate: 'border-l-slate-300',
  };
  return (
    <div className={`card border-l-4 ${accents[color || 'slate']}`}>
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="text-3xl font-bold text-slate-800 mt-1">{value}</p>
      <p className="text-xs text-slate-400 mt-1">{sub}</p>
    </div>
  );
}

function QuickLink({ title, description, href, color }: { title: string; description: string; href: string; color: string }) {
  const accents: Record<string, string> = {
    indigo: 'hover:border-indigo-300 hover:bg-indigo-50/50',
    emerald: 'hover:border-emerald-300 hover:bg-emerald-50/50',
    amber: 'hover:border-amber-300 hover:bg-amber-50/50',
    rose: 'hover:border-rose-300 hover:bg-rose-50/50',
  };
  return (
    <Link href={href} className={`card transition-all ${accents[color]}`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-slate-700">{title}</h3>
        <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </div>
      <p className="text-sm text-slate-500">{description}</p>
    </Link>
  );
}
