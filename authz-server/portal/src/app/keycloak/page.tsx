'use client';

export default function KeycloakPage() {
  const keycloakUrl = process.env.NEXT_PUBLIC_KEYCLOAK_URL || 'http://localhost:8080';

  return (
    <div className="p-6 lg:p-8 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Keycloak Admin</h1>
        <p className="text-sm text-gray-500 mt-1">Authentication server — manage users, realms, and SSO clients</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <a
          href={`${keycloakUrl}/admin`}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-white border border-gray-200 rounded-xl p-6 hover:border-blue-300 hover:bg-blue-50/30 transition-all group"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="text-blue-700 text-lg">⚙</span>
            </div>
            <h2 className="text-lg font-semibold text-gray-900 group-hover:text-blue-700">Admin Console</h2>
          </div>
          <p className="text-sm text-gray-500">
            Manage realms, users, groups, roles, and OIDC clients. Full Keycloak administration.
          </p>
          <p className="text-xs text-blue-600 mt-3 font-medium">Open {keycloakUrl}/admin →</p>
        </a>

        <a
          href={`${keycloakUrl}/realms/infrastructure/account`}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-white border border-gray-200 rounded-xl p-6 hover:border-amber-300 hover:bg-amber-50/30 transition-all group"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <span className="text-amber-700 text-lg">⧉</span>
            </div>
            <h2 className="text-lg font-semibold text-gray-900 group-hover:text-amber-700">Account Console</h2>
          </div>
          <p className="text-sm text-gray-500">
            Self-service account management for infrastructure realm users.
          </p>
          <p className="text-xs text-amber-600 mt-3 font-medium">Open Account Console →</p>
        </a>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Realms</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <h3 className="text-sm font-semibold text-gray-900">infrastructure</h3>
            </div>
            <p className="text-xs text-gray-500 mb-3">For infra portals — Kafka, Redis, MinIO, Gateway, Grafana</p>
            <div className="flex flex-wrap gap-1.5">
              {['gateway-portal', 'kafka-portal', 'cache-portal', 'storage-portal', 'grafana', 'minio-console'].map(c => (
                <span key={c} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">{c}</span>
              ))}
            </div>
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <h3 className="text-sm font-semibold text-gray-900">applications</h3>
            </div>
            <p className="text-xs text-gray-500 mb-3">For end-user apps — task manager, SPAs, backend services</p>
            <div className="flex flex-wrap gap-1.5">
              {['task-manager', 'task-manager-api', 'sample-web-app', 'sample-backend-svc'].map(c => (
                <span key={c} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">{c}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-4">
        <p className="text-xs text-blue-700">
          <strong>Auth Server</strong> runs separately at <code className="bg-blue-100 px-1 rounded">:8080</code>.
          Start it with: <code className="bg-blue-100 px-1 rounded">cd auth-server && docker compose up -d</code>
        </p>
      </div>
    </div>
  );
}
