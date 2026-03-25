'use client';

import { useState, useEffect } from 'react';

interface Service {
  name: string;
  group: string;
  status: 'healthy' | 'unhealthy';
}

export default function StatusPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/services', { cache: 'no-store' })
      .then(res => res.ok ? res.json() : [])
      .then(setServices)
      .catch(() => setServices([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-full text-gray-500">Loading...</div>;

  const allUp = services.every(s => s.status === 'healthy');
  const someDown = services.some(s => s.status === 'unhealthy');
  const groups = [...new Set(services.map(s => s.group))];

  return (
    <div className="max-w-3xl mx-auto space-y-8 py-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">System Status</h1>
        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${
          allUp ? 'bg-emerald-500/20 text-emerald-400' :
          someDown ? 'bg-red-500/20 text-red-400' :
          'bg-yellow-500/20 text-yellow-400'
        }`}>
          <div className={`w-2 h-2 rounded-full ${allUp ? 'bg-emerald-400' : someDown ? 'bg-red-400' : 'bg-yellow-400'}`} />
          {allUp ? 'All Systems Operational' : someDown ? 'Some Systems Degraded' : 'Checking...'}
        </div>
      </div>

      {groups.map(group => {
        const groupSvcs = services.filter(s => s.group === group);
        const groupHealthy = groupSvcs.every(s => s.status === 'healthy');
        return (
          <div key={group} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold">{group}</h2>
              <span className={`text-sm ${groupHealthy ? 'text-emerald-400' : 'text-red-400'}`}>
                {groupHealthy ? 'Operational' : 'Degraded'}
              </span>
            </div>
            <div className="space-y-2">
              {groupSvcs.map(svc => (
                <div key={svc.name} className="flex items-center justify-between py-1">
                  <span className="text-sm text-gray-300">{svc.name}</span>
                  <div className={`w-2.5 h-2.5 rounded-full ${svc.status === 'healthy' ? 'bg-emerald-400' : 'bg-red-400'}`} />
                </div>
              ))}
            </div>
            <div className="mt-3 flex gap-0.5">
              {Array.from({ length: 90 }, (_, i) => (
                <div key={i} className={`flex-1 h-6 rounded-sm ${groupHealthy ? 'bg-emerald-500/30' : i > 85 ? 'bg-red-500/30' : 'bg-emerald-500/30'}`} />
              ))}
            </div>
            <p className="text-xs text-gray-600 mt-1">90 days</p>
          </div>
        );
      })}

      <p className="text-center text-xs text-gray-600">Powered by Health Aggregation Portal</p>
    </div>
  );
}
