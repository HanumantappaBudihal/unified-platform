'use client';

import { useState, useEffect } from 'react';

interface Service {
  name: string;
  group: string;
  type: 'http' | 'tcp';
  status: 'healthy' | 'unhealthy';
  responseTime: number;
  url?: string;
  error?: string;
}

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'healthy' | 'unhealthy'>('all');

  const fetchServices = async () => {
    try {
      const res = await fetch('/api/services', { cache: 'no-store' });
      if (res.ok) setServices(await res.json());
    } catch { /* */ }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchServices();
    const interval = setInterval(fetchServices, 30000);
    return () => clearInterval(interval);
  }, []);

  const filtered = services
    .filter(s => filter === 'all' || s.status === filter)
    .filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || s.group.toLowerCase().includes(search.toLowerCase()));

  const groups = [...new Set(filtered.map(s => s.group))];

  if (loading) return <div className="flex items-center justify-center h-full text-gray-500">Loading...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">All Services</h1>

      <div className="flex gap-4 items-center">
        <input
          type="text"
          placeholder="Search services..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm flex-1 focus:outline-none focus:border-emerald-500"
        />
        <div className="flex gap-1">
          {(['all', 'healthy', 'unhealthy'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-2 rounded-lg text-sm capitalize ${
                filter === f ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {groups.map(group => {
        const groupServices = filtered.filter(s => s.group === group);
        const healthy = groupServices.filter(s => s.status === 'healthy').length;
        return (
          <div key={group} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-gray-800/50 flex items-center justify-between">
              <h2 className="font-semibold">{group}</h2>
              <span className={`text-sm ${healthy === groupServices.length ? 'text-emerald-400' : 'text-yellow-400'}`}>
                {healthy}/{groupServices.length} healthy
              </span>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-gray-500">
                  <th className="text-left p-3 font-medium">Service</th>
                  <th className="text-left p-3 font-medium">Type</th>
                  <th className="text-left p-3 font-medium">Status</th>
                  <th className="text-right p-3 font-medium">Response Time</th>
                </tr>
              </thead>
              <tbody>
                {groupServices.map(svc => (
                  <tr key={svc.name} className="border-b border-gray-800/30 hover:bg-gray-800/30">
                    <td className="p-3 text-gray-200">{svc.name}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 bg-gray-800 rounded text-xs text-gray-400">{svc.type.toUpperCase()}</span>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        svc.status === 'healthy' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                      }`}>
                        {svc.status === 'healthy' ? 'UP' : 'DOWN'}
                      </span>
                    </td>
                    <td className="p-3 text-right text-gray-400">{svc.responseTime}ms</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}
