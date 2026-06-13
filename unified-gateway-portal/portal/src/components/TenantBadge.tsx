'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function TenantBadge() {
  const router = useRouter();
  const [me, setMe] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = () =>
    fetch('/api/session')
      .then((r) => r.json())
      .then(setMe)
      .catch(() => setMe(null))
      .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const signOut = async () => {
    await fetch('/api/session', { method: 'DELETE' });
    await load();
    router.refresh();
  };

  if (loading) return null;

  const tenantName = me?.tenant?.name || (me?.superadmin ? 'Superadmin' : 'Not signed in');
  const sub = me?.superadmin
    ? 'acts across all tenants'
    : me?.role
    ? `${me?.tenant?.plan ?? ''} · ${me.role}`
    : null;

  return (
    <div className="px-2 pb-3">
      <div className="flex items-center justify-between rounded-lg bg-gray-50 border border-gray-200 px-3 py-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-gray-700 truncate">{tenantName}</p>
          {sub && <p className="text-[10px] text-gray-400 truncate">{sub}</p>}
        </div>
        {me?.viaCookie ? (
          <button onClick={signOut} className="text-[11px] text-gray-400 hover:text-red-600 font-medium ml-2 shrink-0">
            Sign out
          </button>
        ) : (
          <a href="/signin" className="text-[11px] text-violet-600 hover:text-violet-800 font-medium ml-2 shrink-0">
            Sign in
          </a>
        )}
      </div>
    </div>
  );
}
