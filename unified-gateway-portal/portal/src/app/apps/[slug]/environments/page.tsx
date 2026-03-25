'use client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

const ENV_ORDER = ['dev', 'staging', 'prod'];

const envColors: Record<string, { bg: string; text: string; border: string }> = {
  dev: { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200' },
  staging: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  prod: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
};

const resourceLabels: Record<string, string> = {
  postgres: 'PostgreSQL',
  redis: 'Redis',
  kafka: 'Kafka',
  minio: 'MinIO',
  keycloak: 'Keycloak',
  kong: 'Kong',
  opa: 'OPA',
};

export default function EnvironmentsPage() {
  const { slug } = useParams<{ slug: string }>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [promoting, setPromoting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchData = () => {
    fetch(`/api/platform/apps/${slug}/environments`)
      .then(r => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, [slug]);

  const promote = async (sourceEnv: string, targetEnv: string) => {
    setPromoting(targetEnv);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/platform/apps/${slug}/promote/${targetEnv}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceEnvironment: sourceEnv }),
      });

      const result = await res.json();

      if (!res.ok) {
        setError(result.error || 'Promotion failed');
      } else {
        setSuccess(`Promoted to ${targetEnv} (${Object.keys(result.results || {}).length} resources provisioned)`);
        fetchData();
      }
    } catch {
      setError('Network error during promotion');
    } finally {
      setPromoting(null);
    }
  };

  if (loading) return <div className="text-center py-20 text-gray-400">Loading...</div>;
  if (!data) return <div className="text-center py-20 text-gray-500">App not found</div>;

  const environments: any[] = data.environments || [];

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
        <Link href="/apps" className="hover:text-gray-600">Applications</Link>
        <span>/</span>
        <Link href={`/apps/${slug}`} className="hover:text-gray-600">{data.app?.name || slug}</Link>
        <span>/</span>
        <span className="text-gray-700">Environments</span>
      </div>

      <h1 className="text-2xl font-bold text-gray-900 mb-2">Environments</h1>
      <p className="text-sm text-gray-500 mb-8">
        Manage environment deployments for <span className="font-mono text-gray-700">{slug}</span>. Promote resources from dev to staging to prod.
      </p>

      {/* Status messages */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700">
          {success}
        </div>
      )}

      {/* Environment pipeline */}
      <div className="flex items-start gap-4 mb-10">
        {ENV_ORDER.map((envSlug, idx) => {
          const env = environments.find((e: any) => e.slug === envSlug);
          const ec = envColors[envSlug] || { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200' };
          const isProvisioned = env?.provisioned;
          const prevEnv = idx > 0 ? ENV_ORDER[idx - 1] : null;
          const prevProvisioned = prevEnv ? environments.find((e: any) => e.slug === prevEnv)?.provisioned : false;
          const canPromote = prevProvisioned && !isProvisioned;

          return (
            <div key={envSlug} className="flex items-start gap-4 flex-1">
              <div className={`flex-1 border rounded-xl p-5 ${ec.border} ${ec.bg}`}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className={`text-sm font-bold uppercase tracking-wider ${ec.text}`}>
                    {envSlug}
                  </h3>
                  <span className={`w-2.5 h-2.5 rounded-full ${isProvisioned ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                </div>

                {isProvisioned ? (
                  <div className="space-y-2">
                    {env.resources.map((r: any) => (
                      <div key={r.type} className="flex items-center justify-between text-xs">
                        <span className="text-gray-600">{resourceLabels[r.type] || r.type}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                          r.status === 'provisioned' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {r.status}
                        </span>
                      </div>
                    ))}
                    <p className="text-[10px] text-gray-400 mt-2">
                      {env.resourceCount} resource{env.resourceCount !== 1 ? 's' : ''}
                    </p>
                  </div>
                ) : (
                  <div className="text-xs text-gray-400 py-4 text-center">
                    Not provisioned
                  </div>
                )}

                {/* Promote button */}
                {canPromote && (
                  <button
                    onClick={() => promote(prevEnv!, envSlug)}
                    disabled={promoting !== null}
                    className={`mt-4 w-full py-2 px-3 rounded-lg text-xs font-semibold transition-colors ${
                      promoting === envSlug
                        ? 'bg-gray-200 text-gray-500 cursor-wait'
                        : 'bg-violet-600 text-white hover:bg-violet-700'
                    }`}
                  >
                    {promoting === envSlug ? 'Promoting...' : `Promote from ${prevEnv}`}
                  </button>
                )}
              </div>

              {/* Arrow between environments */}
              {idx < ENV_ORDER.length - 1 && (
                <div className="flex items-center pt-8 text-gray-300 text-xl font-light select-none">
                  →
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Detailed resource comparison table */}
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Resource Comparison</h2>
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Resource</th>
              {ENV_ORDER.map(env => (
                <th key={env} className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {env}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {['postgres', 'redis', 'kafka', 'minio', 'keycloak', 'kong', 'opa'].map(resType => (
              <tr key={resType} className="hover:bg-gray-50">
                <td className="px-5 py-3 font-medium text-gray-700">{resourceLabels[resType]}</td>
                {ENV_ORDER.map(envSlug => {
                  const env = environments.find((e: any) => e.slug === envSlug);
                  const resource = env?.resources?.find((r: any) => r.type === resType);
                  return (
                    <td key={envSlug} className="px-5 py-3 text-center">
                      {resource ? (
                        <span className={`inline-block w-2 h-2 rounded-full ${
                          resource.status === 'provisioned' ? 'bg-emerald-500' : 'bg-amber-500'
                        }`} />
                      ) : (
                        <span className="inline-block w-2 h-2 rounded-full bg-gray-200" />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
