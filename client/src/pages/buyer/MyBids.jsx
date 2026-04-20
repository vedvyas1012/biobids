import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/shared/Navbar';
import { bidsAPI } from '../../services/api';
import StatusBadge from '../../components/shared/StatusBadge';

export default function BuyerBids() {
  const [bids, setBids] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    bidsAPI.getMy().then(({ data }) => setBids(data)).finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">My Bids</h1>
        {loading ? <div className="card animate-pulse h-40" /> : (
          <div className="card overflow-hidden p-0">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>{['Listing','Supplier','Qty Requested','Price/t','Total','Status','Actions'].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {bids.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-12 text-gray-500">No bids yet. <Link to="/listings" className="text-primary hover:underline">Browse listings →</Link></td></tr>
                ) : bids.map((b) => (
                  <tr key={b.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link to={`/listings/${b.listing_id}`} className="text-primary hover:underline font-medium capitalize">{b.listing?.biomass_type?.replace(/_/g, ' ')}</Link>
                      <p className="text-xs text-gray-500">{b.listing?.location_district}, {b.listing?.location_state}</p>
                    </td>
                    <td className="px-4 py-3 text-sm">{b.listing?.supplier?.name}</td>
                    <td className="px-4 py-3 text-sm">{b.quantity_requested}t</td>
                    <td className="px-4 py-3 text-sm">₹{(b.price_per_tonne / 100).toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3 font-semibold">₹{(b.total_amount / 100).toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3"><StatusBadge status={b.status} /></td>
                    <td className="px-4 py-3">
                      {b.status === 'ACCEPTED' && <Link to={`/dashboard/buyer/orders`} className="text-xs text-primary hover:underline">Pay Now →</Link>}
                    </td>
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
