'use client';

import { useState } from 'react';

interface LogEntry {
  timestamp: string;
  level: string;
  service: string;
  message: string;
}

const levelColors: Record<string, string> = {
  error: 'bg-red-500/20 text-red-400',
  warn: 'bg-yellow-500/20 text-yellow-400',
  warning: 'bg-yellow-500/20 text-yellow-400',
  info: 'bg-blue-500/20 text-blue-400',
  debug: 'bg-gray-500/20 text-gray-400',
};

export default function ExplorePage() {
  const [query, setQuery] = useState('{job="docker"}');
  const [timeRange, setTimeRange] = useState('1h');
  const [limit, setLimit] = useState('100');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const search = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ query, range: timeRange, limit });
      const res = await fetch(`/api/logs?${params}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setLogs(data.entries || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to query logs');
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Log Explorer</h1>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">LogQL Query</label>
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm font-mono text-gray-200 focus:outline-none focus:border-amber-500 resize-none"
            rows={3}
            placeholder='{job="docker"} |= "error"'
          />
        </div>
        <div className="flex gap-4 items-end">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Time Range</label>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-amber-500"
            >
              <option value="1h">Last 1 hour</option>
              <option value="6h">Last 6 hours</option>
              <option value="12h">Last 12 hours</option>
              <option value="24h">Last 24 hours</option>
              <option value="7d">Last 7 days</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Limit</label>
            <select
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-amber-500"
            >
              <option value="100">100</option>
              <option value="500">500</option>
              <option value="1000">1000</option>
            </select>
          </div>
          <button
            onClick={search}
            disabled={loading}
            className="px-6 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-black font-medium rounded-lg text-sm transition-colors"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm">{error}</div>
      )}

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Results</h2>
          <span className="text-sm text-gray-500">{logs.length} entries</span>
        </div>
        {logs.length === 0 ? (
          <p className="text-gray-500 text-sm">No results. Run a query to see logs.</p>
        ) : (
          <div className="space-y-1 max-h-[600px] overflow-y-auto font-mono text-xs">
            {logs.map((log, i) => (
              <div key={i} className="flex gap-2 py-1 px-2 hover:bg-gray-800 rounded items-start">
                <span className="text-gray-600 whitespace-nowrap">{log.timestamp}</span>
                <span className={`px-1.5 py-0.5 rounded text-xs font-medium whitespace-nowrap ${levelColors[log.level?.toLowerCase()] || levelColors.info}`}>
                  {(log.level || 'INFO').toUpperCase().padEnd(5)}
                </span>
                <span className="text-amber-400 whitespace-nowrap">{log.service}</span>
                <span className="text-gray-300 break-all">{log.message}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
