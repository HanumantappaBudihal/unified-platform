'use client';

import { useState } from 'react';

interface EmbedPageProps {
  title: string;
  service: string;
  externalUrl: string;
}

export default function EmbedPage({ title, service, externalUrl }: EmbedPageProps) {
  const [loading, setLoading] = useState(true);
  const proxyUrl = `/api/proxy?service=${service}&path=/`;

  return (
    <div className="h-[calc(100vh-2rem)] flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
        <a
          href={externalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
        >
          Open in new tab
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
          </svg>
        </a>
      </div>
      <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-50">
            <div className="text-slate-400 text-sm">Loading {title}...</div>
          </div>
        )}
        <iframe
          src={proxyUrl}
          className="w-full h-full border-0"
          onLoad={() => setLoading(false)}
        />
      </div>
    </div>
  );
}
