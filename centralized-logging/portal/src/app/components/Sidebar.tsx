'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/', label: 'Dashboard', icon: '📊' },
  { href: '/explore', label: 'Explore', icon: '🔍' },
  { href: '/streams', label: 'Streams', icon: '📡' },
  { href: '/alerts', label: 'Alerts', icon: '🔔' },
];

export function Sidebar() {
  const pathname = usePathname();
  const grafanaUrl = typeof window !== 'undefined' ? 'http://localhost:3008' : '#';

  return (
    <aside className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col">
      <div className="p-4 border-b border-gray-800">
        <h1 className="text-xl font-bold text-amber-400">Centralized Logging</h1>
        <p className="text-xs text-gray-500 mt-1">Loki + Promtail</p>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-amber-500/20 text-amber-400 font-medium'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t border-gray-800">
        <a
          href={grafanaUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-amber-400 transition-colors"
        >
          <span>📈</span> Open Grafana
          <span className="ml-auto text-xs">↗</span>
        </a>
      </div>
    </aside>
  );
}
