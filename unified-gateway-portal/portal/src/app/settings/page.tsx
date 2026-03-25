'use client';
import { config } from '@/lib/config';

export default function SettingsPage() {
  const credentials = [
    { server: 'Kafka', service: 'Kafka Portal', url: 'http://localhost:3001', auth: 'No auth' },
    { server: 'Kafka', service: 'Kafka UI', url: 'http://localhost:8080', auth: 'See .env (KAFKA_UI_*)' },
    { server: 'Kafka', service: 'Grafana', url: 'http://localhost:3000', auth: 'See .env (GRAFANA_*)' },
    { server: 'Redis', service: 'Cache Portal', url: 'http://localhost:3002', auth: 'No auth' },
    { server: 'Redis', service: 'Redis Insight', url: 'http://localhost:5540', auth: 'No auth' },
    { server: 'Redis', service: 'Redis CLI', url: 'redis-cli -c -h localhost -p 6371', auth: 'See .env (REDIS_ADMIN_*)' },
    { server: 'Redis', service: 'Grafana', url: 'http://localhost:3003', auth: 'See .env (GRAFANA_*)' },
    { server: 'MinIO', service: 'Storage Portal', url: 'http://localhost:3004', auth: 'No auth' },
    { server: 'MinIO', service: 'MinIO Console', url: 'http://localhost:9001', auth: 'See .env (MINIO_ROOT_*)' },
    { server: 'MinIO', service: 'S3 API', url: 'http://localhost:9000', auth: 'Access/Secret keys per app' },
    { server: 'MinIO', service: 'Grafana', url: 'http://localhost:3005', auth: 'See .env (GRAFANA_*)' },
  ];

  const appCredentials = [
    { app: 'session-svc', server: 'Redis', key: 'session-svc', secret: 'See .env', scope: 'sessions:*' },
    { app: 'catalog-svc', server: 'Redis', key: 'catalog-svc', secret: 'See .env', scope: 'catalog:*' },
    { app: 'document-svc', server: 'MinIO', key: 'See .env', secret: 'See .env', scope: 'document-svc bucket' },
    { app: 'media-svc', server: 'MinIO', key: 'See .env', secret: 'See .env', scope: 'media-svc bucket' },
    { app: 'hr-portal', server: 'MinIO', key: 'See .env', secret: 'See .env', scope: 'hr-portal bucket' },
    { app: 'analytics-svc', server: 'MinIO', key: 'See .env', secret: 'See .env', scope: 'analytics-svc bucket' },
  ];

  const serverBadge: Record<string, string> = {
    Kafka: 'bg-indigo-100 text-indigo-700 ring-1 ring-indigo-200',
    Redis: 'bg-red-100 text-red-700 ring-1 ring-red-200',
    MinIO: 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200',
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-8 animate-fade-in-up">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">Settings</h1>
        <p className="text-gray-500 text-sm mt-1">Port map, credentials, and configuration reference</p>
      </div>

      <Section title="Complete Port Map" count={`${config.services.length} services`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Port</th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Service</th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Server</th>
              </tr>
            </thead>
            <tbody>
              {config.services.sort((a, b) => a.port - b.port).map((svc) => {
                const l: Record<string, string> = { kafka: 'Kafka', redis: 'Redis', minio: 'MinIO' };
                return (
                  <tr key={`${svc.port}-${svc.name}`} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 font-mono text-xs text-gray-500">{svc.port}</td>
                    <td className="px-5 py-3 text-gray-900 font-medium">{svc.name}</td>
                    <td className="px-5 py-3">
                      <span className={`px-2.5 py-1 rounded-md text-[11px] font-medium ${serverBadge[l[svc.server]]}`}>{l[svc.server]}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Service Credentials" className="mt-6">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Server</th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Service</th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">URL / Command</th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Auth</th>
              </tr>
            </thead>
            <tbody>
              {credentials.map((c, i) => (
                <tr key={i} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3"><span className={`px-2.5 py-1 rounded-md text-[11px] font-medium ${serverBadge[c.server]}`}>{c.server}</span></td>
                  <td className="px-5 py-3 text-gray-900 font-medium">{c.service}</td>
                  <td className="px-5 py-3 font-mono text-xs text-gray-500 hidden sm:table-cell max-w-[200px] truncate">{c.url}</td>
                  <td className="px-5 py-3 font-mono text-xs text-gray-600">{c.auth}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Application Credentials" subtitle="Per-app isolated access keys" className="mt-6">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Application</th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Server</th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Access Key</th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Secret</th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Scope</th>
              </tr>
            </thead>
            <tbody>
              {appCredentials.map((c, i) => (
                <tr key={i} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 font-medium text-gray-900">{c.app}</td>
                  <td className="px-5 py-3"><span className={`px-2.5 py-1 rounded-md text-[11px] font-medium ${serverBadge[c.server]}`}>{c.server}</span></td>
                  <td className="px-5 py-3 font-mono text-xs text-gray-600 hidden sm:table-cell">{c.key}</td>
                  <td className="px-5 py-3 font-mono text-xs text-gray-500 hidden md:table-cell">{c.secret}</td>
                  <td className="px-5 py-3 font-mono text-xs text-gray-500">{c.scope}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}

function Section({ title, subtitle, count, className = '', children }: { title: string; subtitle?: string; count?: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-200 overflow-hidden ${className}`}>
      <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-gray-900">{title}</h2>
          {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
        {count && <span className="text-xs text-gray-400">{count}</span>}
      </div>
      {children}
    </div>
  );
}
