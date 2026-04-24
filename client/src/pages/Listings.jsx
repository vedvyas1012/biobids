import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/shared/Navbar';
import { listingsAPI } from '../services/api';
import StatusBadge from '../components/shared/StatusBadge';
import { BIOMASS_TYPES } from '../constants/biomass';
const STATES = ['Madhya Pradesh','Uttar Pradesh','Punjab','Haryana','Maharashtra','Gujarat','Rajasthan','Bihar'];

export default function Listings() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ type: '', location_state: '', quantity_min: '', moisture_max: '', calorific_min: '', price_max: '' });
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => { fetchListings(); }, [page, filters]);

  const fetchListings = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 12, ...Object.fromEntries(Object.entries(filters).filter(([,v]) => v)) };
      const { data } = await listingsAPI.getAll(params);
      setListings(data.listings);
      setTotal(data.total);
    } catch {} finally { setLoading(false); }
  };

  const setFilter = (k) => (e) => { setFilters({ ...filters, [k]: e.target.value }); setPage(1); };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Available Biomass Listings</h1>

        <div className="flex gap-6">
          {/* Filters Sidebar */}
          <aside className="w-64 flex-shrink-0">
            <div className="card sticky top-4">
              <h3 className="font-semibold text-gray-800 mb-4">Filters</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Biomass Type</label>
                  <select className="input mt-1" value={filters.type} onChange={setFilter('type')}>
                    <option value="">All types</option>
                    {BIOMASS_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">State</label>
                  <select className="input mt-1" value={filters.location_state} onChange={setFilter('location_state')}>
                    <option value="">All states</option>
                    {STATES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Min Quantity (t)</label>
                  <input className="input mt-1" type="number" placeholder="e.g. 10" value={filters.quantity_min} onChange={setFilter('quantity_min')} />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Max Moisture %</label>
                  <input className="input mt-1" type="number" placeholder="e.g. 15" value={filters.moisture_max} onChange={setFilter('moisture_max')} />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Min Calorific (kcal/kg)</label>
                  <input className="input mt-1" type="number" placeholder="e.g. 3500" value={filters.calorific_min} onChange={setFilter('calorific_min')} />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Max Price (₹/t)</label>
                  <input className="input mt-1" type="number" placeholder="e.g. 5000" value={filters.price_max} onChange={setFilter('price_max')} />
                </div>
                <button onClick={() => { setFilters({ type: '', location_state: '', quantity_min: '', moisture_max: '', calorific_min: '', price_max: '' }); setPage(1); }} className="btn-outline w-full text-sm">Clear Filters</button>
              </div>
            </div>
          </aside>

          {/* Listings Grid */}
          <div className="flex-1">
            <div className="flex justify-between items-center mb-4">
              <p className="text-gray-600 text-sm">{total} listings found</p>
            </div>

            {loading ? (
              <div className="grid grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => <div key={i} className="card h-48 animate-pulse bg-gray-100" />)}
              </div>
            ) : listings.length === 0 ? (
              <div className="card text-center py-16">
                <p className="text-5xl mb-4">🌾</p>
                <p className="text-gray-500">No listings match your filters</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-4">
                {listings.map((l) => (
                  <Link key={l.id} to={`/listings/${l.id}`} className="card hover:shadow-md transition-shadow cursor-pointer block">
                    {l.media?.[0] && <img src={l.media[0].file_url} alt="" className="w-full h-32 object-cover rounded-lg mb-3" />}
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-semibold text-gray-800 capitalize">{l.biomass_type.replace(/_/g, ' ')}</span>
                      <StatusBadge status={l.status} />
                    </div>
                    <p className="text-2xl font-bold text-primary">{l.available_quantity}t</p>
                    <p className="text-sm text-gray-500 mt-1">📍 {l.location_district}, {l.location_state}</p>
                    <div className="flex gap-3 mt-2 text-xs text-gray-500">
                      <span>💧 {l.moisture_content}%</span>
                      <span>🔥 {l.calorific_value} kcal/kg</span>
                    </div>
                    <p className="text-accent font-bold mt-3">Min ₹{(l.min_price / 100).toLocaleString('en-IN')}/t</p>
                  </Link>
                ))}
              </div>
            )}

            {/* Pagination */}
            {total > 12 && (
              <div className="flex justify-center gap-2 mt-8">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-outline px-4 py-2 disabled:opacity-40">← Prev</button>
                <span className="px-4 py-2 text-gray-600">Page {page}</span>
                <button onClick={() => setPage(p => p + 1)} disabled={page * 12 >= total} className="btn-outline px-4 py-2 disabled:opacity-40">Next →</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
