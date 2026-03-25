'use client';

import { useState } from 'react';

interface EmbedPageProps {
  title: string;
  description: string;
  service: string;
  externalUrl: string;
}

export default function EmbedPage({ title, description, service, externalUrl }: EmbedPageProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const proxySrc = `/api/proxy?service=${encodeURIComponent(service)}&path=/`;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
          <p className="text-slate-500 text-sm mt-1">{description}</p>
        </div>
        <a
          href={externalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-secondary text-xs"
        >
          Open in new tab
        </a>
      </div>

      <div className="flex-1 rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-sm relative">
        {loading && !error && (
          <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
            <div className="text-slate-400">Loading {title}...</div>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white z-10 gap-4">
            <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center">
              <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <p className="text-slate-600 font-medium">Unable to embed {title}</p>
            <p className="text-slate-400 text-sm">The service may block iframe embedding or is not running.</p>
            <a href={externalUrl} target="_blank" rel="noopener noreferrer" className="btn-primary text-sm">
              Open {title} directly
            </a>
          </div>
        )}
        <iframe
          src={proxySrc}
          className="w-full h-full border-0"
          onLoad={() => setLoading(false)}
          onError={() => { setLoading(false); setError(true); }}
        />
      </div>
    </div>
  );
}
