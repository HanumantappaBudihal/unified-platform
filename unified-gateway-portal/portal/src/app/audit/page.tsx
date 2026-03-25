'use client';
import { useEffect, useState } from 'react';

const actionColors: Record<string, string> = {
  'app.registered': 'bg-blue-100 text-blue-700',
  'app.onboarded': 'bg-emerald-100 text-emerald-700',
  'app.promoted': 'bg-violet-100 text-violet-700',
  'app.decommissioned': 'bg-red-100 text-red-700',
  'resource.added': 'bg-amber-100 text-amber-700',
  'resource.removed': 'bg-gray-100 text-gray-600',
  'team.created': 'bg-cyan-100 text-cyan-700',
};

export default function AuditPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/platform/audit?limit=100')
      .then(r => r.json())
      .then(data => setLogs(data.logs || []))
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Audit Log</h1>
      <p className="text-sm text-gray-500 mb-8">Track all platform operations — who did what, when.</p>

      {loading ? (
        <div className="text-center py-20 text-gray-400">Loading audit log...</div>
      ) : logs.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-gray-200 rounded-xl">
          <p className="text-gray-500">No audit entries yet. Actions will appear here as apps are onboarded.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Time</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Actor</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Action</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Resource</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-5 py-3 text-xs text-gray-400 whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="px-5 py-3 text-xs font-mono text-gray-600">{log.actor}</td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${actionColors[log.action] || 'bg-gray-100 text-gray-600'}`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-xs text-gray-600">
                    <span className="text-gray-400">{log.resource_type}/</span>
                    {log.resource_id}
                  </td>
                  <td className="px-5 py-3 text-xs text-gray-400 max-w-xs truncate">
                    {JSON.stringify(log.details)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
