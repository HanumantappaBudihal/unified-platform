'use client';

import { useState, useRef, useEffect } from 'react';

interface Message {
  id: number;
  channel: string;
  data: string;
  timestamp: Date;
}

export default function PubSubPage() {
  const [pubChannel, setPubChannel] = useState('');
  const [pubMessage, setPubMessage] = useState('');
  const [publishing, setPublishing] = useState(false);

  const [subChannel, setSubChannel] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const eventSourceRef = useRef<EventSource | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const idCounter = useRef(0);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    return () => {
      eventSourceRef.current?.close();
    };
  }, []);

  const publish = async () => {
    if (!pubChannel.trim() || !pubMessage.trim()) return;
    setPublishing(true);
    try {
      await fetch('/api/pubsub', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel: pubChannel, message: pubMessage }),
      });
      setPubMessage('');
    } catch {
      alert('Failed to publish message');
    } finally {
      setPublishing(false);
    }
  };

  const subscribe = () => {
    if (!subChannel.trim()) return;
    eventSourceRef.current?.close();

    const es = new EventSource(`/api/pubsub/subscribe?channel=${encodeURIComponent(subChannel)}`);
    es.onmessage = (event) => {
      idCounter.current++;
      setMessages((prev) => [
        ...prev,
        {
          id: idCounter.current,
          channel: subChannel,
          data: event.data,
          timestamp: new Date(),
        },
      ]);
    };
    es.onerror = () => {
      setSubscribed(false);
      es.close();
    };

    eventSourceRef.current = es;
    setSubscribed(true);
  };

  const unsubscribe = () => {
    eventSourceRef.current?.close();
    eventSourceRef.current = null;
    setSubscribed(false);
  };

  const formatTime = (d: Date) =>
    d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-1">Pub/Sub</h1>
      <p className="text-sm text-slate-500 mb-6">Publish messages and subscribe to channels in real time</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Publish Panel */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
            Publish
          </h2>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-slate-500 font-medium mb-1 block">Channel</label>
              <input
                type="text"
                value={pubChannel}
                onChange={(e) => setPubChannel(e.target.value)}
                placeholder="e.g. notifications"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-300"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 font-medium mb-1 block">Message</label>
              <textarea
                value={pubMessage}
                onChange={(e) => setPubMessage(e.target.value)}
                placeholder='{"event": "user.login", "userId": "123"}'
                rows={5}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-300 resize-none font-mono"
              />
            </div>
            <button
              onClick={publish}
              disabled={publishing || !pubChannel.trim() || !pubMessage.trim()}
              className="w-full px-4 py-2.5 bg-red-600 text-white text-sm font-medium rounded-xl hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {publishing ? 'Publishing...' : 'Publish Message'}
            </button>
          </div>
        </div>

        {/* Subscribe Panel */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col">
          <h2 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            </svg>
            Subscribe
          </h2>
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={subChannel}
              onChange={(e) => setSubChannel(e.target.value)}
              placeholder="Channel name"
              disabled={subscribed}
              className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-300 disabled:opacity-50"
            />
            {subscribed ? (
              <button
                onClick={unsubscribe}
                className="px-4 py-2 bg-slate-600 text-white text-sm font-medium rounded-xl hover:bg-slate-700 transition-colors"
              >
                Unsubscribe
              </button>
            ) : (
              <button
                onClick={subscribe}
                disabled={!subChannel.trim()}
                className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-xl hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                Subscribe
              </button>
            )}
          </div>

          {subscribed && (
            <div className="flex items-center gap-2 mb-3">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span className="text-xs text-emerald-600 font-medium">
                Listening on &quot;{subChannel}&quot;
              </span>
            </div>
          )}

          {/* Message Log */}
          <div
            ref={logRef}
            className="flex-1 min-h-[300px] max-h-[400px] overflow-y-auto bg-slate-50 rounded-xl border border-slate-200 p-3 space-y-2"
          >
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-sm text-slate-400">
                {subscribed ? 'Waiting for messages...' : 'Subscribe to a channel to see messages'}
              </div>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} className="bg-white rounded-lg border border-slate-100 px-3 py-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-slate-500">{msg.channel}</span>
                    <span className="text-xs text-slate-400">{formatTime(msg.timestamp)}</span>
                  </div>
                  <pre className="text-xs text-slate-700 font-mono whitespace-pre-wrap break-all">{msg.data}</pre>
                </div>
              ))
            )}
          </div>

          {messages.length > 0 && (
            <button
              onClick={() => setMessages([])}
              className="mt-3 text-xs text-slate-500 hover:text-slate-700 transition-colors"
            >
              Clear messages
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
