'use client';
import { useEffect, useState } from 'react';

interface Policy {
  id: string;
  raw: string;
  ast?: { package?: { path?: { value?: string }[] } };
}

export default function PoliciesPage() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [selected, setSelected] = useState<Policy | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/opa?path=/v1/policies')
      .then(r => r.json())
      .then(data => {
        const filtered = (data.result || []).filter((p: Policy) => !p.id.startsWith('system'));
        setPolicies(filtered);
        if (filtered.length > 0) setSelected(filtered[0]);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 lg:p-8 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Policies</h1>
        <p className="text-sm text-gray-500 mt-1">Rego policy files loaded in OPA</p>
      </div>

      {loading ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <p className="text-gray-400">Loading policies...</p>
        </div>
      ) : policies.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <p className="text-gray-400">No policies found. Is OPA running?</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Policy List */}
          <div className="lg:col-span-1">
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="p-4 border-b border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {policies.length} Policies
                </p>
              </div>
              <div className="divide-y divide-gray-100">
                {policies.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setSelected(p)}
                    className={`w-full text-left px-4 py-3 text-sm transition-colors ${
                      selected?.id === p.id
                        ? 'bg-amber-50 text-amber-700 font-medium border-l-2 border-amber-500'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <p className="truncate">{p.id.replace(/\//g, ' / ')}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Policy Content */}
          <div className="lg:col-span-3">
            {selected && (
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{selected.id}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Read-only — edit files in config/opa/policies/</p>
                  </div>
                  <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-medium rounded">Rego</span>
                </div>
                <pre className="p-4 text-sm text-gray-800 bg-gray-50 overflow-x-auto max-h-[600px] overflow-y-auto font-mono leading-relaxed">
                  {selected.raw}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
