'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/', label: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1' },
  { href: '/keys', label: 'Keys', icon: 'M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z' },
  { href: '/apps', label: 'Applications', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' },
  { href: '/pubsub', label: 'Pub/Sub', icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z' },
];

const toolItems = [
  { href: '/tools/redis-insight', label: 'Redis Insight' },
  { href: '/tools/grafana', label: 'Grafana' },
  { href: '/tools/prometheus', label: 'Prometheus' },
  { href: '/tools/alertmanager', label: 'Alertmanager' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col h-screen fixed left-0 top-0">
      <div className="p-5 border-b border-slate-200">
        <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2 8 4 8 4s8-2 8-4V7M4 7c0 2 8 4 8 4s8-2 8-4M4 7c0-2 8-4 8-4s8 2 8 4m0 5c0 2-8 4-8 4s-8-2-8-4" />
          </svg>
          Cache Server
        </h1>
        <p className="text-xs text-slate-500 mt-1">Redis Cluster Management</p>
      </div>

      <nav className="flex-1 p-3 overflow-y-auto">
        <div className="mb-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-3 mb-2">Navigation</p>
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all mb-1 ${
                  active
                    ? 'bg-red-50 text-red-700 border border-red-200'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                </svg>
                {item.label}
              </Link>
            );
          })}
        </div>

        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-3 mb-2">Tools</p>
          {toolItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all mb-1 ${
                  active
                    ? 'bg-red-50 text-red-700 border border-red-200'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                </svg>
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="p-4 border-t border-slate-200">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          Redis Cluster v7.4
        </div>
      </div>
    </aside>
  );
}
