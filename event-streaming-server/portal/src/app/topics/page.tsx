'use client';

import { useEffect, useState } from 'react';

interface TopicInfo {
  name: string;
  partitions: number;
  replication: number;
  isDlq: boolean;
}

export default function TopicsPage() {
  const [topics, setTopics] = useState<TopicInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [showDlq, setShowDlq] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  const [newTopic, setNewTopic] = useState({ name: '', partitions: '3', replication: '1' });
  const [createResult, setCreateResult] = useState<string | null>(null);

  async function fetchTopics() {
    setLoading(true);
    try {
      const res = await fetch('/api/topics');
      const data = await res.json();
      setTopics(data.topics || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchTopics(); }, []);

  const filtered = topics.filter((t) => {
    if (!showDlq && t.isDlq) return false;
    if (filter && !t.name.toLowerCase().includes(filter.toLowerCase())) return false;
    return true;
  });

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateResult(null);
    try {
      const res = await fetch('/api/topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newTopic.name,
          partitions: parseInt(newTopic.partitions),
          replicationFactor: parseInt(newTopic.replication),
        }),
      });
      const data = await res.json();
      if (data.cli) setCreateResult(data.cli);
      else if (data.error) setCreateResult(`Error: ${data.error}`);
    } catch (err) {
      setCreateResult(`Error: ${err}`);
    }
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Topics</h1>
          <p className="text-slate-500 text-sm mt-1">{topics.length} total topics</p>
        </div>
        <button onClick={() => setShowCreate(!showCreate)} className={showCreate ? 'btn-secondary' : 'btn-primary'}>
          {showCreate ? 'Cancel' : '+ Create Topic'}
        </button>
      </div>

      {showCreate && (
        <div className="card mb-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Create New Topic</h3>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="label">
                Topic Name <span className="text-slate-400">(format: domain.app.event)</span>
              </label>
              <input type="text" className="input" placeholder="orders.checkout.order-created" value={newTopic.name} onChange={(e) => setNewTopic({ ...newTopic, name: e.target.value })} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Partitions</label>
                <input type="number" className="input" min="1" max="100" value={newTopic.partitions} onChange={(e) => setNewTopic({ ...newTopic, partitions: e.target.value })} />
              </div>
              <div>
                <label className="label">Replication Factor</label>
                <input type="number" className="input" min="1" max="3" value={newTopic.replication} onChange={(e) => setNewTopic({ ...newTopic, replication: e.target.value })} />
              </div>
            </div>
            <button type="submit" className="btn-primary">Create Topic</button>
          </form>
          {createResult && (
            <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <p className="text-sm text-slate-500 mb-2">Run this command to create the topic:</p>
              <code className="text-sm text-indigo-600 break-all">{createResult}</code>
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6">
        <input type="text" className="input max-w-md" placeholder="Filter topics..." value={filter} onChange={(e) => setFilter(e.target.value)} />
        <label className="flex items-center gap-2 text-sm text-slate-500 cursor-pointer select-none">
          <input type="checkbox" checked={showDlq} onChange={(e) => setShowDlq(e.target.checked)} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
          Show DLQ topics
        </label>
        <button onClick={fetchTopics} className="btn-secondary text-sm">Refresh</button>
      </div>

      {loading ? (
        <div className="text-slate-400">Loading topics...</div>
      ) : (
        <div className="card overflow-hidden p-0">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-3">Topic Name</th>
                <th className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-3">Partitions</th>
                <th className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-3">Replication</th>
                <th className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-3">Type</th>
                <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((topic) => (
                <tr key={topic.name} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <span className="font-mono text-sm text-slate-700">{topic.name}</span>
                  </td>
                  <td className="px-6 py-4 text-center text-slate-500">{topic.partitions}</td>
                  <td className="px-6 py-4 text-center text-slate-500">{topic.replication}</td>
                  <td className="px-6 py-4 text-center">
                    {topic.isDlq ? <span className="badge-yellow">DLQ</span> : <span className="badge-blue">App</span>}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <a href={`http://localhost:8080/ui/clusters/kafka-central/all-topics/${encodeURIComponent(topic.name)}`} target="_blank" rel="noopener noreferrer" className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">
                      Open in Kafka UI
                    </a>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">No topics found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
