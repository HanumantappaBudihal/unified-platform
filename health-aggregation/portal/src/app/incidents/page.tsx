'use client';

import { useState, useEffect } from 'react';

interface Incident {
  id: string;
  service: string;
  group: string;
  timestamp: string;
  duration: string;
  status: 'resolved' | 'ongoing';
  message: string;
}

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/incidents', { cache: 'no-store' })
      .then(res => res.ok ? res.json() : [])
      .then(setIncidents)
      .catch(() => setIncidents([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-full text-gray-500">Loading...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Incidents</h1>

      {incidents.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
          <p className="text-4xl mb-4">🎉</p>
          <p className="text-lg font-semibold text-gray-300">No incidents recorded</p>
          <p className="text-sm text-gray-500 mt-2">All systems are operating normally. Incidents will appear here when services go down.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {incidents.map((incident) => (
            <div key={incident.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-200">{incident.service}</h3>
                    <span className="px-2 py-0.5 bg-gray-800 rounded text-xs text-gray-400">{incident.group}</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      incident.status === 'resolved' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                    }`}>
                      {incident.status.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400">{incident.message}</p>
                </div>
                <div className="text-right text-sm">
                  <p className="text-gray-500">{incident.timestamp}</p>
                  <p className="text-gray-600">{incident.duration}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
