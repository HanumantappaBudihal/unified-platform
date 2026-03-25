'use client';

interface EmbedPageProps {
  title: string;
  externalUrl: string;
  description: string;
}

export default function EmbedPage({ title, externalUrl, description }: EmbedPageProps) {
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{title}</h1>
          <p className="text-sm text-gray-500">{description}</p>
        </div>
        <a
          href={externalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 bg-emerald-600 text-white text-sm rounded hover:bg-emerald-700 transition-colors"
        >
          Open in New Tab →
        </a>
      </div>
      <iframe src={externalUrl} className="flex-1 w-full border-0" title={title} />
    </div>
  );
}
