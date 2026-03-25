'use client';

import { useEffect, useState } from 'react';

interface AppInfo {
  id: string;
  name: string;
  prefix: string;
  color: string;
  description: string;
}

interface AppStats {
  [appId: string]: { keyCount: number };
}

const apps: AppInfo[] = [
  { id: 'session-svc', name: 'Session Service', prefix: 'sessions:*', color: 'blue', description: 'User sessions & rate limiting' },
  { id: 'catalog-svc', name: 'Catalog Service', prefix: 'catalog:*', color: 'green', description: 'Product cache & invalidation' },
];

const colorMap: Record<string, { bg: string; border: string; dot: string; text: string }> = {
  blue: { bg: 'bg-blue-50', border: 'border-blue-200', dot: 'bg-blue-500', text: 'text-blue-700' },
  green: { bg: 'bg-green-50', border: 'border-green-200', dot: 'bg-green-500', text: 'text-green-700' },
};

const codeSnippets: Record<string, string> = {
  'session-svc': `import { createClient } from 'redis';

const client = createClient({
  url: 'redis://\${REDIS_USERNAME}:\${REDIS_PASSWORD}@localhost:6371'
});

await client.connect();

// Store a session
await client.set('sessions:user-123', JSON.stringify({
  userId: '123',
  token: 'abc',
  expiresAt: Date.now() + 3600000
}), { EX: 3600 });

// Retrieve a session
const session = await client.get('sessions:user-123');`,

  'catalog-svc': `import { createClient } from 'redis';

const client = createClient({
  url: 'redis://\${REDIS_USERNAME}:\${REDIS_PASSWORD}@localhost:6371'
});

await client.connect();

// Cache a product
await client.set('catalog:product-456', JSON.stringify({
  id: '456',
  name: 'Widget',
  price: 29.99
}), { EX: 1800 });

// Retrieve cached product
const product = await client.get('catalog:product-456');`,
};

export default function AppsPage() {
  const [stats, setStats] = useState<AppStats>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/apps')
      .then((res) => res.json())
      .then((data) => setStats(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-1">Applications</h1>
      <p className="text-sm text-slate-500 mb-6">Registered services using the cache cluster</p>

      {/* App Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        {apps.map((app) => {
          const c = colorMap[app.color] || colorMap.blue;
          const keyCount = stats[app.id]?.keyCount;
          return (
            <div key={app.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${c.dot}`} />
                  <div>
                    <h3 className="font-semibold text-slate-800">{app.name}</h3>
                    <p className="text-sm text-slate-500 mt-0.5">{app.description}</p>
                  </div>
                </div>
                <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${c.bg} ${c.text} border ${c.border}`}>
                  {app.id}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 rounded-xl p-3">
                  <div className="text-xs text-slate-500 font-medium">Key Prefix</div>
                  <div className="font-mono text-sm text-slate-800 mt-1">{app.prefix}</div>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <div className="text-xs text-slate-500 font-medium">Key Count</div>
                  <div className="text-sm font-semibold text-slate-800 mt-1">
                    {loading ? (
                      <span className="text-slate-400">Loading...</span>
                    ) : keyCount !== undefined ? (
                      keyCount.toLocaleString()
                    ) : (
                      <span className="text-slate-400">N/A</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-4 bg-slate-50 rounded-xl p-3">
                <div className="text-xs text-slate-500 font-medium">Connection</div>
                <div className="font-mono text-xs text-slate-600 mt-1">redis://admin:***@localhost:6371</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* How to Connect */}
      <h2 className="text-lg font-semibold text-slate-800 mb-4">How to Connect</h2>
      <div className="space-y-6">
        {apps.map((app) => (
          <div key={app.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
              <div className={`w-2.5 h-2.5 rounded-full ${colorMap[app.color]?.dot || 'bg-slate-400'}`} />
              <span className="text-sm font-medium text-slate-700">{app.name}</span>
            </div>
            <pre className="p-5 text-xs text-slate-700 overflow-x-auto bg-slate-50 leading-relaxed">
              {codeSnippets[app.id]}
            </pre>
          </div>
        ))}
      </div>
    </div>
  );
}
