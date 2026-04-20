import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/shared/Navbar';
import { ordersAPI } from '../../services/api';
import StatusBadge from '../../components/shared/StatusBadge';

export default function SupplierOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ordersAPI.getAll().then(({ data }) => setOrders(data)).finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">My Orders</h1>
        {loading ? <div className="card animate-pulse h-40" /> : (
          <div className="card overflow-hidden p-0">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>{['Order #','Biomass','Quantity','Buyer','Total','Status','Action'].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orders.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-12 text-gray-500">No orders yet</td></tr>
                ) : orders.map((o) => (
                  <tr key={o.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">#{o.id}</td>
                    <td className="px-4 py-3 capitalize text-sm">{o.listing?.biomass_type?.replace(/_/g, ' ')}</td>
                    <td className="px-4 py-3 text-sm">{o.quantity}t</td>
                    <td className="px-4 py-3 text-sm">{o.buyer?.name}</td>
                    <td className="px-4 py-3 font-semibold text-primary">₹{(o.total_amount / 100).toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                    <td className="px-4 py-3"><Link to={`/dashboard/supplier/orders/${o.id}`} className="text-primary text-sm hover:underline">View →</Link></td>
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
