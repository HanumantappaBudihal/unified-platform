'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

interface NavItem { href: string; label: string; icon: string }
interface NavSection { title: string; color: string; icon: string; items: NavItem[] }

const platformSection: NavSection = {
  title: 'PLATFORM',
  color: 'violet',
  icon: '◈',
  items: [
    { href: '/apps', label: 'Applications', icon: '▦' },
    { href: '/apps/new', label: 'Onboard App', icon: '+' },
    { href: '/teams', label: 'Teams', icon: '⧉' },
    { href: '/audit', label: 'Audit Log', icon: '⊟' },
  ],
};

const sections: NavSection[] = [
  {
    title: 'EVENT STREAMING',
    color: 'indigo',
    icon: '⚡',
    items: [
      { href: '/event-streaming', label: 'Overview', icon: '◉' },
      { href: '/event-streaming/topics', label: 'Topics', icon: '≡' },
      { href: '/event-streaming/messages', label: 'Messages', icon: '◫' },
      { href: '/event-streaming/teams', label: 'Teams', icon: '⧉' },
      { href: '/event-streaming/kafka-ui', label: 'Kafka UI', icon: '⊞' },
    ],
  },
  {
    title: 'CACHE',
    color: 'red',
    icon: '◆',
    items: [
      { href: '/cache', label: 'Overview', icon: '◉' },
      { href: '/cache/keys', label: 'Keys', icon: '⚿' },
      { href: '/cache/apps', label: 'Applications', icon: '⧉' },
      { href: '/cache/pubsub', label: 'Pub/Sub', icon: '⇄' },
      { href: '/cache/redis-insight', label: 'Redis Insight', icon: '⊞' },
    ],
  },
  {
    title: 'STORAGE',
    color: 'emerald',
    icon: '▤',
    items: [
      { href: '/storage', label: 'Overview', icon: '◉' },
      { href: '/storage/browse', label: 'File Browser', icon: '▤' },
      { href: '/storage/apps', label: 'Applications', icon: '⧉' },
      { href: '/storage/presign', label: 'Share Links', icon: '⟷' },
      { href: '/storage/console', label: 'MinIO Console', icon: '⊞' },
    ],
  },
];

const toolLinks: NavItem[] = [
  { href: '/monitoring', label: 'Monitoring', icon: '◎' },
  { href: '/settings', label: 'Settings', icon: '⚙' },
];

const colorMap: Record<string, { active: string; activeBg: string; dot: string; heading: string; headingBg: string }> = {
  violet: {
    active: 'text-violet-700',
    activeBg: 'bg-violet-50 border-l-2 border-violet-500',
    dot: 'bg-violet-500',
    heading: 'text-violet-600',
    headingBg: 'bg-violet-50',
  },
  indigo: {
    active: 'text-indigo-700',
    activeBg: 'bg-indigo-50 border-l-2 border-indigo-500',
    dot: 'bg-indigo-500',
    heading: 'text-indigo-600',
    headingBg: 'bg-indigo-50',
  },
  red: {
    active: 'text-red-700',
    activeBg: 'bg-red-50 border-l-2 border-red-500',
    dot: 'bg-red-500',
    heading: 'text-red-600',
    headingBg: 'bg-red-50',
  },
  emerald: {
    active: 'text-emerald-700',
    activeBg: 'bg-emerald-50 border-l-2 border-emerald-500',
    dot: 'bg-emerald-500',
    heading: 'text-emerald-600',
    headingBg: 'bg-emerald-50',
  },
};

export default function Sidebar() {
  const pathname = usePathname();
  const [healthCount, setHealthCount] = useState(-1);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [serverStatus, setServerStatus] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchHealth = () => {
      fetch('/api/health')
        .then((r) => r.json())
        .then((data) => {
          let count = 0;
          const status: Record<string, string> = {};
          if (data.kafka?.status === 'healthy') { count++; status.kafka = 'healthy'; } else { status.kafka = data.kafka?.status || 'offline'; }
          if (data.redis?.status === 'healthy') { count++; status.redis = 'healthy'; } else { status.redis = data.redis?.status || 'offline'; }
          if (data.minio?.status === 'healthy') { count++; status.minio = 'healthy'; } else { status.minio = data.minio?.status || 'offline'; }
          setHealthCount(count);
          setServerStatus(status);
        })
        .catch(() => { setHealthCount(0); setServerStatus({}); });
    };
    fetchHealth();
    const interval = setInterval(fetchHealth, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname === href || pathname.startsWith(href + '/');
  };

  const sectionServerMap: Record<string, string> = { 'EVENT STREAMING': 'kafka', 'CACHE': 'redis', 'STORAGE': 'minio' };

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="p-5 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-violet-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
            <span className="text-white text-lg font-black">G</span>
          </div>
          <div>
            <h1 className="text-base font-bold text-gray-900 tracking-tight">Infra Gateway</h1>
            <p className="text-[11px] text-gray-500">Unified Server Portal</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto scrollbar-thin">
        {/* Dashboard */}
        <Link
          href="/"
          className={`flex items-center gap-3 mx-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
            isActive('/')
              ? 'bg-gray-200 text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <span className="text-base opacity-70">◉</span>
          Dashboard
        </Link>

        {/* Platform Section */}
        {(() => {
          const colors = colorMap[platformSection.color];
          return (
            <div className="mt-5">
              <div className={`mx-3 px-3 py-1.5 rounded-md flex items-center justify-between ${colors.headingBg}`}>
                <span className={`text-[10px] font-bold tracking-widest ${colors.heading}`}>
                  {platformSection.icon} {platformSection.title}
                </span>
              </div>
              <div className="mt-1 space-y-0.5">
                {platformSection.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 mx-3 px-3 py-2 rounded-lg text-[13px] transition-all ${
                      isActive(item.href)
                        ? `${colors.activeBg} ${colors.active} font-medium`
                        : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
                    }`}
                  >
                    <span className="text-xs opacity-60">{item.icon}</span>
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Server Sections */}
        {sections.map((section) => {
          const colors = colorMap[section.color];
          const serverId = sectionServerMap[section.title];
          const status = serverStatus[serverId];
          return (
            <div key={section.title} className="mt-5">
              <div className={`mx-3 px-3 py-1.5 rounded-md flex items-center justify-between ${colors.headingBg}`}>
                <span className={`text-[10px] font-bold tracking-widest ${colors.heading}`}>
                  {section.icon} {section.title}
                </span>
                {status && (
                  <span className={`w-1.5 h-1.5 rounded-full ${status === 'healthy' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                )}
              </div>
              <div className="mt-1 space-y-0.5">
                {section.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 mx-3 px-3 py-2 rounded-lg text-[13px] transition-all ${
                      isActive(item.href)
                        ? `${colors.activeBg} ${colors.active} font-medium`
                        : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
                    }`}
                  >
                    <span className="text-xs opacity-60">{item.icon}</span>
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          );
        })}

        {/* Tools */}
        <div className="mt-5">
          <div className="mx-3 px-3 py-1.5">
            <span className="text-[10px] font-bold tracking-widest text-gray-400">
              ⚙ TOOLS
            </span>
          </div>
          <div className="mt-1 space-y-0.5">
            {toolLinks.map((item) => (
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
              healthCount === 3 ? 'bg-emerald-500' : healthCount > 0 ? 'bg-amber-500' : healthCount === 0 ? 'bg-red-500' : 'bg-gray-400'
            }`} />
            {healthCount === 3 && <span className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping opacity-40" />}
          </div>
          <div>
            <p className="text-xs font-medium text-gray-600">
              {healthCount < 0 ? 'Checking...' : `${healthCount}/3 Servers Online`}
            </p>
            <p className="text-[10px] text-gray-400">Auto-refresh 15s</p>
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
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-violet-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-sm font-black">G</span>
          </div>
          <span className="text-sm font-bold text-gray-900">Infra Gateway</span>
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

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/20 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
      )}

      {/* Mobile Sidebar */}
      <aside className={`lg:hidden fixed top-0 left-0 z-50 w-72 bg-white flex flex-col h-screen shadow-xl transform transition-transform duration-300 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {sidebarContent}
      </aside>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex fixed top-0 left-0 z-40 w-72 bg-white flex-col h-screen border-r border-gray-200">
        {sidebarContent}
      </aside>

      {/* Mobile top spacer */}
      <div className="lg:hidden h-14" />
    </>
  );
}
