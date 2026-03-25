'use client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

const resourceColors: Record<string, { bg: string; text: string; label: string }> = {
  postgres: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'PostgreSQL' },
  redis: { bg: 'bg-red-100', text: 'text-red-700', label: 'Redis' },
  kafka: { bg: 'bg-indigo-100', text: 'text-indigo-700', label: 'Kafka' },
  minio: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'MinIO' },
  keycloak: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Keycloak' },
  kong: { bg: 'bg-cyan-100', text: 'text-cyan-700', label: 'Kong' },
  opa: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'OPA' },
};

export default function AppDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [app, setApp] = useState<any>(null);
  const [resources, setResources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCredentials, setShowCredentials] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetch(`/api/platform/apps/${slug}`)
      .then(r => r.json())
      .then(data => {
        setApp(data.app);
        setResources(data.resources || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <div className="text-center py-20 text-gray-400">Loading...</div>;
  if (!app) return <div className="text-center py-20 text-gray-500">App not found</div>;

  const dataResources = resources.filter(r => ['postgres', 'redis', 'kafka', 'minio'].includes(r.resource_type));
  const infraResources = resources.filter(r => ['keycloak', 'kong', 'opa'].includes(r.resource_type));

  const statusColor = app.status === 'active' ? 'bg-emerald-500' : app.status === 'partial' ? 'bg-amber-500' : 'bg-gray-400';

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
        <Link href="/apps" className="hover:text-gray-600">Applications</Link>
        <span>/</span>
        <span className="text-gray-700">{app.name}</span>
      </div>

      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{app.name}</h1>
            <span className={`w-2.5 h-2.5 rounded-full ${statusColor}`} />
          </div>
          <p className="text-sm text-gray-400 font-mono mt-0.5">{app.slug}</p>
          {app.description && <p className="text-sm text-gray-500 mt-2">{app.description}</p>}
        </div>
        <div className="text-right text-sm text-gray-400">
          <p>Owner: <span className="text-gray-600">{app.owner_id}</span></p>
          <p>Created: {new Date(app.created_at).toLocaleDateString()}</p>
        </div>
      </div>

      {/* Data Resources */}
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Data Resources</h2>
      {dataResources.length === 0 ? (
        <p className="text-sm text-gray-400 mb-8">No data resources provisioned</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {dataResources.map(r => {
            const rc = resourceColors[r.resource_type] || { bg: 'bg-gray-100', text: 'text-gray-600', label: r.resource_type };
            const credKey = `${r.resource_type}-${r.environment}`;
            return (
              <div key={r.id} className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${rc.bg} ${rc.text}`}>
                      {rc.label}
                    </span>
                    <span className="text-xs text-gray-400 px-2 py-0.5 bg-gray-100 rounded">
                      {r.environment}
                    </span>
                  </div>
                  <span className={`w-2 h-2 rounded-full ${r.status === 'provisioned' ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                </div>

                {/* Config */}
                <div className="text-xs text-gray-500 space-y-1 mb-3">
                  {Object.entries(r.config || {}).map(([k, v]) => (
                    <div key={k} className="flex justify-between">
                      <span className="text-gray-400">{k}:</span>
                      <span className="font-mono text-gray-600">{String(v)}</span>
                    </div>
                  ))}
                </div>

                {/* Credentials toggle */}
                <button
                  onClick={() => setShowCredentials(prev => ({ ...prev, [credKey]: !prev[credKey] }))}
                  className="text-xs text-violet-600 hover:text-violet-800 font-medium"
                >
                  {showCredentials[credKey] ? 'Hide Credentials' : 'Show Credentials'}
                </button>
                {showCredentials[credKey] && (
                  <pre className="mt-2 p-3 bg-gray-50 rounded-lg text-xs font-mono text-gray-600 overflow-x-auto">
                    {JSON.stringify(r.credentials, null, 2)}
                  </pre>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Infrastructure Resources */}
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Infrastructure</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {infraResources.map(r => {
          const rc = resourceColors[r.resource_type] || { bg: 'bg-gray-100', text: 'text-gray-600', label: r.resource_type };
          return (
            <div key={r.id} className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className={`px-2 py-0.5 rounded text-xs font-bold ${rc.bg} ${rc.text}`}>{rc.label}</span>
                <span className={`w-1.5 h-1.5 rounded-full ${r.status === 'provisioned' ? 'bg-emerald-500' : 'bg-gray-400'}`} />
              </div>
              <div className="text-xs text-gray-500 space-y-0.5">
                {Object.entries(r.config || {}).slice(0, 3).map(([k, v]) => (
                  <div key={k}><span className="text-gray-400">{k}:</span> <span className="font-mono">{String(v)}</span></div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Links */}
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Quick Links</h2>
      <div className="flex flex-wrap gap-3">
        <Link href={`/apps/${slug}/environments`} className="px-4 py-2 bg-violet-50 text-violet-700 rounded-lg text-sm font-medium hover:bg-violet-100">
          Environments &amp; Promotion
        </Link>
        {dataResources.some(r => r.resource_type === 'kafka') && (
          <Link href="/event-streaming/topics" className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-100">
            View Topics
          </Link>
        )}
        {dataResources.some(r => r.resource_type === 'redis') && (
          <Link href="/cache/keys" className="px-4 py-2 bg-red-50 text-red-700 rounded-lg text-sm font-medium hover:bg-red-100">
            View Keys
          </Link>
        )}
        {dataResources.some(r => r.resource_type === 'minio') && (
          <Link href="/storage/browse" className="px-4 py-2 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-medium hover:bg-emerald-100">
            Browse Files
          </Link>
        )}
      </div>
    </div>
  );
}
