'use client';
import { useEffect, useState } from 'react';

export default function TeamsPage() {
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const fetchTeams = () => {
    fetch('/api/platform/teams')
      .then(r => r.json())
      .then(data => setTeams(data.teams || []))
      .catch(() => setTeams([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchTeams(); }, []);

  const handleCreate = async () => {
    if (!name) return;
    await fetch('/api/platform/teams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description }),
    });
    setName('');
    setDescription('');
    setShowForm(false);
    fetchTeams();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Teams</h1>
          <p className="text-sm text-gray-500 mt-1">Manage teams and their members</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2.5 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 transition-colors"
        >
          + Create Team
        </button>
      </div>

      {showForm && (
        <div className="mb-6 p-5 bg-white border border-gray-200 rounded-xl space-y-4">
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Team name"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-violet-500"
          />
          <input
            type="text"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Description (optional)"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-violet-500"
          />
          <div className="flex gap-3">
            <button onClick={handleCreate} disabled={!name} className="px-4 py-2 bg-violet-600 text-white text-sm rounded-lg hover:bg-violet-700 disabled:opacity-50">
              Create
            </button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-300 text-gray-600 text-sm rounded-lg hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-20 text-gray-400">Loading teams...</div>
      ) : teams.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-gray-200 rounded-xl">
          <p className="text-gray-500">No teams yet. Create one to organize your apps.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {teams.map(team => (
            <div key={team.id} className="bg-white border border-gray-200 rounded-xl p-5 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">{team.name}</h3>
                <p className="text-xs text-gray-400 font-mono">{team.slug}</p>
                {team.description && <p className="text-sm text-gray-500 mt-1">{team.description}</p>}
              </div>
              <span className="text-xs text-gray-400">
                {new Date(team.created_at).toLocaleDateString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
