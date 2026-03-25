'use client';
import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface FileObj {
  name?: string;
  prefix?: string;
  size: number;
  lastModified?: string;
  isDir: boolean;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default function BucketBrowserPage() {
  const params = useParams();
  const bucket = params.bucket as string;
  const [prefix, setPrefix] = useState('');
  const [objects, setObjects] = useState<FileObj[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  const fetchObjects = useCallback(async () => {
    const res = await fetch(`/api/objects?bucket=${bucket}&prefix=${prefix}`);
    if (res.ok) {
      const data = await res.json();
      setObjects(data.objects);
    }
  }, [bucket, prefix]);

  useEffect(() => { fetchObjects(); }, [fetchObjects]);

  const uploadFiles = async (files: FileList | File[]) => {
    setUploading(true);
    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('bucket', bucket);
      formData.append('prefix', prefix);
      await fetch('/api/upload', { method: 'POST', body: formData });
    }
    setUploading(false);
    fetchObjects();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) uploadFiles(e.dataTransfer.files);
  };

  const deleteFile = async (name: string) => {
    if (!confirm(`Delete ${name}?`)) return;
    await fetch('/api/objects', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bucket, object: name }),
    });
    fetchObjects();
  };

  const shareFile = async (name: string) => {
    const res = await fetch('/api/presign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bucket, object: name, expiry: 86400 }),
    });
    if (res.ok) {
      const data = await res.json();
      setShareUrl(data.url);
    }
  };

  const breadcrumbs = prefix.split('/').filter(Boolean);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Link href="/browse" className="hover:text-emerald-600">Buckets</Link>
            <span>/</span>
            <button onClick={() => setPrefix('')} className="hover:text-emerald-600 font-medium text-gray-900">
              {bucket}
            </button>
            {breadcrumbs.map((part, i) => (
              <span key={i} className="flex items-center gap-2">
                <span>/</span>
                <button
                  onClick={() => setPrefix(breadcrumbs.slice(0, i + 1).join('/') + '/')}
                  className="hover:text-emerald-600"
                >
                  {part}
                </button>
              </span>
            ))}
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{bucket}</h1>
        </div>
        <label className="px-4 py-2 bg-emerald-600 text-white text-sm rounded hover:bg-emerald-700 cursor-pointer">
          {uploading ? 'Uploading...' : '+ Upload Files'}
          <input
            type="file"
            multiple
            className="hidden"
            onChange={(e) => e.target.files && uploadFiles(e.target.files)}
            disabled={uploading}
          />
        </label>
      </div>

      {shareUrl && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded flex items-center justify-between">
          <div className="flex-1 mr-3">
            <p className="text-sm font-medium text-blue-700">Shareable Link (expires in 24h)</p>
            <input
              type="text"
              value={shareUrl}
              readOnly
              className="w-full mt-1 px-2 py-1 text-xs bg-white border rounded font-mono"
              onClick={(e) => (e.target as HTMLInputElement).select()}
            />
          </div>
          <button
            onClick={() => { navigator.clipboard.writeText(shareUrl); }}
            className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
          >
            Copy
          </button>
          <button onClick={() => setShareUrl(null)} className="ml-2 text-blue-400 hover:text-blue-600">✕</button>
        </div>
      )}

      <div
        className={`bg-white rounded-lg shadow border ${dragOver ? 'border-emerald-400 bg-emerald-50' : 'border-gray-200'} transition-colors`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        {dragOver && (
          <div className="p-8 text-center text-emerald-600 font-medium">Drop files here to upload</div>
        )}

        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-3 font-medium text-gray-600">Name</th>
              <th className="text-right p-3 font-medium text-gray-600">Size</th>
              <th className="text-right p-3 font-medium text-gray-600">Modified</th>
              <th className="text-right p-3 font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {objects.map((obj, i) => (
              <tr key={i} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="p-3">
                  {obj.isDir ? (
                    <button
                      onClick={() => setPrefix(obj.prefix!)}
                      className="flex items-center gap-2 text-emerald-600 hover:text-emerald-700 font-medium"
                    >
                      📁 {obj.prefix?.replace(prefix, '').replace('/', '')}
                    </button>
                  ) : (
                    <span className="flex items-center gap-2 text-gray-900">
                      📄 {(obj.name || '').replace(prefix, '')}
                    </span>
                  )}
                </td>
                <td className="p-3 text-right text-gray-500">{obj.isDir ? '-' : formatBytes(obj.size)}</td>
                <td className="p-3 text-right text-gray-500">
                  {obj.lastModified ? new Date(obj.lastModified).toLocaleDateString() : '-'}
                </td>
                <td className="p-3 text-right">
                  {!obj.isDir && (
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => shareFile(obj.name!)}
                        className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                      >
                        Share
                      </button>
                      <button
                        onClick={() => deleteFile(obj.name!)}
                        className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {objects.length === 0 && (
              <tr>
                <td colSpan={4} className="p-12 text-center text-gray-400">
                  {dragOver ? 'Drop files to upload' : 'No files yet. Drag & drop or click Upload.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
