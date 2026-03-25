'use client';
import { useEffect, useState } from 'react';

interface AppInfo {
  name: string;
  users: { username: string; role: string; projects?: Record<string, string> }[];
}

export default function AppsPage() {
  const [apps, setApps] = useState<AppInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/opa?path=/v1/data/roles/users')
      .then(r => r.json())
      .then(data => {
        const users = data.result || {};
        const appMap: Record<string, AppInfo> = {};

        Object.entries(users).forEach(([username, userData]) => {
          const u = userData as { apps?: Record<string, { role: string; projects?: Record<string, string> }> };
          if (!u.apps) return;
          Object.entries(u.apps).forEach(([appName, appData]) => {
            if (!appMap[appName]) appMap[appName] = { name: appName, users: [] };
            appMap[appName].users.push({ username, role: appData.role, projects: appData.projects });
          });
        });

        setApps(Object.values(appMap).sort((a, b) => a.name.localeCompare(b.name)));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const infraApps = apps.filter(a =>
    ['gateway-portal', 'kafka-portal', 'cache-portal', 'storage-portal', 'grafana', 'minio-console'].includes(a.name)
  );
  const userApps = apps.filter(a =>
    !['gateway-portal', 'kafka-portal', 'cache-portal', 'storage-portal', 'grafana', 'minio-console'].includes(a.name)
  );

  const AppCard = ({ app }: { app: AppInfo }) => (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900">{app.name}</h3>
        <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded">
          {app.users.length} user{app.users.length !== 1 ? 's' : ''}
        </span>
      </div>
      <div className="space-y-2">
        {app.users.map(u => (
          <div key={u.username} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
            <span className="text-sm text-gray-700">{u.username}</span>
            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded">{u.role}</span>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="p-6 lg:p-8 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Applications</h1>
        <p className="text-sm text-gray-500 mt-1">Applications registered in OPA with their user access</p>
      </div>

      {loading ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <p className="text-gray-400">Loading applications...</p>
        </div>
      ) : (
        <>
          {infraApps.length > 0 && (
            <div className="mb-8">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Infrastructure Portals</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {infraApps.map(app => <AppCard key={app.name} app={app} />)}
              </div>
            </div>
          )}

          {userApps.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">User Applications</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {userApps.map(app => <AppCard key={app.name} app={app} />)}
              </div>
            </div>
          )}

          {apps.length === 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
              <p className="text-gray-400">No applications found.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
