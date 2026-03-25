'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const nav = [
  { href: '/', label: 'Dashboard', icon: '◉' },
  { href: '/browse', label: 'File Browser', icon: '▤' },
  { href: '/apps', label: 'Applications', icon: '⧉' },
  { href: '/presign', label: 'Share Links', icon: '⟷' },
  { href: '/tools/console', label: 'MinIO Console', icon: '⊞' },
  { href: '/tools/grafana', label: 'Grafana', icon: '◫' },
  { href: '/tools/prometheus', label: 'Prometheus', icon: '◎' },
  { href: '/tools/alertmanager', label: 'Alertmanager', icon: '⚠' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-gray-900 text-white flex flex-col h-screen fixed left-0 top-0">
      <div className="p-4 border-b border-gray-700">
        <h1 className="text-lg font-bold text-emerald-400">Storage Server</h1>
        <p className="text-xs text-gray-400 mt-1">MinIO Object Storage</p>
      </div>
      <nav className="flex-1 py-4 overflow-y-auto">
        {nav.map((item) => {
          const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                active
                  ? 'bg-emerald-600/20 text-emerald-400 border-r-2 border-emerald-400'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-gray-700 text-xs text-gray-500">
        Centralized Object Storage
      </div>
    </aside>
  );
}
