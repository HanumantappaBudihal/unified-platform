'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

interface NavItem { href: string; label: string; icon: string }

const navItems: NavItem[] = [
  { href: '/', label: 'Dashboard', icon: '◉' },
  { href: '/policies', label: 'Policies', icon: '◈' },
  { href: '/roles', label: 'Roles & Users', icon: '⧉' },
  { href: '/apps', label: 'Applications', icon: '⊞' },
  { href: '/playground', label: 'Playground', icon: '▶' },
  { href: '/audit', label: 'Decision Log', icon: '≡' },
];

const externalLinks: NavItem[] = [
  { href: '/keycloak', label: 'Keycloak Admin', icon: '⟶' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [opaHealth, setOpaHealth] = useState<'checking' | 'healthy' | 'offline'>('checking');
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const check = () => {
      fetch('/api/health')
        .then((r) => r.json())
        .then((d) => setOpaHealth(d.opa === 'healthy' ? 'healthy' : 'offline'))
        .catch(() => setOpaHealth('offline'));
    };
    check();
    const interval = setInterval(check, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname === href || pathname.startsWith(href + '/');
  };

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="p-5 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20">
            <span className="text-white text-lg font-black">Z</span>
          </div>
          <div>
            <h1 className="text-base font-bold text-gray-900 tracking-tight">AuthZ Server</h1>
            <p className="text-[11px] text-gray-500">Policy Management Portal</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto scrollbar-thin">
        <div className="mx-3 px-3 py-1.5 rounded-md bg-amber-50">
          <span className="text-[10px] font-bold tracking-widest text-amber-600">
            ◈ AUTHORIZATION
          </span>
        </div>
        <div className="mt-1 space-y-0.5">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 mx-3 px-3 py-2.5 rounded-lg text-[13px] transition-all ${
                isActive(item.href)
                  ? 'bg-amber-50 border-l-2 border-amber-500 text-amber-700 font-medium'
                  : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
              }`}
            >
              <span className="text-xs opacity-60">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </div>

        <div className="mt-6">
          <div className="mx-3 px-3 py-1.5">
            <span className="text-[10px] font-bold tracking-widest text-gray-400">
              ⟶ EXTERNAL
            </span>
          </div>
          <div className="mt-1 space-y-0.5">
            {externalLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 mx-3 px-3 py-2 rounded-lg text-[13px] transition-all ${
                  isActive(item.href)
                    ? 'bg-gray-200 text-gray-900 font-medium'
                    : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
                }`}
              >
                <span className="text-xs opacity-60">{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center gap-3 px-2">
          <div className="relative">
            <span className={`block w-2.5 h-2.5 rounded-full ${
              opaHealth === 'healthy' ? 'bg-emerald-500' : opaHealth === 'offline' ? 'bg-red-500' : 'bg-gray-400'
            }`} />
            {opaHealth === 'healthy' && <span className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping opacity-40" />}
          </div>
          <div>
            <p className="text-xs font-medium text-gray-600">
              {opaHealth === 'checking' ? 'Checking...' : opaHealth === 'healthy' ? 'OPA Online' : 'OPA Offline'}
            </p>
            <p className="text-[10px] text-gray-400">Port 8181</p>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-sm font-black">Z</span>
          </div>
          <span className="text-sm font-bold text-gray-900">AuthZ Server</span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="w-9 h-9 flex items-center justify-center rounded-lg bg-gray-100 text-gray-600 hover:text-gray-900 transition-colors"
        >
          {mobileOpen ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12h18M3 6h18M3 18h18" /></svg>
          )}
        </button>
      </div>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/20 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
      )}

      <aside className={`lg:hidden fixed top-0 left-0 z-50 w-72 bg-white flex flex-col h-screen shadow-xl transform transition-transform duration-300 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {sidebarContent}
      </aside>

      <aside className="hidden lg:flex fixed top-0 left-0 z-40 w-72 bg-white flex-col h-screen border-r border-gray-200">
        {sidebarContent}
      </aside>

      <div className="lg:hidden h-14" />
    </>
  );
}
