import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '../components/shared/Navbar';
import { listingsAPI, bidsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import StatusBadge from '../components/shared/StatusBadge';
import toast from 'react-hot-toast';

export default function ListingDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { joinListing, leaveListing, on } = useSocket() || {};
  const navigate = useNavigate();
  const [listing, setListing] = useState(null);
  const [bids, setBids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bidForm, setBidForm] = useState({ quantity_requested: '', price_per_tonne: '', delivery_deadline: '', notes: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchListing();
    joinListing?.(id);
    const unsub = on?.('new_bid', ({ listingId, bid }) => {
      if (String(listingId) === String(id)) {
        setBids((prev) => {
          const exists = prev.find((b) => b.id === bid.id);
          return exists ? prev.map((b) => b.id === bid.id ? bid : b) : [bid, ...prev];
        });
        toast('New bid received!', { icon: '🔨' });
      }
    });
    return () => { leaveListing?.(id); unsub?.(); };
  }, [id]);

  const fetchListing = async () => {
    try {
      const { data } = await listingsAPI.getById(id);
      setListing(data);
      setBids(data.bids || []);
    } catch { navigate('/listings'); }
    finally { setLoading(false); }
  };

  const placeBid = async (e) => {
    e.preventDefault();
    if (!user) { navigate('/login'); return; }
    setSubmitting(true);
    try {
      await bidsAPI.place(id, bidForm);
      toast.success('Bid placed successfully!');
      setBidForm({ quantity_requested: '', price_per_tonne: '', delivery_deadline: '', notes: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to place bid');
    } finally { setSubmitting(false); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" /></div>;
  if (!listing) return null;

  const minPriceRs = listing.min_price / 100;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-3 gap-6">
          {/* Left: Listing Details */}
          <div className="col-span-2 space-y-6">
            <div className="card">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h1 className="text-2xl font-bold text-gray-800 capitalize">{listing.biomass_type.replace(/_/g, ' ')}</h1>
                  <p className="text-gray-500 mt-1">📍 {listing.location_district}, {listing.location_state} — {listing.pincode}</p>
                </div>
                <StatusBadge status={listing.status} />
              </div>

              <div className="grid grid-cols-3 gap-4 mt-6">
                {[
                  { label: 'Available Quantity', value: `${listing.available_quantity} tonnes`, icon: '⚖️' },
                  { label: 'Moisture Content', value: `${listing.moisture_content}%`, icon: '💧' },
                  { label: 'Calorific Value', value: `${listing.calorific_value} kcal/kg`, icon: '🔥' },
                  { label: 'Min Price', value: `₹${minPriceRs.toLocaleString('en-IN')}/t`, icon: '💰' },
                  { label: 'Available From', value: new Date(listing.availability_date).toLocaleDateString('en-IN'), icon: '📅' },
                  { label: 'Supplier', value: listing.supplier?.name, icon: '👤' },
                ].map((item) => (
                  <div key={item.label} className="bg-gray-50 rounded-lg p-3">
                    <p className="text-sm text-gray-500">{item.icon} {item.label}</p>
                    <p className="font-semibold text-gray-800 mt-1">{item.value}</p>
                  </div>
                ))}
              </div>

              {listing.description && <p className="text-gray-600 mt-4 text-sm">{listing.description}</p>}
            </div>

            {/* Bid History */}
            {(user?.role === 'supplier' && listing.supplier_id === user.id) || user?.role === 'admin' ? (
              <div className="card">
                <h2 className="text-lg font-bold text-gray-800 mb-4">Bids Received ({bids.length})</h2>
                {bids.length === 0 ? <p className="text-gray-500 text-sm">No bids yet</p> : (
                  <div className="space-y-3">
                    {bids.sort((a, b) => b.price_per_tonne - a.price_per_tonne).map((bid, i) => (
                      <div key={bid.id} className={`flex items-center justify-between p-3 rounded-lg border ${i === 0 ? 'border-primary bg-primary-50' : 'border-gray-200'}`}>
                        <div>
                          <p className="font-semibold">{bid.buyer?.name}</p>
                          <p className="text-sm text-gray-500">{bid.quantity_requested}t · ₹{(bid.price_per_tonne / 100).toLocaleString('en-IN')}/t</p>
                          {bid.notes && <p className="text-xs text-gray-400 mt-1 italic">"{bid.notes}"</p>}
                          {bid.delivery_deadline && <p className="text-xs text-gray-400">Delivery by: {new Date(bid.delivery_deadline).toLocaleDateString('en-IN')}</p>}
                        </div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-primary">₹{(bid.total_amount / 100).toLocaleString('en-IN')}</p>
                          {listing.supplier_id === user.id && bid.status === 'PENDING' && (
                            <div className="flex gap-2">
                              <button onClick={async () => { await bidsAPI.accept(bid.id); toast.success('Bid accepted!'); fetchListing(); }} className="btn-primary text-xs px-3 py-1">Accept</button>
                              <button onClick={async () => { await bidsAPI.reject(bid.id); fetchListing(); }} className="btn-outline text-xs px-3 py-1 border-red-300 text-red-600">Reject</button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : null}
          </div>

          {/* Right: Place Bid */}
          <div>
            {user?.role === 'buyer' && ['ACTIVE', 'BIDDING'].includes(listing.status) && (
              <div className="card sticky top-4">
                <h2 className="text-lg font-bold text-gray-800 mb-4">Place Your Bid</h2>
                <form onSubmit={placeBid} className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Quantity (tonnes)</label>
                    <input className="input mt-1" type="number" step="0.1" max={listing.available_quantity}
                      value={bidForm.quantity_requested} onChange={(e) => setBidForm({ ...bidForm, quantity_requested: e.target.value })} required placeholder={`Max ${listing.available_quantity}t`} />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Price per tonne (₹)</label>
                    <input className="input mt-1" type="number" min={minPriceRs}
                      value={bidForm.price_per_tonne} onChange={(e) => setBidForm({ ...bidForm, price_per_tonne: e.target.value })} required placeholder={`Min ₹${minPriceRs}`} />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Delivery by</label>
                    <input className="input mt-1" type="date" value={bidForm.delivery_deadline} onChange={(e) => setBidForm({ ...bidForm, delivery_deadline: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Notes (optional)</label>
                    <textarea className="input mt-1 h-20 resize-none" value={bidForm.notes} onChange={(e) => setBidForm({ ...bidForm, notes: e.target.value })} placeholder="Any requirements..." />
                  </div>
                  {bidForm.quantity_requested && bidForm.price_per_tonne && (
                    <div className="bg-primary-50 rounded-lg p-3 text-center">
                      <p className="text-sm text-gray-600">Total Bid Value</p>
                      <p className="text-xl font-bold text-primary">₹{((bidForm.quantity_requested * bidForm.price_per_tonne)).toLocaleString('en-IN')}</p>
                    </div>
                  )}
                  <button type="submit" disabled={submitting} className="btn-accent w-full py-3">{submitting ? 'Placing bid...' : '🔨 Place Bid'}</button>
                </form>
              </div>
            )}

            {!user && (
              <div className="card text-center">
                <p className="text-gray-600 mb-4">Login to place a bid on this listing</p>
                <a href="/login" className="btn-primary block">Login to Bid</a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
