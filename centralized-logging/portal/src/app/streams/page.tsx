'use client';

import { useState, useEffect } from 'react';

interface Stream {
  labels: Record<string, string>;
  entries: number;
  lastEntry: string;
}

export default function StreamsPage() {
  const [streams, setStreams] = useState<Stream[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStreams = async () => {
    try {
      const res = await fetch('/api/streams', { cache: 'no-store' });
      if (res.ok) setStreams(await res.json());
    } catch {
      // graceful degradation
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStreams();
    const interval = setInterval(fetchStreams, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-full text-gray-500">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Log Streams</h1>
        <span className="text-xs text-gray-500">{streams.length} active streams</span>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-gray-400">
              <th className="text-left p-3 font-medium">Stream</th>
              <th className="text-left p-3 font-medium">Labels</th>
              <th className="text-right p-3 font-medium">Entries</th>
              <th className="text-right p-3 font-medium">Last Entry</th>
            </tr>
          </thead>
          <tbody>
            {streams.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-8 text-center text-gray-500">
                  No active streams. Ensure Loki and Promtail are running.
                </td>
              </tr>
            ) : (
              streams.map((stream, i) => (
                <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/50">
                  <td className="p-3 font-mono text-amber-400 text-xs">
                    {stream.labels.container || stream.labels.compose_service || 'unknown'}
                  </td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(stream.labels).slice(0, 4).map(([k, v]) => (
                        <span key={k} className="px-1.5 py-0.5 bg-gray-800 rounded text-xs text-gray-400">
                          {k}={v}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="p-3 text-right text-gray-300">{stream.entries?.toLocaleString() || '-'}</td>
                  <td className="p-3 text-right text-gray-500 text-xs">{stream.lastEntry || '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
