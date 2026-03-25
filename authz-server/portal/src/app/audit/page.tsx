'use client';

export default function AuditPage() {
  return (
    <div className="p-6 lg:p-8 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Decision Log</h1>
        <p className="text-sm text-gray-500 mt-1">OPA decision log for auditing authorization decisions</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">≡</span>
        </div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Decision Logging</h2>
        <p className="text-sm text-gray-500 max-w-md mx-auto mb-6">
          OPA can log every authorization decision for compliance and debugging.
          Enable decision logging by adding the <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">--decision-log</code> flag to OPA.
        </p>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 max-w-lg mx-auto text-left">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">How to enable</p>
          <pre className="text-sm text-gray-700 font-mono">
{`# In docker-compose.yml, add to OPA command:
command:
  - run
  - --server
  - --addr=0.0.0.0:8181
  - --log-level=info
  - --set=decision_logs.console=true
  - /policies
  - /data`}
          </pre>
        </div>

        <p className="text-xs text-gray-400 mt-6">
          Once enabled, decisions will appear here in real-time.
        </p>
      </div>
    </div>
  );
}
