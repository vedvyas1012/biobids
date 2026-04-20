import React, { useEffect, useState } from 'react';
import Navbar from '../../components/shared/Navbar';
import { adminAPI, paymentsAPI } from '../../services/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function SupplierEarnings() {
  const [analytics, setAnalytics] = useState(null);
  const [txns, setTxns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([adminAPI.getSupplierAnalytics(), paymentsAPI.getTransactions()])
      .then(([a, t]) => { setAnalytics(a.data); setTxns(t.data); })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Earnings & Analytics</h1>

        {loading ? <div className="card animate-pulse h-40" /> : (
          <>
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="card text-center">
                <p className="text-3xl font-bold text-primary">₹{((analytics?.earnings || 0) / 100).toLocaleString('en-IN')}</p>
                <p className="text-gray-500 text-sm mt-1">Total Earnings</p>
              </div>
              <div className="card text-center">
                <p className="text-3xl font-bold text-blue-600">{analytics?.orderCount || 0}</p>
                <p className="text-gray-500 text-sm mt-1">Total Orders</p>
              </div>
              <div className="card text-center">
                <p className="text-3xl font-bold text-accent">₹{Math.round((analytics?.avgBidPricePaise || 0) / 100).toLocaleString('en-IN')}</p>
                <p className="text-gray-500 text-sm mt-1">Avg Bid Price /t</p>
              </div>
            </div>

            {/* Transactions */}
            <div className="card">
              <h2 className="font-bold text-gray-800 mb-4">Transaction History</h2>
              <div className="space-y-2">
                {txns.length === 0 ? <p className="text-gray-500 text-sm">No transactions yet</p> : txns.map((t) => (
                  <div key={t.id} className="flex justify-between items-center py-2 border-b last:border-0">
                    <div>
                      <p className="text-sm font-medium">Order #{t.order_id}</p>
                      <p className="text-xs text-gray-500">{t.type} · {new Date(t.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-primary">₹{(t.amount / 100).toLocaleString('en-IN')}</p>
                      <span className={`text-xs ${t.status === 'SUCCESS' ? 'text-green-600' : 'text-red-500'}`}>{t.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
