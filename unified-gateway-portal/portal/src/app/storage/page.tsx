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

export default function StorageOverview() {
  const [data, setData] = useState<any>(null);
  const [health, setHealth] = useState('loading');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [h, o] = await Promise.all([
          fetch('/api/health').then((r) => r.json()),
          fetch('/api/overview').then((r) => r.json()),
        ]);
        setHealth(h.minio?.status || 'offline');
        setData(o.minio);
      } catch { setHealth('offline'); }
    };
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  const pages = [
    { href: '/storage/browse', label: 'File Browser', desc: 'Upload, download, and manage files', icon: '▤' },
    { href: '/storage/apps', label: 'Applications', desc: 'Per-app bucket isolation and IAM policies', icon: '⧉' },
    { href: '/storage/presign', label: 'Share Links', desc: 'Generate time-limited presigned URLs', icon: '⟷' },
    { href: '/storage/console', label: 'MinIO Console', desc: 'Native MinIO management and diagnostics', icon: '⊞' },
  ];

  const extLinks = [
    { href: 'http://localhost:3004', label: 'Storage Portal', port: '3004' },
    { href: 'http://localhost:9001', label: 'MinIO Console', port: '9001' },
    { href: 'http://localhost:9000', label: 'S3 API', port: '9000' },
    { href: 'http://localhost:3005', label: 'Grafana', port: '3005' },
    { href: 'http://localhost:9097', label: 'Prometheus', port: '9097' },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-8 animate-fade-in-up">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-lg shadow-lg shadow-emerald-500/20">▤</div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Object Storage</h1>
          </div>
          <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-full w-fit">MinIO Cluster</span>
        </div>
        <p className="text-gray-500 text-sm mt-2">S3-compatible distributed object storage with erasure coding</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <StatCard label="Status" value={health === 'healthy' ? 'Online' : health === 'loading' ? '...' : 'Offline'} color={health === 'healthy' ? 'emerald' : 'red'} />
        <StatCard label="Buckets" value={data?.bucketCount ?? '...'} color="emerald" />
        <StatCard label="Objects" value={data?.totalObjects ?? '...'} color="emerald" />
        <StatCard label="Total Size" value={data?.totalSize ? formatBytes(data.totalSize) : '...'} color="emerald" />
      </div>

      <h2 className="text-lg font-bold text-gray-900 mb-3">Pages</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        {pages.map((p) => (
          <Link key={p.href} href={p.href} className="group p-4 bg-white rounded-xl border border-emerald-200 hover:border-emerald-300 hover:bg-emerald-50 transition-all">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-base text-emerald-500">{p.icon}</span>
              <p className="font-semibold text-gray-900 group-hover:text-emerald-700 transition-colors">{p.label}</p>
            </div>
            <p className="text-xs text-gray-500">{p.desc}</p>
          </Link>
        ))}
      </div>

      <h2 className="text-lg font-bold text-gray-900 mb-3">External Services</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {extLinks.map((l) => (
          <a key={l.port} href={l.href} target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 hover:border-emerald-200 hover:bg-emerald-50/50 transition-all group">
            <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900 transition-colors">{l.label}</span>
            <span className="text-xs font-mono text-gray-400 group-hover:text-emerald-600 transition-colors">:{l.port}</span>
          </a>
        ))}
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  const c: Record<string, string> = {
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    red: 'bg-red-50 border-red-200 text-red-700',
  };
  return (
    <div className={`rounded-xl border p-4 ${c[color] || c.emerald}`}>
      <p className="text-[11px] font-medium opacity-60 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
    </div>
  );
}
