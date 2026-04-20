import React, { useEffect, useState } from 'react';
import Navbar from '../../components/shared/Navbar';
import { adminAPI } from '../../services/api';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => { adminAPI.getUsers().then(({ data }) => setUsers(data)).finally(() => setLoading(false)); }, []);

  const filtered = users.filter(u => !filter || u.role === filter);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 py-8">
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
                <tr>{['ID','Name','Email','Phone','Role','State','Verified','Joined'].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-500">#{u.id}</td>
                    <td className="px-4 py-3 font-medium">{u.name}</td>
                    <td className="px-4 py-3 text-sm">{u.email}</td>
                    <td className="px-4 py-3 text-sm">{u.phone || '—'}</td>
                    <td className="px-4 py-3"><span className={`badge ${u.role === 'supplier' ? 'badge-green' : u.role === 'admin' ? 'badge-red' : 'badge-blue'}`}>{u.role}</span></td>
                    <td className="px-4 py-3 text-sm">{u.location_state || '—'}</td>
                    <td className="px-4 py-3">{u.is_verified ? '✅' : '❌'}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{new Date(u.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
