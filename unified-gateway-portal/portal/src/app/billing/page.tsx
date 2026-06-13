'use client';
import { useEffect, useState } from 'react';

function Bar({ used, limit }: { used: number; limit: number | string }) {
  const unlimited = limit === 'unlimited' || limit === Infinity;
  const pct = unlimited ? 8 : Math.min(100, Math.round((used / (Number(limit) || 1)) * 100));
  const color = !unlimited && pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-amber-500' : 'bg-violet-500';
  return (
    <div className="mt-2 h-2 w-full bg-gray-100 rounded-full overflow-hidden">
      <div className={`h-full ${color} rounded-full`} style={{ width: `${unlimited ? 8 : pct}%` }} />
    </div>
  );
}

export default function BillingPage() {
  const [data, setData] = useState<any>(null);
  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const me = await fetch('/api/platform/whoami').then(r => r.json());
        const slug = me?.tenant?.slug || 'default';
        const [u, b] = await Promise.all([
          fetch(`/api/platform/tenants/${slug}/usage`).then(r => r.json()),
          fetch(`/api/platform/tenants/${slug}/billing`).then(r => r.json()),
        ]);
        if (u.error) throw new Error(u.error);
        setData({ ...u, slug });
        setInvoice(b.invoice);
      } catch (e: any) {
        setError(e.message || 'Failed to load billing');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="text-center py-20 text-gray-400">Loading…</div>;
  if (error) return <div className="p-6"><div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div></div>;

  const planColor: Record<string, string> = { free: 'bg-gray-100 text-gray-700', pro: 'bg-violet-100 text-violet-700', enterprise: 'bg-emerald-100 text-emerald-700' };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Billing &amp; Usage</h1>
          <p className="text-sm text-gray-500 mt-1">Plan, usage limits, and the current invoice for <span className="font-mono">{data.slug}</span>.</p>
        </div>
        <span className={`px-3 py-1.5 rounded-lg text-sm font-bold ${planColor[data.plan.id] || 'bg-gray-100 text-gray-700'}`}>
          {data.plan.name} plan
        </span>
      </div>

      {/* Usage */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-sm font-medium text-gray-700">Applications</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{data.usage.apps} <span className="text-sm font-normal text-gray-400">/ {String(data.plan.limits.apps)}</span></p>
          <Bar used={data.usage.apps} limit={data.plan.limits.apps} />
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-sm font-medium text-gray-700">Data resources</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{data.usage.dataResources} <span className="text-sm font-normal text-gray-400">/ {String(data.plan.limits.dataResources)}</span></p>
          <Bar used={data.usage.dataResources} limit={data.plan.limits.dataResources} />
        </div>
      </div>

      {/* Invoice */}
      {invoice && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-8 max-w-2xl">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-800">Current invoice</h2>
            <span className="text-xs text-gray-400">{invoice.period}</span>
          </div>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-gray-100">
              {invoice.lineItems.map((li: any, i: number) => (
                <tr key={i}>
                  <td className="px-5 py-3 text-gray-700">{li.description}<span className="text-gray-400 ml-2 text-xs">{li.quantity} × ${li.unitPrice}</span></td>
                  <td className="px-5 py-3 text-right font-mono text-gray-800">${li.amount}</td>
                </tr>
              ))}
              <tr className="bg-gray-50">
                <td className="px-5 py-3 font-semibold text-gray-900">Total</td>
                <td className="px-5 py-3 text-right font-bold text-gray-900">${invoice.total} {invoice.currency?.toUpperCase()}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Resource breakdown */}
      {data.usage.byType?.length > 0 && (
        <>
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Metered resources</h2>
          <div className="flex flex-wrap gap-2">
            {data.usage.byType.map((r: any) => (
              <span key={r.resource_type} className="px-3 py-1.5 bg-gray-100 rounded-lg text-sm text-gray-700">
                {r.resource_type}: <b>{r.count}</b>
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
