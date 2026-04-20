import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/shared/Navbar';
import { listingsAPI } from '../../services/api';
import StatusBadge from '../../components/shared/StatusBadge';
import toast from 'react-hot-toast';

export default function MyListings() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetch(); }, []);

  const fetch = async () => {
    try { const { data } = await listingsAPI.getMy(); setListings(data); }
    catch {} finally { setLoading(false); }
  };

  const cancel = async (id) => {
    if (!confirm('Cancel this listing?')) return;
    try { await listingsAPI.delete(id); toast.success('Listing cancelled'); fetch(); }
    catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">My Listings</h1>
          <Link to="/dashboard/supplier/listings/new" className="btn-accent px-5 py-2.5">+ New Listing</Link>
        </div>

        {loading ? <div className="card animate-pulse h-40" /> : (
          <div className="card overflow-hidden p-0">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>{['Biomass Type','Quantity','Location','Moisture','Price','Status','Bids','Actions'].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {listings.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-12 text-gray-500">No listings yet. <Link to="/dashboard/supplier/listings/new" className="text-primary hover:underline">Create your first listing →</Link></td></tr>
                ) : listings.map((l) => (
                  <tr key={l.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium capitalize">{l.biomass_type.replace(/_/g, ' ')}</td>
                    <td className="px-4 py-3">{l.available_quantity}/{l.quantity} t</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{l.location_district}, {l.location_state}</td>
                    <td className="px-4 py-3 text-sm">{l.moisture_content}%</td>
                    <td className="px-4 py-3 font-semibold text-accent">₹{(l.min_price / 100).toLocaleString('en-IN')}/t</td>
                    <td className="px-4 py-3"><StatusBadge status={l.status} /></td>
                    <td className="px-4 py-3 text-sm">{l.bids?.length || 0}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Link to={`/listings/${l.id}`} className="text-xs text-primary hover:underline">View</Link>
                        {l.status === 'ACTIVE' && <button onClick={() => cancel(l.id)} className="text-xs text-red-500 hover:underline">Cancel</button>}
                      </div>
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
