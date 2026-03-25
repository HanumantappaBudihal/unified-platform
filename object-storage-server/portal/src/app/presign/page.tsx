'use client';
import { useEffect, useState } from 'react';

interface Bucket {
  name: string;
}

export default function PresignPage() {
  const [buckets, setBuckets] = useState<Bucket[]>([]);
  const [bucket, setBucket] = useState('');
  const [objectPath, setObjectPath] = useState('');
  const [expiry, setExpiry] = useState(3600);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/buckets')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setBuckets(data);
      });
  }, []);

  const generateLink = async () => {
    setError(null);
    setGeneratedUrl(null);
    if (!bucket || !objectPath) {
      setError('Bucket and object path are required');
      return;
    }
    const res = await fetch('/api/presign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bucket, object: objectPath, expiry }),
    });
    const data = await res.json();
    if (data.url) setGeneratedUrl(data.url);
    else setError(data.error || 'Failed to generate link');
  };

  const expiryOptions = [
    { label: '1 Hour', value: 3600 },
    { label: '6 Hours', value: 21600 },
    { label: '24 Hours', value: 86400 },
    { label: '7 Days', value: 604800 },
  ];

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Share Links</h1>
      <p className="text-gray-500 text-sm mb-6">Generate time-limited presigned URLs for file sharing</p>

      <div className="bg-white rounded-lg border border-gray-200 shadow p-5 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Bucket</label>
          <select
            value={bucket}
            onChange={(e) => setBucket(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
          >
            <option value="">Select a bucket</option>
            {buckets.map((b) => (
              <option key={b.name} value={b.name}>{b.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Object Path</label>
          <input
            type="text"
            value={objectPath}
            onChange={(e) => setObjectPath(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
            placeholder="path/to/file.pdf"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Expiry</label>
          <div className="flex gap-2">
            {expiryOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setExpiry(opt.value)}
                className={`px-3 py-1.5 text-sm rounded border ${
                  expiry === opt.value
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={generateLink}
          className="w-full px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 font-medium"
        >
          Generate Share Link
        </button>

        {error && <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{error}</div>}

        {generatedUrl && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded">
            <p className="text-sm font-medium text-emerald-700 mb-2">Shareable Link Generated</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={generatedUrl}
                readOnly
                className="flex-1 px-2 py-1 text-xs bg-white border rounded font-mono"
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <button
                onClick={() => navigator.clipboard.writeText(generatedUrl)}
                className="px-3 py-1 bg-emerald-600 text-white text-sm rounded hover:bg-emerald-700"
              >
                Copy
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
