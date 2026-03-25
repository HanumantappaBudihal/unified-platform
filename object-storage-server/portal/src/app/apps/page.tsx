'use client';
import { config } from '@/lib/config';

export default function AppsPage() {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    purple: 'bg-purple-50 border-purple-200 text-purple-700',
    green: 'bg-green-50 border-green-200 text-green-700',
    orange: 'bg-orange-50 border-orange-200 text-orange-700',
    gray: 'bg-gray-50 border-gray-200 text-gray-600',
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Applications</h1>
      <p className="text-gray-500 text-sm mb-6">Each application gets its own isolated bucket with dedicated credentials</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {config.apps.map((app) => (
          <div key={app.id} className={`p-5 rounded-lg border ${colors[app.color] || colors.gray}`}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold">{app.name}</h3>
              <span className="text-xs font-mono opacity-75">{app.id}</span>
            </div>
            <p className="text-sm opacity-80 mb-4">{app.description}</p>
            <div className="space-y-2 text-xs font-mono opacity-70">
              <div className="flex justify-between">
                <span>Bucket:</span>
                <span>{app.id}</span>
              </div>
              <div className="flex justify-between">
                <span>Access Key:</span>
                <span>{app.id}-key</span>
              </div>
              <div className="flex justify-between">
                <span>Quota:</span>
                <span>{app.quota}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 bg-white rounded-lg border border-gray-200 shadow p-5">
        <h2 className="text-lg font-bold text-gray-900 mb-3">Quick Integration</h2>
        <pre className="bg-gray-900 text-green-400 p-4 rounded-lg text-sm overflow-x-auto">
{`// Node.js — connect your app to its isolated bucket
import { Client } from 'minio';

const storage = new Client({
  endPoint: 'localhost',
  port: 9000,
  useSSL: false,
  accessKey: 'your-app-key',      // e.g., document-svc-key
  secretKey: 'your-app-secret',   // e.g., document-svc-secret
});

// Upload a file
await storage.putObject('your-app-bucket', 'path/to/file.pdf', fileBuffer);

// Generate a share link (expires in 1 hour)
const url = await storage.presignedGetObject('your-app-bucket', 'path/to/file.pdf', 3600);

// Download a file
const stream = await storage.getObject('your-app-bucket', 'path/to/file.pdf');`}
        </pre>
      </div>
    </div>
  );
}
