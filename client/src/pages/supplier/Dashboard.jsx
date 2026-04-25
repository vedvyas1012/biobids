import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/shared/Navbar';
import { listingsAPI, ordersAPI, adminAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import StatusBadge from '../../components/shared/StatusBadge';

export default function SupplierDashboard() {
  const { user } = useAuth();
  const [listings, setListings] = useState([]);
  const [orders, setOrders] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      listingsAPI.getMy().catch(() => ({ data: [] })),
      ordersAPI.getAll().catch(() => ({ data: [] })),
      adminAPI.getSupplierAnalytics().catch(() => ({ data: null })),
    ]).then(([l, o, a]) => {
      setListings(l.data.slice(0, 5));
      setOrders(o.data.slice(0, 5));
      setAnalytics(a.data);
    }).finally(() => setLoading(false));
  }, []);

  const cards = analytics ? [
    { label: 'Total Earnings', value: `₹${(analytics.earnings / 100).toLocaleString('en-IN')}`, icon: '💰', color: 'bg-green-50 border-green-200 text-green-700' },
    { label: 'Active Listings', value: analytics.listingCount, icon: '📋', color: 'bg-blue-50 border-blue-200 text-blue-700' },
    { label: 'Total Orders', value: analytics.orderCount, icon: '📦', color: 'bg-yellow-50 border-yellow-200 text-yellow-700' },
    { label: 'Avg Bid Price', value: `₹${Math.round((analytics.avgBidPricePaise || 0) / 100).toLocaleString('en-IN')}/t`, icon: '📈', color: 'bg-purple-50 border-purple-200 text-purple-700' },
  ] : [];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Welcome, {user?.name} 🌾</h1>
            <p className="text-gray-500 text-sm mt-1">Supplier Dashboard</p>
          </div>
          <Link to="/dashboard/supplier/listings/new" className="btn-accent px-5 py-2.5">+ New Listing</Link>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {cards.map((c) => (
            <div key={c.label} className={`card border ${c.color} flex items-center gap-4`}>
              <span className="text-3xl">{c.icon}</span>
              <div>
                <p className="text-2xl font-bold">{c.value}</p>
                <p className="text-sm opacity-80">{c.label}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Recent Listings */}
          <div className="card">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-gray-800">Recent Listings</h2>
              <Link to="/dashboard/supplier/listings" className="text-primary text-sm hover:underline">View all</Link>
            </div>
            {loading ? <div className="animate-pulse space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-12 bg-gray-100 rounded" />)}</div> :
              listings.length === 0 ? <p className="text-gray-500 text-sm">No listings yet. <Link to="/dashboard/supplier/listings/new" className="text-primary hover:underline">Create one →</Link></p> :
              listings.map((l) => (
                <div key={l.id} className="flex justify-between items-center py-2 border-b last:border-0">
                  <div>
                    <p className="font-medium text-sm capitalize">{l.biomass_type.replace(/_/g, ' ')}</p>
                    <p className="text-xs text-gray-500">{l.available_quantity}t · {l.location_district}</p>
                  </div>
                  <StatusBadge status={l.status} />
                </div>
              ))
            }
          </div>

          {/* Recent Orders */}
          <div className="card">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-gray-800">Recent Orders</h2>
              <Link to="/dashboard/supplier/orders" className="text-primary text-sm hover:underline">View all</Link>
            </div>
            {loading ? <div className="animate-pulse space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-12 bg-gray-100 rounded" />)}</div> :
              orders.length === 0 ? <p className="text-gray-500 text-sm">No orders yet</p> :
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
