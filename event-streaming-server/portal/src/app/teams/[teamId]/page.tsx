'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { config } from '@/lib/config';

interface TopicInfo { name: string; partitions: number; replication: number; isDlq: boolean; }

export default function TeamDetailPage() {
  const params = useParams();
  const teamId = params.teamId as string;
  const team = config.teams.find((t) => t.id === teamId);
  const [topics, setTopics] = useState<TopicInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!team) return;
    setLoading(true);
    fetch(`/api/topics?prefix=${encodeURIComponent(team.prefix)}`)
      .then((r) => r.json())
      .then((data) => setTopics(data.topics || []))
      .finally(() => setLoading(false));
  }, [team]);

  if (!team) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-slate-800 mb-4">Team Not Found</h1>
        <Link href="/teams" className="text-indigo-600 hover:text-indigo-800 font-medium">Back to Teams</Link>
      </div>
    );
  }

  const appTopics = topics.filter((t) => !t.isDlq);
  const dlqTopics = topics.filter((t) => t.isDlq);

  return (
    <div className="max-w-7xl mx-auto">
      <Link href="/teams" className="text-sm text-slate-500 hover:text-slate-700 mb-4 inline-flex items-center gap-1 font-medium">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        Back to Teams
      </Link>

      <div className="flex items-center justify-between mb-8 mt-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{team.name}</h1>
          <p className="text-slate-500 text-sm mt-1">
            Prefix: <code className="text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded text-xs">{team.prefix}*</code> &middot; {appTopics.length} topics &middot; {dlqTopics.length} DLQs
          </p>
        </div>
        <a href={`http://localhost:8080/ui/clusters/kafka-central/all-topics?search=${encodeURIComponent(team.prefix)}`} target="_blank" rel="noopener noreferrer" className="btn-secondary text-sm">
          Open in Kafka UI
        </a>
      </div>

      {loading ? (
        <div className="text-slate-400">Loading topics...</div>
      ) : topics.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-slate-500 mb-4">No topics found for this team</p>
          <p className="text-sm text-slate-400">Create topics with prefix <code className="text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded text-xs">{team.prefix}</code> to see them here</p>
        </div>
      ) : (
        <>
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Application Topics</h2>
          <div className="card overflow-hidden p-0 mb-8">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-3">Topic</th>
                  <th className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-3">Partitions</th>
                  <th className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-3">Replication</th>
                  <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {appTopics.map((topic) => (
                  <tr key={topic.name} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-mono text-sm text-slate-700">{topic.name}</td>
                    <td className="px-6 py-4 text-center text-slate-500">{topic.partitions}</td>
                    <td className="px-6 py-4 text-center text-slate-500">{topic.replication}</td>
                    <td className="px-6 py-4 text-right space-x-4">
                      <Link href={`/messages?topic=${encodeURIComponent(topic.name)}`} className="text-sm text-emerald-600 hover:text-emerald-800 font-medium">Messages</Link>
                      <a href={`http://localhost:8080/ui/clusters/kafka-central/all-topics/${encodeURIComponent(topic.name)}`} target="_blank" rel="noopener noreferrer" className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">Kafka UI</a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {dlqTopics.length > 0 && (
            <>
              <h2 className="text-lg font-semibold text-slate-800 mb-4">Dead Letter Queues</h2>
              <div className="card overflow-hidden p-0">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50">
                      <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-3">DLQ Topic</th>
                      <th className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-3">Partitions</th>
                      <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dlqTopics.map((topic) => (
                      <tr key={topic.name} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4"><span className="font-mono text-sm text-amber-700">{topic.name}</span></td>
                        <td className="px-6 py-4 text-center text-slate-500">{topic.partitions}</td>
                        <td className="px-6 py-4 text-right">
                          <Link href={`/messages?topic=${encodeURIComponent(topic.name)}`} className="text-sm text-amber-600 hover:text-amber-800 font-medium">Browse DLQ Messages</Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          <div className="card mt-8">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">Connection Details for {team.name}</h2>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 font-mono text-sm">
              <p className="text-slate-400"># Kafka connection</p>
              <p className="text-slate-700">bootstrap.servers=localhost:9092</p>
              <p className="text-slate-700">group.id={team.id}-service</p>
              <p className="text-slate-700 mt-2"># REST Proxy</p>
              <p className="text-slate-700">POST http://localhost:8082/topics/{team.prefix}...</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
