'use client';
import { useEffect, useState } from 'react';

interface Stats {
  bucketCount: number;
  totalObjects: number;
  totalSize: number;
  buckets: { name: string; objectCount: number; totalSize: number; versioning: boolean }[];
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [health, setHealth] = useState<string>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, healthRes] = await Promise.all([
          fetch('/api/stats'),
          fetch('/api/health'),
        ]);
        if (statsRes.ok) setStats(await statsRes.json());
        const h = await healthRes.json();
        setHealth(h.status);
      } catch (err) {
        setError(`${err}`);
        setHealth('unhealthy');
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Storage Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">MinIO Cluster Overview</p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{error}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Cluster Status"
          value={health === 'healthy' ? 'Healthy' : health === 'loading' ? '...' : 'Down'}
          color={health === 'healthy' ? 'emerald' : health === 'loading' ? 'gray' : 'red'}
        />
        <StatCard label="Buckets" value={stats?.bucketCount ?? '...'} color="blue" />
        <StatCard label="Total Objects" value={stats?.totalObjects ?? '...'} color="purple" />
        <StatCard label="Total Size" value={stats ? formatBytes(stats.totalSize) : '...'} color="orange" />
      </div>

      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Bucket Overview</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-3 font-medium text-gray-600">Bucket</th>
                <th className="text-right p-3 font-medium text-gray-600">Objects</th>
                <th className="text-right p-3 font-medium text-gray-600">Size</th>
                <th className="text-center p-3 font-medium text-gray-600">Versioning</th>
              </tr>
            </thead>
            <tbody>
              {stats?.buckets.map((b) => (
                <tr key={b.name} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="p-3 font-medium text-gray-900">{b.name}</td>
                  <td className="p-3 text-right text-gray-600">{b.objectCount}</td>
                  <td className="p-3 text-right text-gray-600">{formatBytes(b.totalSize)}</td>
                  <td className="p-3 text-center">
                    <span className={`px-2 py-0.5 rounded text-xs ${b.versioning ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                      {b.versioning ? 'ON' : 'OFF'}
                    </span>
                  </td>
                </tr>
              ))}
              {!stats && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-gray-400">Loading...</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  const colors: Record<string, string> = {
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    purple: 'bg-purple-50 border-purple-200 text-purple-700',
    orange: 'bg-orange-50 border-orange-200 text-orange-700',
    red: 'bg-red-50 border-red-200 text-red-700',
    gray: 'bg-gray-50 border-gray-200 text-gray-500',
  };

  return (
    <div className={`rounded-lg border p-4 ${colors[color] || colors.gray}`}>
      <p className="text-xs font-medium opacity-75">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}
