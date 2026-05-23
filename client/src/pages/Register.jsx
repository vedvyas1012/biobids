import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const STATES = ['Andhra Pradesh','Bihar','Chhattisgarh','Gujarat','Haryana','Jharkhand','Karnataka','Madhya Pradesh','Maharashtra','Odisha','Punjab','Rajasthan','Tamil Nadu','Telangana','Uttar Pradesh','West Bengal'];

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '', email: '', phone: '', password: '', confirmPassword: '',
    role: params.get('role') || 'buyer',
    gst_number: '', location_state: '', location_district: '',
  });

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) { toast.error('Passwords do not match'); return; }
    setLoading(true);
    try {
      const { confirmPassword, ...payload } = form;
      const user = await register(payload);
      toast.success('Account created successfully!');
      if (user.role === 'supplier') navigate('/dashboard/supplier');
      else navigate('/dashboard/buyer');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-dark to-primary flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-lg">
        <div className="text-center mb-6">
          <Link to="/" className="text-4xl">🌿</Link>
          <h1 className="text-2xl font-bold text-gray-800 mt-2">Create Account</h1>
        </div>

        {/* Role Selector */}
        <div className="flex gap-3 mb-6">
          {['buyer', 'supplier'].map((r) => (
            <button key={r} type="button"
              onClick={() => setForm({ ...form, role: r })}
              className={`flex-1 py-2.5 rounded-lg font-semibold border-2 transition-all ${form.role === r ? 'border-primary bg-primary text-white' : 'border-gray-200 text-gray-600 hover:border-primary'}`}>
              {r === 'buyer' ? '🏭 Industrial Buyer' : '🌾 Supplier / Farmer'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input className="input" value={form.name} onChange={set('name')} required placeholder="Ravi Kumar" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input className="input" type="tel" value={form.phone} onChange={set('phone')} placeholder="9876543210" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input className="input" type="email" value={form.email} onChange={set('email')} required placeholder="you@example.com" />
          </div>
          {form.role === 'buyer' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">GST Number</label>
              <input className="input" value={form.gst_number} onChange={set('gst_number')} placeholder="22AAAAA0000A1Z5" />
              <p className="text-xs text-amber-600 mt-1">⚠️ GST number will be verified by admin before you can place bids</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
              <select className="input" value={form.location_state} onChange={set('location_state')} required>
                <option value="">Select state</option>
                {STATES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">District</label>
              <input className="input" value={form.location_district} onChange={set('location_district')} placeholder="District" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input className="input" type="password" value={form.password} onChange={set('password')} required placeholder="Min 8 chars" minLength={8} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
              <input className="input" type="password" value={form.confirmPassword} onChange={set('confirmPassword')} required placeholder="Repeat password" />
            </div>
          </div>
          <button className="btn-primary w-full py-3 text-base mt-2" type="submit" disabled={loading}>
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-600 mt-5">
          Already have an account?{' '}
          <Link to="/login" className="text-primary font-semibold hover:underline">Login</Link>
        </p>
      </div>
    </div>
  );
}
