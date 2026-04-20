import React, { useEffect, useState } from 'react';
import Navbar from '../../components/shared/Navbar';
import { adminAPI } from '../../services/api';
import StatusBadge from '../../components/shared/StatusBadge';

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { adminAPI.getOrders().then(({ data }) => setOrders(data)).finally(() => setLoading(false)); }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">All Orders ({orders.length})</h1>
        {loading ? <div className="card animate-pulse h-40" /> : (
          <div className="card overflow-hidden p-0">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>{['Order #','Biomass','State','Supplier','Buyer','Qty','Amount','Status','Date'].map(h => <th key={h} className="text-left px-3 py-3 text-xs font-semibold text-gray-600 uppercase">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orders.map((o) => (
                  <tr key={o.id} className="hover:bg-gray-50">
                    <td className="px-3 py-3 font-medium">#{o.id}</td>
                    <td className="px-3 py-3 capitalize">{o.listing?.biomass_type?.replace(/_/g, ' ')}</td>
                    <td className="px-3 py-3">{o.listing?.location_state}</td>
                    <td className="px-3 py-3">{o.supplier?.name}</td>
                    <td className="px-3 py-3">{o.buyer?.name}</td>
                    <td className="px-3 py-3">{o.quantity}t</td>
                    <td className="px-3 py-3 font-semibold text-primary">₹{(o.total_amount / 100).toLocaleString('en-IN')}</td>
                    <td className="px-3 py-3"><StatusBadge status={o.status} /></td>
                    <td className="px-3 py-3 text-gray-500">{new Date(o.created_at).toLocaleDateString()}</td>
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
