'use client';

interface EmbedPageProps {
  title: string;
  url: string;
  description: string;
  accentColor?: string;
}

export default function EmbedPage({ title, url, description, accentColor = 'slate' }: EmbedPageProps) {
  const btnColors: Record<string, string> = {
    indigo: 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/20',
    red: 'bg-red-600 hover:bg-red-500 shadow-red-500/20',
    emerald: 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/20',
    slate: 'bg-gray-700 hover:bg-gray-600',
  };

  const dotColors: Record<string, string> = {
    indigo: 'bg-indigo-500',
    red: 'bg-red-500',
    emerald: 'bg-emerald-500',
    slate: 'bg-gray-400',
  };

  return (
    <div className="h-screen flex flex-col">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-4 sm:px-6 py-4 bg-white border-b border-gray-200">
        <div className="flex items-center gap-3">
          <span className={`w-2 h-2 rounded-full ${dotColors[accentColor] || dotColors.slate}`} />
          <div>
            <h1 className="text-lg font-bold text-gray-900">{title}</h1>
            <p className="text-xs text-gray-500">{description}</p>
          </div>
        </div>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className={`px-4 py-2 text-white text-sm rounded-lg shadow-lg transition-all ${btnColors[accentColor] || btnColors.slate}`}
        >
          Open in New Tab
        </a>
      </div>
      <div className="flex-1 bg-gray-100">
        <iframe src={url} className="w-full h-full border-0" title={title} />
      </div>
    </div>
  );
}
