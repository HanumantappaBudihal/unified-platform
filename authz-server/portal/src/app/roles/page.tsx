'use client';
import { useEffect, useState } from 'react';

interface UserRole {
  global_roles: string[];
  apps: Record<string, { role: string; projects?: Record<string, string> }>;
}

export default function RolesPage() {
  const [users, setUsers] = useState<Record<string, UserRole>>({});
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/opa?path=/v1/data/roles/users')
      .then(r => r.json())
      .then(data => {
        setUsers(data.result || {});
        const keys = Object.keys(data.result || {});
        if (keys.length > 0) setSelectedUser(keys[0]);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const userList = Object.keys(users);

  return (
    <div className="p-6 lg:p-8 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Roles & Users</h1>
        <p className="text-sm text-gray-500 mt-1">User-to-application role mappings stored in OPA</p>
      </div>

      {loading ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <p className="text-gray-400">Loading roles...</p>
        </div>
      ) : userList.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <p className="text-gray-400">No role data found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* User List */}
          <div className="lg:col-span-1">
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="p-4 border-b border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {userList.length} Users
                </p>
              </div>
              <div className="divide-y divide-gray-100">
                {userList.map(username => {
                  const u = users[username];
                  const isSuperAdmin = u.global_roles?.includes('super-admin');
                  return (
                    <button
                      key={username}
                      onClick={() => setSelectedUser(username)}
                      className={`w-full text-left px-4 py-3 transition-colors ${
                        selectedUser === username
                          ? 'bg-blue-50 text-blue-700 font-medium border-l-2 border-blue-500'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <p className="text-sm">{username}</p>
                      {isSuperAdmin && (
                        <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-medium">
                          super-admin
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="text-xs text-amber-700">
                Edit <code className="bg-amber-100 px-1 rounded">config/opa/data/roles.json</code> to add/modify users, then restart OPA.
              </p>
            </div>
          </div>

          {/* User Detail */}
          <div className="lg:col-span-3">
            {selectedUser && users[selectedUser] && (
              <div className="space-y-4">
                <div className="bg-white border border-gray-200 rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-700 font-bold text-sm">{selectedUser[0].toUpperCase()}</span>
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">{selectedUser}</h2>
                      <p className="text-xs text-gray-500">
                        Global roles: {users[selectedUser].global_roles?.length > 0
                          ? users[selectedUser].global_roles.join(', ')
                          : 'none'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* App Roles */}
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                  <div className="p-4 border-b border-gray-100">
                    <p className="text-sm font-semibold text-gray-900">Application Roles</p>
                  </div>
                  {Object.keys(users[selectedUser].apps || {}).length === 0 ? (
                    <div className="p-6 text-center text-gray-400 text-sm">No app roles assigned</div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 text-left">
                          <th className="px-4 py-3 font-medium text-gray-500">Application</th>
                          <th className="px-4 py-3 font-medium text-gray-500">Role</th>
                          <th className="px-4 py-3 font-medium text-gray-500">Projects</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {Object.entries(users[selectedUser].apps).map(([app, data]) => (
                          <tr key={app} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-medium text-gray-900">{app}</td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                                {data.role}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              {data.projects ? (
                                <div className="flex flex-wrap gap-1.5">
                                  {Object.entries(data.projects).map(([proj, role]) => (
                                    <span key={proj} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                                      {proj}: <span className="font-medium">{role}</span>
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-gray-400 text-xs">—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
