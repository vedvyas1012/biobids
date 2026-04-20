import React, { useEffect, useState } from 'react';
import Navbar from '../../components/shared/Navbar';
import { paymentsAPI, adminAPI } from '../../services/api';

export default function BuyerPayments() {
  const [txns, setTxns] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([paymentsAPI.getTransactions(), adminAPI.getBuyerAnalytics()])
      .then(([t, a]) => { setTxns(t.data); setAnalytics(a.data); })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Payment History</h1>
        {loading ? <div className="card animate-pulse h-40" /> : (
          <>
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="card text-center">
                <p className="text-3xl font-bold text-primary">₹{((analytics?.totalSpend || 0) / 100).toLocaleString('en-IN')}</p>
                <p className="text-gray-500 text-sm mt-1">Total Spent</p>
              </div>
              <div className="card text-center">
                <p className="text-3xl font-bold text-blue-600">{analytics?.orderCount || 0}</p>
                <p className="text-gray-500 text-sm mt-1">Orders Placed</p>
              </div>
            </div>
            <div className="card overflow-hidden p-0">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>{['Order #','Type','Amount','Status','Date'].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {txns.length === 0 ? <tr><td colSpan={5} className="text-center py-12 text-gray-500">No transactions yet</td></tr>
                    : txns.map((t) => (
                      <tr key={t.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">#{t.order_id}</td>
                        <td className="px-4 py-3 text-sm">{t.type}</td>
                        <td className="px-4 py-3 font-semibold text-primary">₹{(t.amount / 100).toLocaleString('en-IN')}</td>
                        <td className="px-4 py-3"><span className={`text-xs font-semibold ${t.status === 'SUCCESS' ? 'text-green-600' : 'text-red-500'}`}>{t.status}</span></td>
                        <td className="px-4 py-3 text-sm text-gray-500">{new Date(t.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
