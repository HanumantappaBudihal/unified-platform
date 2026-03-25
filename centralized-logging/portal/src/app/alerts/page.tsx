'use client';

import { useState } from 'react';

interface AlertRule {
  id: string;
  name: string;
  description: string;
  condition: string;
  severity: 'critical' | 'warning' | 'info';
  enabled: boolean;
}

const defaultRules: AlertRule[] = [
  {
    id: 'error-spike',
    name: 'Error Spike Detection',
    description: 'Alert when error rate exceeds 10 errors per minute across any service',
    condition: 'sum(count_over_time({job="docker"} |= "error" [1m])) > 10',
    severity: 'critical',
    enabled: true,
  },
  {
    id: 'service-down',
    name: 'Service Down (No Logs)',
    description: 'Alert when a service produces no logs for 5 minutes',
    condition: 'absent_over_time({compose_service=~".+"} [5m])',
    severity: 'critical',
    enabled: true,
  },
  {
    id: 'high-volume',
    name: 'High Log Volume',
    description: 'Alert when log ingestion exceeds 1000 entries per minute',
    condition: 'sum(count_over_time({job="docker"} [1m])) > 1000',
    severity: 'warning',
    enabled: false,
  },
  {
    id: 'oom-detection',
    name: 'OOM Detection',
    description: 'Alert when Out-of-Memory errors are detected in any container',
    condition: '{job="docker"} |= "out of memory" or {job="docker"} |= "OOMKilled"',
    severity: 'critical',
    enabled: true,
  },
];

const severityColors = {
  critical: 'bg-red-500/20 text-red-400',
  warning: 'bg-yellow-500/20 text-yellow-400',
  info: 'bg-blue-500/20 text-blue-400',
};

export default function AlertsPage() {
  const [rules, setRules] = useState<AlertRule[]>(defaultRules);

  const toggleRule = (id: string) => {
    setRules(rules.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Log Alerts</h1>

      <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-sm text-amber-300">
        These are predefined alert rule templates. For full alerting configuration with notifications, use{' '}
        <a href="http://localhost:3008/alerting" target="_blank" rel="noopener noreferrer" className="underline font-medium">
          Grafana Alerting
        </a>.
      </div>

      <div className="space-y-4">
        {rules.map((rule) => (
          <div key={rule.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-gray-200">{rule.name}</h3>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${severityColors[rule.severity]}`}>
                    {rule.severity.toUpperCase()}
                  </span>
                </div>
                <p className="text-sm text-gray-400 mb-3">{rule.description}</p>
                <div className="bg-gray-800 rounded-lg px-3 py-2 font-mono text-xs text-gray-400">
                  {rule.condition}
                </div>
              </div>
              <button
                onClick={() => toggleRule(rule.id)}
                className={`ml-4 relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  rule.enabled ? 'bg-amber-500' : 'bg-gray-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    rule.enabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
