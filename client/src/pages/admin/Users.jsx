import React, { useCallback, useEffect, useRef, useState } from 'react';
import Navbar from '../../components/shared/Navbar';
import { adminAPI } from '../../services/api';
import toast from 'react-hot-toast';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [activityData, setActivityData] = useState(null);
  const [activityLoading, setActivityLoading] = useState(false);
  const activityAbortRef = useRef(null);

  const loadUsers = useCallback(() => {
    setLoading(true);
    adminAPI.getUsers().then(({ data }) => setUsers(data)).finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  // Abort any in-flight activity request when the component unmounts
  useEffect(() => () => { activityAbortRef.current?.abort(); }, []);

  const handleToggleStatus = async (user) => {
    const action = user.is_active !== false ? 'block' : 'unblock';
    if (!window.confirm(`Are you sure you want to ${action} ${user.name}?`)) return;
    try {
      await adminAPI.toggleUserStatus(user.id);
      loadUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to ${action} user`);
    }
  };

  const handleVerifyGST = async (user) => {
    const newState = !user.gst_verified;
    try {
      await adminAPI.verifyGST(user.id, newState);
      toast.success(`GST ${newState ? 'verified' : 'unverified'} for ${user.name}`);
      loadUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update GST verification');
    }
  };

  const handleViewActivity = (userId) => {
    // Cancel any in-flight request for a previous user
    if (activityAbortRef.current) activityAbortRef.current.abort();
    const controller = new AbortController();
    activityAbortRef.current = controller;

    setActivityLoading(true);
    setActivityData(null);

    adminAPI.getUserActivity(userId, { signal: controller.signal })
      .then(({ data }) => { if (!controller.signal.aborted) setActivityData(data); })
      .catch((err) => { if (err.name !== 'CanceledError' && err.name !== 'AbortError') console.error(err); })
      .finally(() => { if (!controller.signal.aborted) setActivityLoading(false); });
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
                  {['ID', 'Name', 'Email', 'Role', 'State', 'GST', 'Status', 'Joined', 'Actions'].map((h) => (
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
                    <td className="px-4 py-3 text-sm">
                      {u.role === 'buyer' ? (
                        u.gst_number ? (
                          <span className={`inline-flex items-center gap-1 text-xs font-medium ${u.gst_verified ? 'text-green-700' : 'text-amber-600'}`}>
                            {u.gst_verified ? '✅ Verified' : '⚠️ Pending'}
                          </span>
                        ) : <span className="text-xs text-gray-400">No GST</span>
                      ) : <span className="text-xs text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${u.is_active !== false ? 'text-green-700' : 'text-red-600'}`}>
                        <span className={`w-2 h-2 rounded-full ${u.is_active !== false ? 'bg-green-500' : 'bg-red-500'}`} />
                        {u.is_active !== false ? 'Active' : 'Blocked'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{new Date(u.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      {u.role !== 'admin' && (
                        <div className="flex gap-2 flex-wrap">
                          <button
                            onClick={() => handleToggleStatus(u)}
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
                          {u.role === 'buyer' && u.gst_number && (
                            <button
                              onClick={() => handleVerifyGST(u)}
                              className={`text-xs px-2 py-1 rounded border ${u.gst_verified ? 'border-gray-300 text-gray-500 hover:bg-gray-50' : 'border-green-400 text-green-700 hover:bg-green-50'}`}
                              title={u.gst_verified ? 'Click to unverify GST' : `Verify GST: ${u.gst_number}`}
                            >
                              {u.gst_verified ? 'Unverify GST' : '✓ Verify GST'}
                            </button>
                          )}
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
