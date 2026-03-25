'use client';

import { useState, useEffect } from 'react';

interface Stats {
  totalLogs: number;
  errorCount: number;
  warningCount: number;
  activeStreams: number;
  topServices: { name: string; count: number }[];
  recentErrors: { timestamp: string; service: string; message: string }[];
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/stats', { cache: 'no-store' });
      if (res.ok) setStats(await res.json());
    } catch {
      // graceful degradation
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 15000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-full text-gray-500">Loading...</div>;
  }

  const data = stats || { totalLogs: 0, errorCount: 0, warningCount: 0, activeStreams: 0, topServices: [], recentErrors: [] };

  const cards = [
    { label: 'Total Logs (24h)', value: data.totalLogs.toLocaleString(), color: 'text-amber-400' },
    { label: 'Errors', value: data.errorCount.toLocaleString(), color: 'text-red-400' },
    { label: 'Warnings', value: data.warningCount.toLocaleString(), color: 'text-yellow-400' },
    { label: 'Active Streams', value: data.activeStreams.toLocaleString(), color: 'text-emerald-400' },
  ];

  const maxServiceCount = Math.max(...data.topServices.map(s => s.count), 1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <span className="text-xs text-gray-500">Auto-refreshes every 15s</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <div key={card.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-sm text-gray-500">{card.label}</p>
            <p className={`text-3xl font-bold mt-1 ${card.color}`}>{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <h2 className="text-lg font-semibold mb-4">Top Services by Log Volume</h2>
          {data.topServices.length === 0 ? (
            <p className="text-gray-500 text-sm">No data available</p>
          ) : (
            <div className="space-y-3">
              {data.topServices.map((svc) => (
                <div key={svc.name}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-300">{svc.name}</span>
                    <span className="text-gray-500">{svc.count.toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-2">
                    <div
                      className="bg-amber-500 h-2 rounded-full transition-all"
                      style={{ width: `${(svc.count / maxServiceCount) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <h2 className="text-lg font-semibold mb-4">Recent Errors</h2>
          {data.recentErrors.length === 0 ? (
            <p className="text-gray-500 text-sm">No recent errors</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {data.recentErrors.map((err, i) => (
                <div key={i} className="bg-gray-800 rounded-lg p-3 text-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-1.5 py-0.5 bg-red-500/20 text-red-400 text-xs rounded font-medium">ERROR</span>
                    <span className="text-gray-500 text-xs">{err.service}</span>
                    <span className="text-gray-600 text-xs ml-auto">{err.timestamp}</span>
                  </div>
                  <p className="text-gray-300 truncate">{err.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
