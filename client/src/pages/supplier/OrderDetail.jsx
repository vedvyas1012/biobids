import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '../../components/shared/Navbar';
import { ordersAPI } from '../../services/api';
import StatusBadge from '../../components/shared/StatusBadge';
import toast from 'react-hot-toast';

export default function SupplierOrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dispatching, setDispatching] = useState(false);
  const [dispatchForm, setDispatchForm] = useState({ vehicle_number: '', driver_contact: '', estimated_delivery: '' });
  const [proof, setProof] = useState(null);

  useEffect(() => {
    ordersAPI.getById(id).then(({ data }) => setOrder(data)).catch(() => navigate(-1)).finally(() => setLoading(false));
  }, [id]);

  const handleDispatch = async (e) => {
    e.preventDefault();
    setDispatching(true);
    try {
      const fd = new FormData();
      Object.entries(dispatchForm).forEach(([k, v]) => fd.append(k, v));
      if (proof) fd.append('proof', proof);
      await ordersAPI.dispatch(id, fd);
      toast.success('Order marked as dispatched!');
      ordersAPI.getById(id).then(({ data }) => setOrder(data));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setDispatching(false); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" /></div>;
  if (!order) return null;

  const steps = ['AWAITING_PAYMENT', 'PAYMENT_ESCROWED', 'IN_TRANSIT', 'DELIVERED', 'COMPLETED'];
  const currentStep = steps.indexOf(order.status);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex justify-between items-start mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Order #{order.id}</h1>
          <StatusBadge status={order.status} />
        </div>

        {/* Order Timeline */}
        <div className="card mb-6">
          <h2 className="font-bold text-gray-800 mb-4">Order Progress</h2>
          <div className="flex justify-between relative">
            <div className="absolute top-4 left-0 right-0 h-0.5 bg-gray-200 z-0" />
            {steps.map((s, i) => (
              <div key={s} className="flex flex-col items-center z-10">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${i <= currentStep ? 'bg-primary text-white' : 'bg-gray-200 text-gray-400'}`}>{i + 1}</div>
                <p className={`text-xs mt-2 text-center w-20 ${i <= currentStep ? 'text-primary font-medium' : 'text-gray-400'}`}>{s.replace(/_/g, ' ')}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="card">
            <h2 className="font-bold text-gray-800 mb-3">Order Details</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Buyer</span><span className="font-medium">{order.buyer?.name}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Quantity</span><span className="font-medium">{order.quantity} tonnes</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Total Amount</span><span className="font-bold text-primary">₹{(order.total_amount / 100).toLocaleString('en-IN')}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Biomass</span><span className="font-medium capitalize">{order.listing?.biomass_type?.replace(/_/g, ' ')}</span></div>
              {order.dispatch_date && <div className="flex justify-between"><span className="text-gray-500">Dispatched</span><span>{new Date(order.dispatch_date).toLocaleDateString()}</span></div>}
              {order.vehicle_number && <div className="flex justify-between"><span className="text-gray-500">Vehicle</span><span>{order.vehicle_number}</span></div>}
            </div>
          </div>

          {/* Dispatch Form */}
          {order.status === 'PAYMENT_ESCROWED' && (
            <div className="card">
              <h2 className="font-bold text-gray-800 mb-3">Mark as Dispatched</h2>
              <form onSubmit={handleDispatch} className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">Vehicle Number *</label>
                  <input className="input mt-1" value={dispatchForm.vehicle_number} onChange={(e) => setDispatchForm({ ...dispatchForm, vehicle_number: e.target.value })} required placeholder="MP09AB1234" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Driver Contact *</label>
                  <input className="input mt-1" value={dispatchForm.driver_contact} onChange={(e) => setDispatchForm({ ...dispatchForm, driver_contact: e.target.value })} required placeholder="9876543210" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Estimated Delivery *</label>
                  <input className="input mt-1" type="date" value={dispatchForm.estimated_delivery} onChange={(e) => setDispatchForm({ ...dispatchForm, estimated_delivery: e.target.value })} required />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Dispatch Proof (optional)</label>
                  <input type="file" accept="image/*,.pdf" onChange={(e) => setProof(e.target.files[0])} className="block w-full text-sm text-gray-600 mt-1 file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:bg-primary-50 file:text-primary" />
                </div>
                <button type="submit" disabled={dispatching} className="btn-primary w-full">{dispatching ? 'Processing...' : '🚚 Mark Dispatched'}</button>
              </form>
            </div>
          )}

          {order.status === 'IN_TRANSIT' && (
            <div className="card bg-blue-50 border border-blue-200">
              <p className="text-blue-800 font-semibold mb-2">Order in Transit</p>
              <p className="text-sm text-blue-600">Payment will be released automatically 7 days after dispatch if buyer doesn't respond, or immediately upon delivery confirmation.</p>
              {order.auto_release_at && <p className="text-xs text-blue-500 mt-2">Auto-release: {new Date(order.auto_release_at).toLocaleDateString()}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
