import React, { useEffect, useState } from 'react';
import Navbar from '../../components/shared/Navbar';
import { adminAPI } from '../../services/api';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [activityData, setActivityData] = useState(null);
  const [activityLoading, setActivityLoading] = useState(false);

  const loadUsers = () =>
    adminAPI.getUsers().then(({ data }) => setUsers(data)).finally(() => setLoading(false));

  useEffect(() => { loadUsers(); }, []);

  const handleToggleStatus = async (userId) => {
    await adminAPI.toggleUserStatus(userId);
    loadUsers();
  };

  const handleViewActivity = async (userId) => {
    setActivityLoading(true);
    setActivityData(null);
    try {
      const { data } = await adminAPI.getUserActivity(userId);
      setActivityData(data);
    } finally {
      setActivityLoading(false);
    }
  };

  const filtered = users.filter((u) => !filter || u.role === filter);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">User Management</h1>
          <select className="input w-40" value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="">All roles</option>
            <option value="supplier">Suppliers</option>
            <option value="buyer">Buyers</option>
          </select>
        </div>

        {loading ? <div className="card animate-pulse h-40" /> : (
          <div className="card overflow-hidden p-0">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {['ID', 'Name', 'Email', 'Role', 'State', 'Status', 'Joined', 'Actions'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-500">#{u.id}</td>
                    <td className="px-4 py-3 font-medium">{u.name}</td>
                    <td className="px-4 py-3 text-sm">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className={`badge ${u.role === 'supplier' ? 'badge-green' : u.role === 'admin' ? 'badge-red' : 'badge-blue'}`}>{u.role}</span>
                    </td>
                    <td className="px-4 py-3 text-sm">{u.location_state || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${u.is_active !== false ? 'text-green-700' : 'text-red-600'}`}>
                        <span className={`w-2 h-2 rounded-full ${u.is_active !== false ? 'bg-green-500' : 'bg-red-500'}`} />
                        {u.is_active !== false ? 'Active' : 'Blocked'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{new Date(u.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      {u.role !== 'admin' && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleToggleStatus(u.id)}
                            className={`text-xs px-2 py-1 rounded border ${u.is_active !== false ? 'border-red-300 text-red-600 hover:bg-red-50' : 'border-green-300 text-green-700 hover:bg-green-50'}`}
                          >
                            {u.is_active !== false ? 'Block' : 'Unblock'}
                          </button>
                          <button
                            onClick={() => handleViewActivity(u.id)}
                            className="text-xs px-2 py-1 rounded border border-blue-300 text-blue-600 hover:bg-blue-50"
                          >
                            Activity
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Activity Modal */}
      {(activityLoading || activityData) && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => { setActivityData(null); setActivityLoading(false); }}
        >
          <div className="bg-white rounded-xl p-6 w-96 shadow-xl" onClick={(e) => e.stopPropagation()}>
            {activityLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
                <p className="text-sm text-gray-500 mt-3">Loading activity…</p>
              </div>
            ) : (
              <>
                <h2 className="text-lg font-bold text-gray-800 mb-0.5">{activityData.user.name}</h2>
                <p className="text-sm text-gray-500 mb-4">{activityData.user.email} · <span className="capitalize">{activityData.user.role}</span></p>
                <div className="grid grid-cols-3 gap-3 text-center mb-5">
                  <div className="bg-green-50 rounded-lg p-3">
                    <p className="text-2xl font-bold text-green-700">{activityData.listings}</p>
                    <p className="text-xs text-gray-500 mt-0.5">Listings</p>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-3">
                    <p className="text-2xl font-bold text-blue-700">{activityData.bids}</p>
                    <p className="text-xs text-gray-500 mt-0.5">Bids</p>
                  </div>
                  <div className="bg-yellow-50 rounded-lg p-3">
                    <p className="text-2xl font-bold text-yellow-700">{activityData.orders}</p>
                    <p className="text-xs text-gray-500 mt-0.5">Orders</p>
                  </div>
                </div>
                <button onClick={() => setActivityData(null)} className="btn-primary w-full">Close</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
