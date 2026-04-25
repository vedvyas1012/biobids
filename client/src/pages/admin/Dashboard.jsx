import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/shared/Navbar';
import { adminAPI } from '../../services/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#2d6a4f', '#40916c', '#f77f00', '#1b4332', '#74c69d', '#d8f3dc'];

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [openDisputes, setOpenDisputes] = useState(0);

  useEffect(() => {
    adminAPI.getAnalytics().then(({ data }) => setData(data)).finally(() => setLoading(false));
    adminAPI.getDisputes()
      .then(({ data }) => setOpenDisputes(data.filter((d) => d.status === 'OPEN').length))
      .catch(() => {});
  }, []);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" /></div>;

  const { summary, byBiomassType, monthlyGmv } = data || {};
  const gmvChartData = (monthlyGmv || []).map(m => ({ month: m.month, GMV: Math.round(m.total / 100) }));

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-8">Admin Dashboard</h1>

        <div className="grid grid-cols-5 gap-4 mb-8">
          {[
            { label: 'Platform GMV', value: `₹${((summary?.gmv || 0) / 100).toLocaleString('en-IN')}`, icon: '💰' },
            { label: 'Total Users', value: summary?.totalUsers || 0, icon: '👥' },
            { label: 'Total Listings', value: summary?.totalListings || 0, icon: '📋' },
            { label: 'Total Orders', value: summary?.totalOrders || 0, icon: '📦' },
            { label: 'Completed', value: summary?.completedOrders || 0, icon: '✅' },
          ].map((c) => (
            <div key={c.label} className="card text-center">
              <p className="text-3xl mb-1">{c.icon}</p>
              <p className="text-2xl font-bold text-gray-800">{c.value}</p>
              <p className="text-sm text-gray-500 mt-1">{c.label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-6 mb-6">
          <div className="card">
            <h2 className="font-bold text-gray-800 mb-4">Monthly GMV (₹)</h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={gmvChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v) => `₹${v.toLocaleString('en-IN')}`} />
                <Bar dataKey="GMV" fill="#2d6a4f" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card">
            <h2 className="font-bold text-gray-800 mb-4">Biomass Type Distribution</h2>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={byBiomassType || []} dataKey="count" nameKey="biomass_type" cx="50%" cy="50%" outerRadius={80} label={({ biomass_type, percent }) => `${biomass_type?.replace(/_/g,' ')}: ${(percent * 100).toFixed(0)}%`}>
                  {(byBiomassType || []).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Manage Users', to: '/admin/users', icon: '👥', desc: 'View and manage all users' },
            { label: 'All Orders', to: '/admin/orders', icon: '📦', desc: 'Monitor all platform orders' },
            { label: 'Disputes', to: '/admin/disputes', icon: '⚖️', desc: 'Resolve buyer-supplier disputes', badge: openDisputes },
            { label: 'Transactions', to: '/admin/transactions', icon: '💳', desc: 'Full transaction log' },
          ].map((item) => (
            <Link key={item.label} to={item.to} className="card hover:shadow-md transition-shadow text-center cursor-pointer block">
              <p className="text-3xl mb-2">{item.icon}</p>
              <p className="font-semibold text-gray-800">{item.label}</p>
              <p className="text-xs text-gray-500 mt-1">{item.desc}</p>
              {item.badge > 0 && (
                <span className="inline-block mt-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{item.badge} open</span>
              )}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
