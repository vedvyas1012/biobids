import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/shared/Navbar';
import { listingsAPI } from '../../services/api';
import toast from 'react-hot-toast';

const BIOMASS_TYPES = ['rice_husk','sugarcane_bagasse','wood_chips','cotton_stalks','wheat_straw','corn_cobs','bamboo','mustard_husk','sugarcane_husk','peanut_husk','other'];
const STATES = ['Andhra Pradesh','Bihar','Chhattisgarh','Gujarat','Haryana','Jharkhand','Karnataka','Madhya Pradesh','Maharashtra','Odisha','Punjab','Rajasthan','Tamil Nadu','Telangana','Uttar Pradesh','West Bengal'];

export default function NewListing() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState([]);
  const [form, setForm] = useState({
    biomass_type: '', quantity: '', location_state: '', location_district: '',
    pincode: '', moisture_content: '', calorific_value: '', min_price: '',
    availability_date: '', description: '',
  });

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      files.forEach((f) => fd.append('files', f));
      await listingsAPI.create(fd);
      toast.success('Listing created successfully!');
      navigate('/dashboard/supplier/listings');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create listing');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Create New Biomass Listing</h1>

        <form onSubmit={handleSubmit} className="card space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Biomass Type *</label>
              <select className="input" value={form.biomass_type} onChange={set('biomass_type')} required>
                <option value="">Select type</option>
                {BIOMASS_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantity (tonnes) *</label>
              <input className="input" type="number" step="0.1" min="0.1" value={form.quantity} onChange={set('quantity')} required placeholder="e.g. 50" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">State *</label>
              <select className="input" value={form.location_state} onChange={set('location_state')} required>
                <option value="">Select state</option>
                {STATES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">District *</label>
              <input className="input" value={form.location_district} onChange={set('location_district')} required placeholder="District" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pincode *</label>
              <input className="input" value={form.pincode} onChange={set('pincode')} required placeholder="452001" maxLength={6} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Moisture Content % *</label>
              <input className="input" type="number" step="0.1" min="0" max="100" value={form.moisture_content} onChange={set('moisture_content')} required placeholder="e.g. 12" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Calorific Value (kcal/kg) *</label>
              <input className="input" type="number" min="0" value={form.calorific_value} onChange={set('calorific_value')} required placeholder="e.g. 3800" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Min Price (₹/tonne) *</label>
              <input className="input" type="number" min="0" value={form.min_price} onChange={set('min_price')} required placeholder="e.g. 4500" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Availability Date *</label>
            <input className="input" type="date" value={form.availability_date} onChange={set('availability_date')} required min={new Date().toISOString().split('T')[0]} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
            <textarea className="input h-24 resize-none" value={form.description} onChange={set('description')} placeholder="Quality details, packing type, loading facility available, etc." />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Upload Photos / Quality Certificate (max 5)</label>
            <input type="file" multiple accept="image/*,.pdf,.doc,.docx" onChange={(e) => setFiles(Array.from(e.target.files).slice(0, 5))}
              className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary-50 file:text-primary file:font-medium hover:file:bg-primary-100" />
            {files.length > 0 && <p className="text-xs text-gray-500 mt-1">{files.length} file(s) selected</p>}
          </div>

          {/* Price preview */}
          {form.quantity && form.min_price && (
            <div className="bg-primary-50 rounded-lg p-4">
              <p className="text-sm text-gray-600">Expected Revenue (at min price)</p>
              <p className="text-2xl font-bold text-primary">₹{(form.quantity * form.min_price).toLocaleString('en-IN')}</p>
              <p className="text-xs text-gray-500">{form.quantity} tonnes × ₹{form.min_price}/tonne</p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={loading} className="btn-primary px-8 py-3">{loading ? 'Creating...' : 'Create Listing'}</button>
            <button type="button" onClick={() => navigate(-1)} className="btn-outline px-6 py-3">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}
