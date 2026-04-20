import React, { useEffect, useState } from 'react';
import Navbar from '../../components/shared/Navbar';
import { adminAPI } from '../../services/api';

export default function AdminTransactions() {
  const [txns, setTxns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { adminAPI.getTransactions().then(({ data }) => setTxns(data)).finally(() => setLoading(false)); }, []);

  const totalGmv = txns.filter(t => t.type === 'ESCROW' && t.status === 'SUCCESS').reduce((s, t) => s + parseInt(t.amount), 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Transaction Log</h1>
          <div className="card py-2 px-4 text-center">
            <p className="text-xs text-gray-500">Platform GMV</p>
            <p className="font-bold text-primary">₹{(totalGmv / 100).toLocaleString('en-IN')}</p>
          </div>
        </div>
        {loading ? <div className="card animate-pulse h-40" /> : (
          <div className="card overflow-hidden p-0">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>{['Txn #','Order','Razorpay Order ID','Amount','Type','Status','Date'].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {txns.length === 0 ? <tr><td colSpan={7} className="text-center py-12 text-gray-500">No transactions</td></tr>
                  : txns.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">#{t.id}</td>
                    <td className="px-4 py-3">#{t.order_id}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{t.razorpay_order_id || '—'}</td>
                    <td className="px-4 py-3 font-semibold text-primary">₹{(t.amount / 100).toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3"><span className="badge badge-blue">{t.type}</span></td>
                    <td className="px-4 py-3"><span className={`text-xs font-semibold ${t.status === 'SUCCESS' ? 'text-green-600' : 'text-red-500'}`}>{t.status}</span></td>
                    <td className="px-4 py-3 text-gray-500">{new Date(t.created_at).toLocaleDateString()}</td>
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
