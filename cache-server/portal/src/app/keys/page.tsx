'use client';

import { useState } from 'react';

interface KeyEntry {
  key: string;
  type: string;
  ttl: number;
  value: string;
}

export default function KeysPage() {
  const [pattern, setPattern] = useState('*');
  const [keys, setKeys] = useState<KeyEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedKey, setSelectedKey] = useState<KeyEntry | null>(null);
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [newTtl, setNewTtl] = useState('');
  const [setLoading2, setSetLoading] = useState(false);

  const searchKeys = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/keys?pattern=${encodeURIComponent(pattern)}`);
      const data = await res.json();
      setKeys(data.keys || []);
    } catch {
      setKeys([]);
    } finally {
      setLoading(false);
    }
  };

  const deleteKey = async (key: string) => {
    if (!confirm(`Delete key "${key}"?`)) return;
    try {
      await fetch(`/api/keys?key=${encodeURIComponent(key)}`, { method: 'DELETE' });
      setKeys((prev) => prev.filter((k) => k.key !== key));
      if (selectedKey?.key === key) setSelectedKey(null);
    } catch {
      alert('Failed to delete key');
    }
  };

  const setKey = async () => {
    if (!newKey.trim()) return;
    setSetLoading(true);
    try {
      await fetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: newKey,
          value: newValue,
          ttl: newTtl ? parseInt(newTtl, 10) : undefined,
        }),
      });
      setNewKey('');
      setNewValue('');
      setNewTtl('');
      await searchKeys();
    } catch {
      alert('Failed to set key');
    } finally {
      setSetLoading(false);
    }
  };

  const truncate = (s: string, len = 80) => (s.length > len ? s.slice(0, len) + '...' : s);

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-1">Key Browser</h1>
      <p className="text-sm text-slate-500 mb-6">Search, inspect, and manage cached keys</p>

      {/* Search */}
      <div className="flex gap-3 mb-6">
        <input
          type="text"
          value={pattern}
          onChange={(e) => setPattern(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && searchKeys()}
          placeholder="Search keys... e.g. sessions:*"
          className="flex-1 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-300"
        />
        <button
          onClick={searchKeys}
          disabled={loading}
          className="px-6 py-2.5 bg-red-600 text-white text-sm font-medium rounded-xl hover:bg-red-700 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Results Table */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100">
              <span className="text-sm font-medium text-slate-700">
                {keys.length} key{keys.length !== 1 ? 's' : ''} found
              </span>
            </div>
            {keys.length === 0 ? (
              <div className="px-5 py-12 text-center text-sm text-slate-400">
                No keys found. Run a search to browse keys.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-left">
                      <th className="px-5 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Key</th>
                      <th className="px-5 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                      <th className="px-5 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">TTL</th>
                      <th className="px-5 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Value</th>
                      <th className="px-5 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider w-16"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {keys.map((entry) => (
                      <tr
                        key={entry.key}
                        onClick={() => setSelectedKey(entry)}
                        className={`cursor-pointer hover:bg-slate-50 transition-colors ${selectedKey?.key === entry.key ? 'bg-red-50' : ''}`}
                      >
                        <td className="px-5 py-3 font-mono text-slate-800 text-xs">{truncate(entry.key, 40)}</td>
                        <td className="px-5 py-3">
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs font-medium">{entry.type}</span>
                        </td>
                        <td className="px-5 py-3 text-slate-600">{entry.ttl === -1 ? 'No expiry' : `${entry.ttl}s`}</td>
                        <td className="px-5 py-3 text-slate-500 font-mono text-xs">{truncate(entry.value)}</td>
                        <td className="px-5 py-3">
                          <button
                            onClick={(e) => { e.stopPropagation(); deleteKey(entry.key); }}
                            className="text-red-400 hover:text-red-600 transition-colors"
                            title="Delete key"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Detail Panel */}
        <div className="space-y-6">
          {selectedKey && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <h3 className="text-sm font-semibold text-slate-800 mb-3">Key Detail</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <label className="text-xs text-slate-500 font-medium">Key</label>
                  <div className="font-mono text-slate-800 mt-0.5 break-all">{selectedKey.key}</div>
                </div>
                <div className="flex gap-4">
                  <div>
                    <label className="text-xs text-slate-500 font-medium">Type</label>
                    <div className="text-slate-700 mt-0.5">{selectedKey.type}</div>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 font-medium">TTL</label>
                    <div className="text-slate-700 mt-0.5">{selectedKey.ttl === -1 ? 'No expiry' : `${selectedKey.ttl}s`}</div>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-500 font-medium">Value</label>
                  <pre className="mt-1 p-3 bg-slate-50 rounded-lg text-xs text-slate-700 overflow-auto max-h-64 whitespace-pre-wrap break-all">
                    {selectedKey.value}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* Set Key Form */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-slate-800 mb-4">Set Key</h3>
            <div className="space-y-3">
              <input
                type="text"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                placeholder="Key name"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-300"
              />
              <textarea
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                placeholder="Value"
                rows={4}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-300 resize-none"
              />
              <input
                type="number"
                value={newTtl}
                onChange={(e) => setNewTtl(e.target.value)}
                placeholder="TTL in seconds (optional)"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-300"
              />
              <button
                onClick={setKey}
                disabled={setLoading2 || !newKey.trim()}
                className="w-full px-4 py-2.5 bg-red-600 text-white text-sm font-medium rounded-xl hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {setLoading2 ? 'Setting...' : 'Set Key'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
