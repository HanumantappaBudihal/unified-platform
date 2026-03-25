'use client';

import Link from 'next/link';
import { config } from '@/lib/config';

const colorMap: Record<string, { bg: string; border: string; text: string; icon: string }> = {
  blue: { bg: 'bg-blue-50', border: 'border-blue-200 hover:border-blue-300', text: 'text-blue-700', icon: 'bg-blue-100' },
  green: { bg: 'bg-emerald-50', border: 'border-emerald-200 hover:border-emerald-300', text: 'text-emerald-700', icon: 'bg-emerald-100' },
  purple: { bg: 'bg-violet-50', border: 'border-violet-200 hover:border-violet-300', text: 'text-violet-700', icon: 'bg-violet-100' },
  yellow: { bg: 'bg-amber-50', border: 'border-amber-200 hover:border-amber-300', text: 'text-amber-700', icon: 'bg-amber-100' },
  pink: { bg: 'bg-pink-50', border: 'border-pink-200 hover:border-pink-300', text: 'text-pink-700', icon: 'bg-pink-100' },
};

export default function TeamsPage() {
  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-800 mb-2">Teams</h1>
      <p className="text-slate-500 text-sm mb-8">View topics scoped to each team&apos;s domain</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {config.teams.map((team) => {
          const colors = colorMap[team.color] || colorMap.blue;
          return (
            <Link key={team.id} href={`/teams/${team.id}`}>
              <div className={`bg-white border ${colors.border} rounded-2xl p-6 shadow-sm hover:shadow-md transition-all cursor-pointer`}>
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-10 h-10 ${colors.icon} rounded-xl flex items-center justify-center`}>
                    <svg className={`w-5 h-5 ${colors.text}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <h3 className={`text-lg font-semibold ${colors.text}`}>{team.name}</h3>
                </div>
                <p className="text-sm text-slate-500">
                  Topic prefix: <code className="text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded text-xs">{team.prefix}*</code>
                </p>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-xs text-slate-400">Click to view topics</span>
                  <svg className={`w-4 h-4 ${colors.text}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Onboarding Info */}
      <div className="card mt-8">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Onboarding a New Team</h2>
        <ol className="space-y-2.5 text-sm text-slate-600 list-decimal list-inside">
          <li>Choose a domain prefix (e.g., <code className="text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded text-xs">payments</code>)</li>
          <li>Define topic names: <code className="text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded text-xs">payments.stripe.payment-completed</code></li>
          <li>Create topics via Kafka UI or CLI</li>
          <li>Create corresponding DLQ topics (<code className="text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded text-xs">.dlq</code> suffix)</li>
          <li>Register schemas in Schema Registry if using Avro/Protobuf</li>
          <li>Add team role in <code className="text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded text-xs">config/kafka-ui/roles.yml</code></li>
          <li>Add team config in <code className="text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded text-xs">portal/src/lib/config.ts</code></li>
        </ol>
      </div>
    </div>
  );
}
