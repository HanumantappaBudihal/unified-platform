'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import StatusBadge from '@/components/StatusBadge';

interface NodeInfo {
  host: string;
  port: number;
  role: string;
  usedMemory: number;
  maxMemory: number;
  connectedClients: number;
  opsPerSec: number;
  keyspaceHits: number;
  keyspaceMisses: number;
  uptimeSeconds: number;
  version: string;
  status: 'up' | 'down';
}

interface ClusterData {
  clusterState: string;
  nodes: NodeInfo[];
  services: { name: string; status: string; url: string }[];
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function Dashboard() {
  const [data, setData] = useState<ClusterData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [clusterRes, healthRes] = await Promise.all([
        fetch('/api/cluster'),
        fetch('/api/health'),
      ]);
      const cluster = await clusterRes.json();
      const health = await healthRes.json();
      setData({ ...cluster, services: health.services || [] });
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-slate-400">Loading cluster data...</div>
      </div>
    );
  }

  const nodes = data?.nodes || [];
  const totalMemoryUsed = nodes.reduce((sum, n) => sum + n.usedMemory, 0);
  const totalMemoryMax = nodes.reduce((sum, n) => sum + n.maxMemory, 0);
  const totalOps = nodes.reduce((sum, n) => sum + n.opsPerSec, 0);
  const totalClients = nodes.reduce((sum, n) => sum + n.connectedClients, 0);
  const totalHits = nodes.reduce((sum, n) => sum + n.keyspaceHits, 0);
  const totalMisses = nodes.reduce((sum, n) => sum + n.keyspaceMisses, 0);
  const hitRatio = totalHits + totalMisses > 0 ? ((totalHits / (totalHits + totalMisses)) * 100).toFixed(1) : '—';
  const nodesUp = nodes.filter((n) => n.status === 'up').length;

  const stats = [
    { label: 'Cluster State', value: data?.clusterState === 'ok' ? 'OK' : 'FAIL', color: data?.clusterState === 'ok' ? 'border-emerald-400' : 'border-rose-400' },
    { label: 'Nodes Up', value: `${nodesUp} / ${nodes.length}`, color: nodesUp === nodes.length ? 'border-emerald-400' : 'border-amber-400' },
    { label: 'Memory Used', value: formatBytes(totalMemoryUsed), color: 'border-blue-400' },
    { label: 'Ops/sec', value: totalOps.toLocaleString(), color: 'border-purple-400' },
    { label: 'Hit Ratio', value: hitRatio === '—' ? '—' : `${hitRatio}%`, color: 'border-indigo-400' },
    { label: 'Clients', value: totalClients.toString(), color: 'border-cyan-400' },
  ];

  const quickLinks = [
    { href: '/keys', label: 'Browse Keys', desc: 'Search and manage cached data' },
    { href: '/apps', label: 'Applications', desc: 'View registered apps & usage' },
    { href: '/tools/redis-insight', label: 'Redis Insight', desc: 'Advanced key browser & CLI' },
    { href: '/tools/grafana', label: 'Grafana', desc: 'Metrics dashboards' },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Redis Cluster overview and health status</p>
        </div>
        <button onClick={fetchData} className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {stats.map((s) => (
          <div key={s.label} className={`bg-white rounded-2xl border border-slate-200 shadow-sm p-4 border-l-4 ${s.color}`}>
            <div className="text-xs text-slate-500 font-medium">{s.label}</div>
            <div className="text-xl font-bold text-slate-800 mt-1">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Nodes */}
      <h2 className="text-lg font-semibold text-slate-800 mb-3">Cluster Nodes</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {nodes.map((node) => {
          const memPct = node.maxMemory > 0 ? ((node.usedMemory / node.maxMemory) * 100).toFixed(1) : '0';
          return (
            <div key={`${node.host}:${node.port}`} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <span className="font-semibold text-slate-800">{node.host}</span>
                  <span className="text-slate-400 text-sm ml-1">:{node.port}</span>
                </div>
                <StatusBadge status={node.status} />
              </div>
              <div className="flex items-center gap-2 mb-3">
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                  node.role === 'master' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-slate-50 text-slate-600 border border-slate-200'
                }`}>
                  {node.role}
                </span>
                <span className="text-xs text-slate-400">v{node.version}</span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Memory</span>
                  <span className="text-slate-700 font-medium">{formatBytes(node.usedMemory)} / {formatBytes(node.maxMemory)} ({memPct}%)</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5">
                  <div className={`h-1.5 rounded-full ${parseFloat(memPct) > 80 ? 'bg-rose-500' : 'bg-blue-500'}`} style={{ width: `${Math.min(parseFloat(memPct), 100)}%` }}></div>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Ops/sec</span>
                  <span className="text-slate-700 font-medium">{node.opsPerSec.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Clients</span>
                  <span className="text-slate-700 font-medium">{node.connectedClients}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Uptime</span>
                  <span className="text-slate-700 font-medium">{formatUptime(node.uptimeSeconds)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Services */}
      {data?.services && data.services.length > 0 && (
        <>
          <h2 className="text-lg font-semibold text-slate-800 mb-3">Services</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {data.services.map((svc) => (
              <div key={svc.name} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex items-center justify-between">
                <div>
                  <div className="font-medium text-slate-800 text-sm">{svc.name}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{svc.url}</div>
                </div>
                <StatusBadge status={svc.status as any} />
              </div>
            ))}
          </div>
        </>
      )}

      {/* Quick Links */}
      <h2 className="text-lg font-semibold text-slate-800 mb-3">Quick Links</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {quickLinks.map((link) => (
          <Link key={link.href} href={link.href} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 hover:border-red-200 hover:shadow-md transition-all group">
            <div className="font-semibold text-slate-800 group-hover:text-red-700 transition-colors">{link.label}</div>
            <div className="text-sm text-slate-500 mt-1">{link.desc}</div>
            <div className="mt-3 text-red-500 text-sm font-medium flex items-center gap-1">
              Open
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
