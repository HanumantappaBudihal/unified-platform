'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

const resourceOptions = [
  { id: 'postgres', label: 'PostgreSQL', desc: 'Relational database', icon: '⊛', color: 'blue' },
  { id: 'redis', label: 'Redis', desc: 'Cache, sessions, pub/sub', icon: '◆', color: 'red' },
  { id: 'kafka', label: 'Kafka', desc: 'Event streaming, async messaging', icon: '⚡', color: 'indigo' },
  { id: 'minio', label: 'MinIO', desc: 'S3-compatible object storage', icon: '▤', color: 'emerald' },
];

const colorClasses: Record<string, { border: string; bg: string; text: string }> = {
  blue: { border: 'border-blue-500', bg: 'bg-blue-50', text: 'text-blue-700' },
  red: { border: 'border-red-500', bg: 'bg-red-50', text: 'text-red-700' },
  indigo: { border: 'border-indigo-500', bg: 'bg-indigo-50', text: 'text-indigo-700' },
  emerald: { border: 'border-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-700' },
};

export default function OnboardPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [ownerId, setOwnerId] = useState('admin');
  const [resources, setResources] = useState<string[]>(['postgres', 'redis', 'kafka', 'minio']);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const toggleResource = (id: string) => {
    setResources(prev => prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');

    try {
      // Step 1: Register app
      const regRes = await fetch('/api/platform/apps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, ownerId }),
      });

      if (!regRes.ok) {
        const data = await regRes.json();
        throw new Error(data.error || 'Failed to register app');
      }

      // Step 2: Onboard (provision resources)
      const onboardRes = await fetch(`/api/platform/apps/${slug}/onboard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resources, environment: 'dev' }),
      });

      const data = await onboardRes.json();
      setResult(data);
      setStep(3);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Onboard New Application</h1>
      <p className="text-sm text-gray-500 mb-8">
        Register your app and provision infrastructure resources in one step.
      </p>

      {/* Progress */}
      <div className="flex items-center gap-3 mb-10">
        {['App Details', 'Resources', 'Complete'].map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
              step > i + 1 ? 'bg-violet-600 text-white' :
              step === i + 1 ? 'bg-violet-600 text-white' :
              'bg-gray-200 text-gray-500'
            }`}>
              {step > i + 1 ? '✓' : i + 1}
            </div>
            <span className={`text-sm ${step === i + 1 ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>
              {label}
            </span>
            {i < 2 && <div className="w-8 h-px bg-gray-200" />}
          </div>
        ))}
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Step 1: App Details */}
      {step === 1 && (
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Application Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g., My Awesome App"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none"
            />
            {slug && (
              <p className="mt-1.5 text-xs text-gray-400">
                Slug: <span className="font-mono text-gray-600">{slug}</span>
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="What does this app do?"
              rows={3}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Owner</label>
            <input
              type="text"
              value={ownerId}
              onChange={e => setOwnerId(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none"
            />
          </div>

          <button
            onClick={() => setStep(2)}
            disabled={!name || !ownerId}
            className="w-full py-2.5 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Next: Select Resources
          </button>
        </div>
      )}

      {/* Step 2: Resources */}
      {step === 2 && (
        <div className="space-y-5">
          <p className="text-sm text-gray-600">
            Select which infrastructure resources to provision for <strong>{name}</strong>.
          </p>

          <div className="grid grid-cols-2 gap-3">
            {resourceOptions.map(opt => {
              const selected = resources.includes(opt.id);
              const colors = colorClasses[opt.color];
              return (
                <button
                  key={opt.id}
                  onClick={() => toggleResource(opt.id)}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    selected
                      ? `${colors.border} ${colors.bg}`
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-2xl mb-2">{opt.icon}</div>
                  <div className={`text-sm font-semibold ${selected ? colors.text : 'text-gray-700'}`}>
                    {opt.label}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">{opt.desc}</div>
                </button>
              );
            })}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep(1)}
              className="flex-1 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || resources.length === 0}
              className="flex-1 py-2.5 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Provisioning...' : `Onboard (${resources.length} resources)`}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Complete */}
      {step === 3 && result && (
        <div className="space-y-5">
          <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
            <div className="text-3xl mb-2">✓</div>
            <p className="text-lg font-semibold text-emerald-800">App Onboarded Successfully</p>
            <p className="text-sm text-emerald-600 mt-1">
              {Object.keys(result.results || {}).length} resources provisioned
              {result.errors?.length > 0 && `, ${result.errors.length} errors`}
            </p>
          </div>

          {result.errors?.length > 0 && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm font-medium text-amber-800 mb-2">Partial errors:</p>
              {result.errors.map((e: any, i: number) => (
                <p key={i} className="text-xs text-amber-700">{e.service}: {e.error}</p>
              ))}
            </div>
          )}

          {/* Connection Details */}
          {result.results && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-700">Connection Details</h3>
              {Object.entries(result.results).map(([service, data]: [string, any]) => (
                <div key={service} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-xs font-bold text-gray-600 uppercase mb-1.5">{service}</p>
                  <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono overflow-x-auto">
                    {JSON.stringify(data.credentials || data.config, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => router.push(`/apps/${slug}`)}
              className="flex-1 py-2.5 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 transition-colors"
            >
              View App Details
            </button>
            <button
              onClick={() => router.push('/apps')}
              className="flex-1 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              All Apps
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
