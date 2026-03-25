'use client';
import { useState } from 'react';

interface HistoryEntry {
  input: string;
  result: unknown;
  allowed: boolean;
  timestamp: string;
}

const PRESETS = [
  {
    name: 'Admin reads gateway',
    input: { user: 'admin', app: 'gateway-portal', action: 'read', resource: 'portal' },
  },
  {
    name: 'Viewer deletes (denied)',
    input: { user: 'viewer', app: 'kafka-portal', action: 'delete', resource: 'topic' },
  },
  {
    name: 'Member reads task',
    input: { user: 'demo-user', app: 'task-manager', action: 'read', resource: 'task', project: 'alpha' },
  },
  {
    name: 'Member deletes task (denied)',
    input: { user: 'demo-user', app: 'task-manager', action: 'delete', resource: 'task', resource_id: 'task-99', project: 'alpha' },
  },
  {
    name: 'Project admin deletes task',
    input: { user: 'demo-admin', app: 'task-manager', action: 'delete', resource: 'task', project: 'alpha' },
  },
];

export default function PlaygroundPage() {
  const [input, setInput] = useState(JSON.stringify(PRESETS[0].input, null, 2));
  const [result, setResult] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  const evaluate = async () => {
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const parsed = JSON.parse(input);
      const res = await fetch('/api/opa?path=/v1/data/authz/allow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: parsed }),
      });
      const data = await res.json();
      setResult(data);
      setHistory(prev => [{
        input,
        result: data,
        allowed: data.result === true,
        timestamp: new Date().toLocaleTimeString(),
      }, ...prev].slice(0, 20));
    } catch (e) {
      setError(e instanceof SyntaxError ? 'Invalid JSON input' : 'Failed to reach OPA');
    }
    setLoading(false);
  };

  const loadPreset = (preset: typeof PRESETS[number]) => {
    setInput(JSON.stringify(preset.input, null, 2));
    setResult(null);
    setError('');
  };

  const allowed = result && typeof result === 'object' && 'result' in result && (result as { result: boolean }).result === true;

  return (
    <div className="p-6 lg:p-8 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Playground</h1>
        <p className="text-sm text-gray-500 mt-1">Test authorization decisions against OPA policies</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {/* Presets */}
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Presets</p>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map(p => (
                <button
                  key={p.name}
                  onClick={() => loadPreset(p)}
                  className="px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded-lg hover:bg-amber-50 hover:text-amber-700 transition-colors"
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          {/* Input */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-900">Input</p>
              <span className="text-xs text-gray-400">JSON object sent as <code className="bg-gray-100 px-1 rounded">input</code> to OPA</span>
            </div>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              className="w-full p-4 font-mono text-sm text-gray-800 bg-gray-50 border-0 focus:ring-0 focus:outline-none resize-none"
              rows={10}
              spellCheck={false}
            />
            <div className="p-3 border-t border-gray-100 flex items-center justify-between">
              <button
                onClick={evaluate}
                disabled={loading}
                className="px-5 py-2 bg-amber-500 text-white text-sm font-medium rounded-lg hover:bg-amber-600 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Evaluating...' : 'Evaluate'}
              </button>
              {error && <p className="text-sm text-red-600">{error}</p>}
            </div>
          </div>

          {/* Result */}
          {result !== null && (
            <div className={`border rounded-xl overflow-hidden ${allowed ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
              <div className="p-4 flex items-center gap-3">
                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${allowed ? 'bg-emerald-500' : 'bg-red-500'}`}>
                  {allowed ? '✓' : '✗'}
                </span>
                <div>
                  <p className={`text-lg font-bold ${allowed ? 'text-emerald-700' : 'text-red-700'}`}>
                    {allowed ? 'ALLOWED' : 'DENIED'}
                  </p>
                  <p className="text-xs text-gray-500">POST /v1/data/authz/allow</p>
                </div>
              </div>
              <pre className="px-4 pb-4 text-sm font-mono text-gray-700 overflow-x-auto">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* History */}
        <div className="lg:col-span-1">
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-900">History</p>
              {history.length > 0 && (
                <button onClick={() => setHistory([])} className="text-xs text-gray-400 hover:text-gray-600">
                  Clear
                </button>
              )}
            </div>
            {history.length === 0 ? (
              <div className="p-6 text-center text-gray-400 text-sm">
                Run an evaluation to see history
              </div>
            ) : (
              <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
                {history.map((entry, i) => {
                  let parsed;
                  try { parsed = JSON.parse(entry.input); } catch { parsed = {}; }
                  return (
                    <button
                      key={i}
                      onClick={() => { setInput(entry.input); setResult(entry.result); }}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`w-2 h-2 rounded-full ${entry.allowed ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        <span className="text-xs text-gray-400">{entry.timestamp}</span>
                      </div>
                      <p className="text-xs text-gray-600 truncate">
                        {parsed.user} → {parsed.action} {parsed.resource} ({parsed.app})
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
