'use client';

import { useState, useEffect } from 'react';

interface ServerHealth {
  name: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  responseTime: number;
  services: { name: string; status: string; responseTime: number; error?: string }[];
}

interface HealthData {
  status: string;
  score: number;
  servers: ServerHealth[];
  summary: { total: number; healthy: number; unhealthy: number };
}

const serverIcons: Record<string, string> = {
  'Event Streaming': '📨',
  'Cache': '🗄️',
  'Object Storage': '💾',
  'Gateway': '🌐',
  'Logging': '📋',
};

const statusColors: Record<string, string> = {
  healthy: 'bg-emerald-500',
  degraded: 'bg-yellow-500',
  unhealthy: 'bg-red-500',
};

export default function Dashboard() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchHealth = async () => {
    try {
      const res = await fetch('/api/health', { cache: 'no-store' });
      if (res.ok) setHealth(await res.json());
    } catch { /* graceful degradation */ }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 15000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div className="flex items-center justify-center h-full text-gray-500">Loading...</div>;

  const data = health || { status: 'unknown', score: 0, servers: [], summary: { total: 0, healthy: 0, unhealthy: 0 } };
  const scoreColor = data.score >= 90 ? 'text-emerald-400' : data.score >= 70 ? 'text-yellow-400' : 'text-red-400';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Infrastructure Health</h1>
        <span className="text-xs text-gray-500">Auto-refreshes every 15s</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-center">
          <p className="text-sm text-gray-500 mb-1">Health Score</p>
          <p className={`text-5xl font-bold ${scoreColor}`}>{data.score}%</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-center">
          <p className="text-sm text-gray-500 mb-1">Total Services</p>
          <p className="text-3xl font-bold text-gray-200">{data.summary.total}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-center">
          <p className="text-sm text-gray-500 mb-1">Services Up</p>
          <p className="text-3xl font-bold text-emerald-400">{data.summary.healthy}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-center">
          <p className="text-sm text-gray-500 mb-1">Services Down</p>
          <p className="text-3xl font-bold text-red-400">{data.summary.unhealthy}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.servers.map((server) => (
          <div key={server.name} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">{serverIcons[server.name] || '🖥️'}</span>
              <div className="flex-1">
                <h3 className="font-semibold">{server.name}</h3>
                <p className="text-xs text-gray-500">{server.responseTime}ms response</p>
              </div>
              <div className={`w-3 h-3 rounded-full ${statusColors[server.status] || 'bg-gray-500'}`} />
            </div>
            <div className="space-y-1">
              {server.services.map((svc) => (
                <div key={svc.name} className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">{svc.name}</span>
                  <span className={svc.status === 'healthy' ? 'text-emerald-400' : 'text-red-400'}>
                    {svc.status === 'healthy' ? 'UP' : 'DOWN'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
