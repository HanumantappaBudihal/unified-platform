'use client';

import { useEffect, useState } from 'react';

interface TopicInfo { name: string; isDlq: boolean; }
interface ConsumedMessage { topic: string; key: string | null; value: unknown; partition: number; offset: number; }

export default function MessagesPage() {
  const [topics, setTopics] = useState<TopicInfo[]>([]);
  const [produceTopic, setProduceTopic] = useState('');
  const [produceKey, setProduceKey] = useState('');
  const [produceValue, setProduceValue] = useState('');
  const [produceResult, setProduceResult] = useState<string | null>(null);
  const [producing, setProducing] = useState(false);
  const [consumeTopic, setConsumeTopic] = useState('');
  const [messages, setMessages] = useState<ConsumedMessage[]>([]);
  const [consuming, setConsuming] = useState(false);
  const [consumeError, setConsumeError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/topics').then((r) => r.json()).then((data) => setTopics(data.topics || [])).catch(() => {});
  }, []);

  const appTopics = topics.filter((t) => !t.isDlq);

  async function handleProduce(e: React.FormEvent) {
    e.preventDefault();
    setProducing(true);
    setProduceResult(null);
    try {
      const res = await fetch('/api/produce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: produceTopic, key: produceKey || undefined, value: produceValue }),
      });
      const data = await res.json();
      if (data.success) {
        const offset = data.offsets?.[0];
        setProduceResult(`Message sent to partition ${offset?.partition}, offset ${offset?.offset}`);
        setProduceValue('');
        setProduceKey('');
      } else {
        setProduceResult(`Error: ${data.error}`);
      }
    } catch (err) {
      setProduceResult(`Error: ${err}`);
    } finally {
      setProducing(false);
    }
  }

  async function handleConsume() {
    if (!consumeTopic) return;
    setConsuming(true);
    setConsumeError(null);
    setMessages([]);
    try {
      const res = await fetch('/api/consume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: consumeTopic, maxMessages: 20 }),
      });
      const data = await res.json();
      if (data.error) setConsumeError(data.error);
      else setMessages(data.messages || []);
    } catch (err) {
      setConsumeError(String(err));
    } finally {
      setConsuming(false);
    }
  }

  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-800 mb-2">Messages</h1>
      <p className="text-slate-500 text-sm mb-8">Produce and consume test messages via the REST Proxy</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Produce Panel */}
        <div className="card">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Produce Message</h2>
          <form onSubmit={handleProduce} className="space-y-4">
            <div>
              <label className="label">Topic</label>
              <select className="input" value={produceTopic} onChange={(e) => setProduceTopic(e.target.value)} required>
                <option value="">Select a topic...</option>
                {appTopics.map((t) => (<option key={t.name} value={t.name}>{t.name}</option>))}
              </select>
            </div>
            <div>
              <label className="label">Key <span className="text-slate-400">(optional)</span></label>
              <input type="text" className="input" placeholder="message-key-001" value={produceKey} onChange={(e) => setProduceKey(e.target.value)} />
            </div>
            <div>
              <label className="label">Value (JSON or string)</label>
              <textarea className="input min-h-[120px] font-mono text-sm" placeholder='{"id": "order-001", "total": 99.99}' value={produceValue} onChange={(e) => setProduceValue(e.target.value)} required />
            </div>
            <button type="submit" className="btn-primary w-full" disabled={producing}>
              {producing ? 'Sending...' : 'Send Message'}
            </button>
          </form>
          {produceResult && (
            <div className={`mt-4 p-3 rounded-xl text-sm ${produceResult.startsWith('Error') ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
              {produceResult}
            </div>
          )}
        </div>

        {/* Consume Panel */}
        <div className="card">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Consume Messages</h2>
          <div className="space-y-4">
            <div>
              <label className="label">Topic</label>
              <select className="input" value={consumeTopic} onChange={(e) => setConsumeTopic(e.target.value)}>
                <option value="">Select a topic...</option>
                {topics.map((t) => (<option key={t.name} value={t.name}>{t.name}</option>))}
              </select>
            </div>
            <button onClick={handleConsume} className="btn-primary w-full" disabled={consuming || !consumeTopic}>
              {consuming ? 'Fetching...' : 'Fetch Messages'}
            </button>
          </div>

          {consumeError && (
            <div className="mt-4 p-3 rounded-xl text-sm bg-rose-50 text-rose-700 border border-rose-200">{consumeError}</div>
          )}

          {messages.length > 0 && (
            <div className="mt-4">
              <p className="text-sm text-slate-500 mb-2">{messages.length} messages</p>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {messages.map((msg, i) => (
                  <div key={i} className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                    <div className="flex items-center gap-4 text-xs text-slate-400 mb-2">
                      <span>Partition: {msg.partition}</span>
                      <span>Offset: {msg.offset}</span>
                      {msg.key && <span>Key: <span className="text-slate-600 font-medium">{msg.key}</span></span>}
                    </div>
                    <pre className="text-sm text-slate-700 whitespace-pre-wrap break-all font-mono">
                      {typeof msg.value === 'object' ? JSON.stringify(msg.value, null, 2) : String(msg.value)}
                    </pre>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!consuming && messages.length === 0 && consumeTopic && !consumeError && (
            <div className="mt-4 text-sm text-slate-400 text-center py-8">
              Click &ldquo;Fetch Messages&rdquo; to read from the topic
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
