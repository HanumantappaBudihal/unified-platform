'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface AppResource {
  type: string;
  environment: string;
  status: string;
}

interface App {
  id: string;
  name: string;
  slug: string;
  description: string;
  owner_id: string;
  status: string;
  created_at: string;
  resources: AppResource[];
}

const resourceColors: Record<string, string> = {
  postgres: 'bg-blue-100 text-blue-700',
  redis: 'bg-red-100 text-red-700',
  kafka: 'bg-indigo-100 text-indigo-700',
  minio: 'bg-emerald-100 text-emerald-700',
  keycloak: 'bg-orange-100 text-orange-700',
  kong: 'bg-cyan-100 text-cyan-700',
  opa: 'bg-purple-100 text-purple-700',
};

const statusColors: Record<string, string> = {
  active: 'bg-emerald-500',
  partial: 'bg-amber-500',
  pending: 'bg-gray-400',
  decommissioned: 'bg-red-500',
};

export default function AppsPage() {
  const [apps, setApps] = useState<App[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/platform/apps')
      .then(r => r.json())
      .then(data => setApps(data.apps || []))
      .catch(() => setApps([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Applications</h1>
          <p className="text-sm text-gray-500 mt-1">
            {apps.length} app{apps.length !== 1 ? 's' : ''} registered on the platform
          </p>
        </div>
        <Link
          href="/apps/new"
          className="px-4 py-2.5 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 transition-colors shadow-sm"
        >
          + Onboard New App
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-400">Loading applications...</div>
      ) : apps.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-gray-200 rounded-xl">
          <div className="text-4xl mb-3">▦</div>
          <p className="text-gray-500 text-lg font-medium">No applications yet</p>
          <p className="text-gray-400 text-sm mt-1">Onboard your first app to provision infrastructure resources</p>
          <Link
            href="/apps/new"
            className="inline-block mt-5 px-5 py-2.5 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700"
          >
            + Onboard First App
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {apps.map(app => (
            <Link
              key={app.id}
              href={`/apps/${app.slug}`}
              className="block bg-white rounded-xl border border-gray-200 p-5 hover:border-violet-300 hover:shadow-md transition-all group"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900 group-hover:text-violet-700 transition-colors">
                    {app.name}
                  </h3>
                  <p className="text-xs text-gray-400 font-mono">{app.slug}</p>
                </div>
                <span className={`w-2.5 h-2.5 rounded-full mt-1.5 ${statusColors[app.status] || 'bg-gray-400'}`} />
              </div>

              {app.description && (
                <p className="text-sm text-gray-500 mb-3 line-clamp-2">{app.description}</p>
              )}

              <div className="flex flex-wrap gap-1.5 mb-3">
                {app.resources
                  .filter(r => ['postgres', 'redis', 'kafka', 'minio'].includes(r.type))
                  .map(r => (
                    <span
                      key={`${r.type}-${r.environment}`}
                      className={`px-2 py-0.5 rounded text-[11px] font-medium ${resourceColors[r.type] || 'bg-gray-100 text-gray-600'}`}
                    >
                      {r.type}
                    </span>
                  ))}
              </div>

              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>Owner: {app.owner_id}</span>
                <span>{new Date(app.created_at).toLocaleDateString()}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
