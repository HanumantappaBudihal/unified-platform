'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Bucket {
  name: string;
  objectCount: number;
  totalSize: number;
  versioning: boolean;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default function BrowsePage() {
  const [buckets, setBuckets] = useState<Bucket[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [versioning, setVersioning] = useState(false);

  const fetchBuckets = async () => {
    const res = await fetch('/api/buckets');
    if (res.ok) setBuckets(await res.json());
  };

  useEffect(() => { fetchBuckets(); }, []);

  const createBucket = async () => {
    if (!newName) return;
    await fetch('/api/buckets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName, versioning }),
    });
    setNewName('');
    setShowCreate(false);
    fetchBuckets();
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">File Browser</h1>
          <p className="text-gray-500 text-sm mt-1">Browse and manage files across all buckets</p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-4 py-2 bg-emerald-600 text-white text-sm rounded hover:bg-emerald-700"
        >
          + Create Bucket
        </button>
      </div>

      {showCreate && (
        <div className="mb-6 p-4 bg-white border border-gray-200 rounded-lg shadow">
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Bucket Name</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value.toLowerCase().replace(/[^a-z0-9.-]/g, '-'))}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                placeholder="my-bucket-name"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-700 pb-2">
              <input type="checkbox" checked={versioning} onChange={(e) => setVersioning(e.target.checked)} />
              Versioning
            </label>
            <button onClick={createBucket} className="px-4 py-2 bg-emerald-600 text-white text-sm rounded hover:bg-emerald-700">
              Create
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {buckets.map((b) => (
          <Link
            key={b.name}
            href={`/browse/${b.name}`}
            className="block p-4 bg-white border border-gray-200 rounded-lg shadow hover:shadow-md hover:border-emerald-300 transition-all"
          >
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">🗂</span>
              <h3 className="font-semibold text-gray-900">{b.name}</h3>
            </div>
            <div className="flex justify-between text-sm text-gray-500">
              <span>{b.objectCount} objects</span>
              <span>{formatBytes(b.totalSize)}</span>
            </div>
            {b.versioning && (
              <span className="inline-block mt-2 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs rounded">
                Versioned
              </span>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
