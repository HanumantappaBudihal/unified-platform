'use client';

const sections = [
  {
    title: 'Grafana Dashboards',
    desc: 'Metrics visualization and alerting',
    items: [
      { name: 'Event Streaming', tech: 'Kafka', url: 'http://localhost:3000', port: '3000', gradient: 'from-indigo-600 to-violet-700', glow: 'shadow-indigo-500/10', badge: 'bg-indigo-100 text-indigo-700', border: 'border-indigo-200 hover:border-indigo-300' },
      { name: 'Cache Server', tech: 'Redis', url: 'http://localhost:3003', port: '3003', gradient: 'from-red-600 to-rose-700', glow: 'shadow-red-500/10', badge: 'bg-red-100 text-red-700', border: 'border-red-200 hover:border-red-300' },
      { name: 'Object Storage', tech: 'MinIO', url: 'http://localhost:3005', port: '3005', gradient: 'from-emerald-600 to-teal-700', glow: 'shadow-emerald-500/10', badge: 'bg-emerald-100 text-emerald-700', border: 'border-emerald-200 hover:border-emerald-300' },
    ],
  },
];

const metricServices = [
  { title: 'Prometheus', items: [
    { name: 'Kafka', url: 'http://localhost:9090', port: '9090', color: 'indigo' },
    { name: 'Redis', url: 'http://localhost:9091', port: '9091', color: 'red' },
    { name: 'MinIO', url: 'http://localhost:9097', port: '9097', color: 'emerald' },
  ]},
  { title: 'Alertmanager', items: [
    { name: 'Kafka', url: 'http://localhost:9094', port: '9094', color: 'indigo' },
    { name: 'Redis', url: 'http://localhost:9095', port: '9095', color: 'red' },
    { name: 'MinIO', url: 'http://localhost:9098', port: '9098', color: 'emerald' },
  ]},
];

const dotColor: Record<string, string> = { indigo: 'bg-indigo-500', red: 'bg-red-500', emerald: 'bg-emerald-500' };

export default function MonitoringPage() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-8 animate-fade-in-up">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">Monitoring</h1>
        <p className="text-gray-500 text-sm mt-1">Dashboards, metrics, and alerting across all servers</p>
      </div>

      <h2 className="text-lg font-bold text-gray-900 mb-4">Grafana Dashboards</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        {sections[0].items.map((g) => (
          <a
            key={g.port}
            href={g.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`block p-5 bg-white rounded-2xl border-2 ${g.border} hover:shadow-lg ${g.glow} transition-all group`}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${g.gradient} flex items-center justify-center shadow-lg ${g.glow}`}>
                <span className="text-white text-sm font-bold">G</span>
              </div>
              <div>
                <h3 className="font-bold text-gray-900 group-hover:text-gray-700">{g.name}</h3>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${g.badge}`}>{g.tech}</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500">Grafana :{g.port}</p>
              <p className="text-[10px] text-gray-400">See .env for credentials</p>
            </div>
          </a>
        ))}
      </div>

      {metricServices.map((section) => (
        <div key={section.title} className="mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-3">{section.title}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {section.items.map((item) => (
              <a
                key={item.port}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all group"
              >
                <span className={`w-2 h-2 rounded-full ${dotColor[item.color]}`} />
                <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900 transition-colors flex-1">{item.name} {section.title}</span>
                <span className="text-xs font-mono text-gray-400 group-hover:text-gray-600 transition-colors">:{item.port}</span>
              </a>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
