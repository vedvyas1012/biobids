import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/shared/Navbar';
import { bidsAPI, ordersAPI, adminAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import StatusBadge from '../../components/shared/StatusBadge';

export default function BuyerDashboard() {
  const { user } = useAuth();
  const [bids, setBids] = useState([]);
  const [orders, setOrders] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      bidsAPI.getMy().catch(() => ({ data: [] })),
      ordersAPI.getAll().catch(() => ({ data: [] })),
      adminAPI.getBuyerAnalytics().catch(() => ({ data: null })),
    ]).then(([b, o, a]) => {
      setBids(b.data.slice(0, 5));
      setOrders(o.data.slice(0, 5));
      setAnalytics(a.data);
    }).finally(() => setLoading(false));
  }, []);

  const cards = analytics ? [
    { label: 'Total Spent', value: `₹${(analytics.totalSpend / 100).toLocaleString('en-IN')}`, icon: '💰', color: 'bg-blue-50 border-blue-200 text-blue-700' },
    { label: 'Total Orders', value: analytics.orderCount, icon: '📦', color: 'bg-green-50 border-green-200 text-green-700' },
    { label: 'Active Bids', value: bids.filter(b => b.status === 'PENDING').length, icon: '🔨', color: 'bg-yellow-50 border-yellow-200 text-yellow-700' },
  ] : [];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Welcome, {user?.name} 🏭</h1>
            <p className="text-gray-500 text-sm mt-1">Buyer Dashboard</p>
          </div>
          <Link to="/dashboard/buyer/browse" className="btn-accent px-5 py-2.5">Browse Listings</Link>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-8">
          {cards.map((c) => (
            <div key={c.label} className={`card border ${c.color} flex items-center gap-4`}>
              <span className="text-3xl">{c.icon}</span>
              <div><p className="text-2xl font-bold">{c.value}</p><p className="text-sm opacity-80">{c.label}</p></div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="card">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-gray-800">My Recent Bids</h2>
              <Link to="/dashboard/buyer/bids" className="text-primary text-sm hover:underline">View all</Link>
            </div>
            {bids.length === 0 ? <p className="text-gray-500 text-sm">No bids yet. <Link to="/dashboard/buyer/browse" className="text-primary hover:underline">Browse listings →</Link></p> :
              bids.map((b) => (
                <div key={b.id} className="flex justify-between items-center py-2 border-b last:border-0">
                  <div>
                    <p className="font-medium text-sm capitalize">{b.listing?.biomass_type?.replace(/_/g, ' ')}</p>
                    <p className="text-xs text-gray-500">{b.quantity_requested}t · ₹{(b.price_per_tonne / 100).toLocaleString('en-IN')}/t</p>
                  </div>
                  <StatusBadge status={b.status} />
                </div>
              ))
            }
          </div>

          <div className="card">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-gray-800">Recent Orders</h2>
              <Link to="/dashboard/buyer/orders" className="text-primary text-sm hover:underline">View all</Link>
            </div>
            {orders.length === 0 ? <p className="text-gray-500 text-sm">No orders yet</p> :
              orders.map((o) => (
                <div key={o.id} className="flex justify-between items-center py-2 border-b last:border-0">
                  <div>
                    <p className="font-medium text-sm">Order #{o.id}</p>
                    <p className="text-xs text-gray-500">₹{(o.total_amount / 100).toLocaleString('en-IN')}</p>
                  </div>
                  <StatusBadge status={o.status} />
                </div>
              ))
            }
          </div>
        </div>
      </div>
    </div>
  );
}
