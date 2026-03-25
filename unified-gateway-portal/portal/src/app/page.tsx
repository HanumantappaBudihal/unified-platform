'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { config } from '@/lib/config';

interface HealthData {
  kafka: { status: string };
  redis: { status: string };
  minio: { status: string };
}

interface OverviewData {
  kafka: { topics?: number; brokers?: number; status: string };
  redis: { nodeCount?: number; opsPerSec?: number; totalMemoryUsed?: number; hitRatio?: number; status: string };
  minio: { bucketCount?: number; totalObjects?: number; totalSize?: number; status: string };
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default function Dashboard() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [lastUpdated, setLastUpdated] = useState('');

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [h, o] = await Promise.all([
          fetch('/api/health').then((r) => r.json()),
          fetch('/api/overview').then((r) => r.json()),
        ]);
        setHealth(h);
        setOverview(o);
        setLastUpdated(new Date().toLocaleTimeString());
      } catch {}
    };
    fetchAll();
    const interval = setInterval(fetchAll, 10000);
    return () => clearInterval(interval);
  }, []);

  const servers = [
    {
      key: 'kafka', name: 'Event Streaming', tech: 'Apache Kafka', desc: 'Message broker & event streaming',
      gradient: 'from-indigo-600 to-violet-700', glow: 'shadow-indigo-500/10', border: 'border-indigo-200 hover:border-indigo-300',
      badge: 'bg-indigo-100 text-indigo-700', btn: 'bg-indigo-600 hover:bg-indigo-500', statBg: 'bg-indigo-50',
      href: '/event-streaming', portalUrl: 'http://localhost:3001', icon: '⚡',
      status: health?.kafka?.status || 'loading',
      stats: overview?.kafka?.status === 'online'
        ? [{ label: 'Topics', value: overview.kafka.topics ?? '-' }, { label: 'Brokers', value: overview.kafka.brokers ?? '-' }]
        : [],
    },
    {
      key: 'redis', name: 'Cache Server', tech: 'Redis Cluster', desc: 'Distributed caching & pub/sub',
      gradient: 'from-red-600 to-rose-700', glow: 'shadow-red-500/10', border: 'border-red-200 hover:border-red-300',
      badge: 'bg-red-100 text-red-700', btn: 'bg-red-600 hover:bg-red-500', statBg: 'bg-red-50',
      href: '/cache', portalUrl: 'http://localhost:3002', icon: '◆',
      status: health?.redis?.status || 'loading',
      stats: overview?.redis?.status === 'online'
        ? [
            { label: 'Nodes', value: overview.redis.nodeCount ?? '-' },
            { label: 'Ops/sec', value: overview.redis.opsPerSec?.toLocaleString() ?? '-' },
            { label: 'Memory', value: formatBytes(overview.redis.totalMemoryUsed ?? 0) },
            { label: 'Hit Ratio', value: overview.redis.hitRatio ? `${(overview.redis.hitRatio * 100).toFixed(1)}%` : '-' },
          ]
        : [],
    },
    {
      key: 'minio', name: 'Object Storage', tech: 'MinIO Cluster', desc: 'S3-compatible distributed storage',
      gradient: 'from-emerald-600 to-teal-700', glow: 'shadow-emerald-500/10', border: 'border-emerald-200 hover:border-emerald-300',
      badge: 'bg-emerald-100 text-emerald-700', btn: 'bg-emerald-600 hover:bg-emerald-500', statBg: 'bg-emerald-50',
      href: '/storage', portalUrl: 'http://localhost:3004', icon: '▤',
      status: health?.minio?.status || 'loading',
      stats: overview?.minio?.status === 'online'
        ? [
            { label: 'Buckets', value: overview.minio.bucketCount ?? '-' },
            { label: 'Objects', value: overview.minio.totalObjects ?? '-' },
            { label: 'Total Size', value: formatBytes(overview.minio.totalSize ?? 0) },
          ]
        : [],
    },
  ];

  const quickActions = [
    { label: 'Kafka UI', desc: 'Topic management', url: 'http://localhost:8080', port: '8080', icon: '⚡', color: 'indigo' },
    { label: 'Redis Insight', desc: 'Data browser & CLI', url: 'http://localhost:5540', port: '5540', icon: '◆', color: 'red' },
    { label: 'MinIO Console', desc: 'Bucket management', url: 'http://localhost:9001', port: '9001', icon: '▤', color: 'emerald' },
  ];

  const qaStyles: Record<string, { border: string; icon: string }> = {
    indigo: { border: 'border-indigo-200 hover:border-indigo-300 hover:bg-indigo-50', icon: 'bg-indigo-100 text-indigo-600' },
    red: { border: 'border-red-200 hover:border-red-300 hover:bg-red-50', icon: 'bg-red-100 text-red-600' },
    emerald: { border: 'border-emerald-200 hover:border-emerald-300 hover:bg-emerald-50', icon: 'bg-emerald-100 text-emerald-600' },
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8 animate-fade-in-up">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">Infrastructure Dashboard</h1>
            <p className="text-gray-500 text-sm mt-1">All centralized servers at a glance</p>
          </div>
          {lastUpdated && <p className="text-[11px] text-gray-400">Updated {lastUpdated}</p>}
        </div>
      </div>

      {/* Platform Quick Actions */}
      <div className="mb-8 p-5 bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-200 rounded-2xl">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Platform</h2>
            <p className="text-xs text-gray-500">Self-service app onboarding & management</p>
          </div>
          <Link
            href="/apps/new"
            className="px-4 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 transition-colors shadow-sm"
          >
            + Onboard New App
          </Link>
        </div>
        <div className="flex gap-3">
          <Link href="/apps" className="px-3 py-1.5 bg-white border border-violet-200 text-violet-700 text-xs font-medium rounded-lg hover:bg-violet-50">
            All Apps
          </Link>
          <Link href="/teams" className="px-3 py-1.5 bg-white border border-violet-200 text-violet-700 text-xs font-medium rounded-lg hover:bg-violet-50">
            Teams
          </Link>
          <Link href="/audit" className="px-3 py-1.5 bg-white border border-violet-200 text-violet-700 text-xs font-medium rounded-lg hover:bg-violet-50">
            Audit Log
          </Link>
        </div>
      </div>

      {/* Server Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5 mb-8">
        {servers.map((s, i) => (
          <div
            key={s.key}
            className={`animate-fade-in-up stagger-${i + 1} opacity-0 bg-white rounded-2xl border ${s.border} p-5 sm:p-6 transition-all duration-300 hover:shadow-lg ${s.glow}`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${s.gradient} flex items-center justify-center text-lg shadow-lg ${s.glow}`}>
                  {s.icon}
                </div>
                <div>
                  <h2 className="font-bold text-gray-900">{s.name}</h2>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${s.badge}`}>{s.tech}</span>
                </div>
              </div>
              <StatusBadge status={s.status} />
            </div>

            <p className="text-xs text-gray-500 mb-4">{s.desc}</p>

            {s.stats.length > 0 ? (
              <div className="grid grid-cols-2 gap-2 mb-5">
                {s.stats.map((stat) => (
                  <div key={stat.label} className={`rounded-xl p-3 ${s.statBg}`}>
                    <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">{stat.label}</p>
                    <p className="text-xl font-bold text-gray-900 mt-0.5">{stat.value}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-24 flex items-center justify-center rounded-xl bg-gray-50 mb-5">
                <p className="text-sm text-gray-400">{s.status === 'loading' ? 'Connecting...' : 'Server unavailable'}</p>
              </div>
            )}

            <div className="flex gap-2">
              <Link href={s.href} className={`flex-1 text-center px-4 py-2.5 text-white text-sm font-medium rounded-xl transition-all shadow-lg ${s.btn} ${s.glow}`}>
                Open Dashboard
              </Link>
              <a href={s.portalUrl} target="_blank" rel="noopener noreferrer" className="px-4 py-2.5 text-gray-500 text-sm rounded-xl border border-gray-200 hover:border-gray-300 hover:text-gray-900 transition-all">
                Portal
              </a>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="mb-8 animate-fade-in-up stagger-4 opacity-0">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {quickActions.map((qa) => {
            const st = qaStyles[qa.color];
            return (
              <a key={qa.label} href={qa.url} target="_blank" rel="noopener noreferrer"
                className={`flex items-center gap-4 p-4 bg-white rounded-xl border transition-all duration-200 group ${st.border}`}>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-base shrink-0 ${st.icon}`}>{qa.icon}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm">{qa.label}</p>
                  <p className="text-[11px] text-gray-500">{qa.desc}</p>
                </div>
                <span className="text-xs font-mono text-gray-400 group-hover:text-gray-600 transition-colors shrink-0">:{qa.port}</span>
              </a>
            );
          })}
        </div>
      </div>

      {/* Service Map */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-5 sm:px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">Service Map</h2>
          <p className="text-xs text-gray-500">{config.services.length} services across infrastructure</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left px-5 sm:px-6 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Port</th>
                <th className="text-left px-5 sm:px-6 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Service</th>
                <th className="text-left px-5 sm:px-6 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Server</th>
              </tr>
            </thead>
            <tbody>
              {config.services.sort((a, b) => a.port - b.port).map((svc) => {
                const c: Record<string, string> = {
                  kafka: 'bg-indigo-100 text-indigo-700 ring-1 ring-indigo-200',
                  redis: 'bg-red-100 text-red-700 ring-1 ring-red-200',
                  minio: 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200',
                };
                const l: Record<string, string> = { kafka: 'Kafka', redis: 'Redis', minio: 'MinIO' };
                return (
                  <tr key={`${svc.port}-${svc.name}`} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="px-5 sm:px-6 py-3 font-mono text-xs text-gray-500">{svc.port}</td>
                    <td className="px-5 sm:px-6 py-3 text-gray-900 font-medium">{svc.name}</td>
                    <td className="px-5 sm:px-6 py-3">
                      <span className={`px-2.5 py-1 rounded-md text-[11px] font-medium ${c[svc.server]}`}>{l[svc.server]}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'healthy') return (
    <span className="flex items-center gap-2 text-xs font-medium text-emerald-600">
      <span className="relative flex h-2.5 w-2.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-40" />
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
      </span>
      Online
    </span>
  );
  if (status === 'loading') return (
    <span className="flex items-center gap-2 text-xs font-medium text-gray-400">
      <span className="w-2.5 h-2.5 rounded-full bg-gray-300 animate-pulse" />
      Checking...
    </span>
  );
  return (
    <span className="flex items-center gap-2 text-xs font-medium text-red-500">
      <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
      Offline
    </span>
  );
}
