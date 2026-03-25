'use client';
import { useEffect, useState } from 'react';

interface OpaHealth {
  opa: string;
}

interface PolicyCount {
  policies: number;
  users: number;
  apps: number;
}

export default function Dashboard() {
  const [health, setHealth] = useState<OpaHealth | null>(null);
  const [stats, setStats] = useState<PolicyCount>({ policies: 0, users: 0, apps: 0 });
  const [lastUpdated, setLastUpdated] = useState('');

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [healthRes, policiesRes, rolesRes] = await Promise.all([
          fetch('/api/health').then(r => r.json()),
          fetch('/api/opa?path=/v1/policies').then(r => r.json()),
          fetch('/api/opa?path=/v1/data/roles').then(r => r.json()),
        ]);
        setHealth(healthRes);

        const policyCount = healthRes.opa === 'healthy' && policiesRes.result
          ? policiesRes.result.filter((p: { id: string }) => !p.id.startsWith('system')).length
          : 0;

        const rolesData = rolesRes.result;
        const userCount = rolesData?.users ? Object.keys(rolesData.users).length : 0;

        const appSet = new Set<string>();
        if (rolesData?.users) {
          Object.values(rolesData.users).forEach((u: unknown) => {
            const user = u as { apps?: Record<string, unknown> };
            if (user.apps) Object.keys(user.apps).forEach(a => appSet.add(a));
          });
        }

        setStats({ policies: policyCount, users: userCount, apps: appSet.size });
        setLastUpdated(new Date().toLocaleTimeString());
      } catch {
        setHealth({ opa: 'offline' });
      }
    };
    fetchAll();
    const interval = setInterval(fetchAll, 15000);
    return () => clearInterval(interval);
  }, []);

  const cards = [
    {
      label: 'OPA Status',
      value: health?.opa === 'healthy' ? 'Online' : health?.opa === 'offline' ? 'Offline' : 'Checking...',
      color: health?.opa === 'healthy' ? 'emerald' : 'red',
      icon: '◉',
    },
    { label: 'Policies Loaded', value: stats.policies.toString(), color: 'amber', icon: '◈' },
    { label: 'Users Configured', value: stats.users.toString(), color: 'blue', icon: '⧉' },
    { label: 'Applications', value: stats.apps.toString(), color: 'violet', icon: '⊞' },
  ];

  const colorClasses: Record<string, { bg: string; border: string; text: string; iconBg: string }> = {
    emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', iconBg: 'bg-emerald-100' },
    red: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', iconBg: 'bg-red-100' },
    amber: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', iconBg: 'bg-amber-100' },
    blue: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', iconBg: 'bg-blue-100' },
    violet: { bg: 'bg-violet-50', border: 'border-violet-200', text: 'text-violet-700', iconBg: 'bg-violet-100' },
  };

  return (
    <div className="p-6 lg:p-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Authorization Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          OPA Policy Engine — manage roles, policies, and test authorization decisions
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map((card, i) => {
          const c = colorClasses[card.color];
          return (
            <div key={card.label} className={`${c.bg} border ${c.border} rounded-xl p-5 opacity-0 animate-fade-in-up stagger-${i + 1}`}>
              <div className="flex items-center justify-between mb-3">
                <span className={`w-9 h-9 ${c.iconBg} rounded-lg flex items-center justify-center text-base`}>{card.icon}</span>
              </div>
              <p className={`text-2xl font-bold ${c.text}`}>{card.value}</p>
              <p className="text-xs text-gray-500 mt-1">{card.label}</p>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <a href="/playground" className="flex items-center gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200 hover:bg-amber-100 transition-colors">
              <span className="text-lg">▶</span>
              <div>
                <p className="text-sm font-medium text-gray-900">Test a Policy Decision</p>
                <p className="text-xs text-gray-500">Try an authorization query in the playground</p>
              </div>
            </a>
            <a href="/roles" className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 border border-blue-200 hover:bg-blue-100 transition-colors">
              <span className="text-lg">⧉</span>
              <div>
                <p className="text-sm font-medium text-gray-900">Manage User Roles</p>
                <p className="text-xs text-gray-500">Add users, assign app roles and project permissions</p>
              </div>
            </a>
            <a href="/policies" className="flex items-center gap-3 p-3 rounded-lg bg-violet-50 border border-violet-200 hover:bg-violet-100 transition-colors">
              <span className="text-lg">◈</span>
              <div>
                <p className="text-sm font-medium text-gray-900">View Policies</p>
                <p className="text-xs text-gray-500">See all loaded Rego policies and their rules</p>
              </div>
            </a>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">How It Works</h2>
          <div className="space-y-4 text-sm text-gray-600">
            <div className="flex gap-3">
              <span className="w-6 h-6 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center text-xs font-bold shrink-0">1</span>
              <p>User logs in via <strong>Keycloak</strong> (Auth Server :8080) and gets a JWT token</p>
            </div>
            <div className="flex gap-3">
              <span className="w-6 h-6 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center text-xs font-bold shrink-0">2</span>
              <p>App sends action request to <strong>OPA</strong> with user, app, action, resource context</p>
            </div>
            <div className="flex gap-3">
              <span className="w-6 h-6 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center text-xs font-bold shrink-0">3</span>
              <p>OPA evaluates <strong>Rego policies</strong> against role data and returns allow/deny</p>
            </div>
            <div className="flex gap-3">
              <span className="w-6 h-6 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center text-xs font-bold shrink-0">4</span>
              <p>App enforces the decision — no authorization logic in application code</p>
            </div>
          </div>
        </div>
      </div>

      {lastUpdated && (
        <p className="text-xs text-gray-400 text-center">Last updated: {lastUpdated}</p>
      )}
    </div>
  );
}
