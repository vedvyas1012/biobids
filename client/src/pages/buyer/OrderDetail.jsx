import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '../../components/shared/Navbar';
import { ordersAPI, paymentsAPI } from '../../services/api';
import StatusBadge from '../../components/shared/StatusBadge';
import toast from 'react-hot-toast';

export default function BuyerOrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [disputing, setDisputing] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');

  useEffect(() => {
    ordersAPI.getById(id).then(({ data }) => setOrder(data)).catch(() => navigate(-1)).finally(() => setLoading(false));
  }, [id]);

  const handlePayment = async () => {
    setPaying(true);
    try {
      const { data } = await paymentsAPI.createOrder({ order_id: order.id });

      // Load Razorpay checkout
      const rzp = new window.Razorpay({
        key: data.key_id,
        amount: data.amount,
        currency: data.currency,
        name: 'BioBids',
        description: `Order #${order.id} — Biomass Payment`,
        order_id: data.razorpay_order_id,
        handler: async (response) => {
          await paymentsAPI.verify({
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          });
          toast.success('Payment successful! Funds secured in escrow.');
          ordersAPI.getById(id).then(({ data }) => setOrder(data));
        },
        theme: { color: '#2d6a4f' },
      });
      rzp.open();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Payment failed');
    } finally { setPaying(false); }
  };

  const handleConfirmDelivery = async () => {
    if (!confirm('Confirm delivery and release payment to supplier?')) return;
    try {
      await ordersAPI.confirmDelivery(id);
      toast.success('Delivery confirmed! Payment released to supplier.');
      ordersAPI.getById(id).then(({ data }) => setOrder(data));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const handleDispute = async (e) => {
    e.preventDefault();
    setDisputing(true);
    try {
      const fd = new FormData();
      fd.append('reason', disputeReason);
      await ordersAPI.dispute(id, fd);
      toast.success('Dispute raised. Admin will review within 48 hours.');
      ordersAPI.getById(id).then(({ data }) => setOrder(data));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setDisputing(false); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" /></div>;
  if (!order) return null;

  const steps = ['AWAITING_PAYMENT', 'PAYMENT_ESCROWED', 'IN_TRANSIT', 'DELIVERED', 'COMPLETED'];
  const currentStep = steps.indexOf(order.status);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      {/* Load Razorpay script */}
      <script src="https://checkout.razorpay.com/v1/checkout.js" async />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex justify-between items-start mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Order #{order.id}</h1>
          <StatusBadge status={order.status} />
        </div>

        {/* Timeline */}
        <div className="card mb-6">
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
              <div className="flex justify-between"><span className="text-gray-500">Supplier</span><span>{order.supplier?.name}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Biomass</span><span className="capitalize">{order.listing?.biomass_type?.replace(/_/g, ' ')}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Quantity</span><span>{order.quantity}t</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Total</span><span className="font-bold text-primary">₹{(order.total_amount / 100).toLocaleString('en-IN')}</span></div>
              {order.vehicle_number && (
                <>
                  <hr />
                  <div className="flex justify-between"><span className="text-gray-500">Vehicle</span><span>{order.vehicle_number}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Driver</span><span>{order.driver_contact}</span></div>
                  {order.estimated_delivery && <div className="flex justify-between"><span className="text-gray-500">ETA</span><span>{new Date(order.estimated_delivery).toLocaleDateString()}</span></div>}
                </>
              )}
            </div>
          </div>

          <div className="space-y-4">
            {/* Pay Now */}
            {order.status === 'AWAITING_PAYMENT' && (
              <div className="card bg-yellow-50 border border-yellow-200">
                <p className="font-semibold text-yellow-800 mb-2">Payment Required</p>
                <p className="text-sm text-yellow-700 mb-4">Complete payment to secure your biomass. Funds go into escrow until delivery.</p>
                <button onClick={handlePayment} disabled={paying} className="btn-accent w-full">
                  {paying ? 'Processing...' : `💳 Pay ₹${(order.total_amount / 100).toLocaleString('en-IN')}`}
                </button>
              </div>
            )}

            {/* Escrow Notice */}
            {order.status === 'PAYMENT_ESCROWED' && (
              <div className="card bg-blue-50 border border-blue-200">
                <p className="font-semibold text-blue-800">Payment in Escrow ✓</p>
                <p className="text-sm text-blue-600 mt-1">Waiting for supplier to dispatch.</p>
              </div>
            )}

            {/* Confirm Delivery or Dispute */}
            {order.status === 'IN_TRANSIT' && (
              <div className="card">
                <p className="font-semibold text-gray-800 mb-3">Order In Transit 🚚</p>
                <button onClick={handleConfirmDelivery} className="btn-primary w-full mb-3">✅ Confirm Delivery & Release Payment</button>
                <details>
                  <summary className="text-sm text-red-600 cursor-pointer hover:underline">Raise a dispute instead</summary>
                  <form onSubmit={handleDispute} className="mt-3 space-y-2">
                    <textarea className="input h-24 resize-none" value={disputeReason} onChange={(e) => setDisputeReason(e.target.value)} placeholder="Describe the issue..." required />
                    <button type="submit" disabled={disputing} className="text-sm border border-red-300 text-red-600 px-4 py-2 rounded-lg w-full hover:bg-red-50">
                      {disputing ? 'Raising...' : 'Raise Dispute'}
                    </button>
                  </form>
                </details>
              </div>
            )}

            {order.status === 'DISPUTED' && (
              <div className="card bg-red-50 border border-red-200">
                <p className="font-semibold text-red-800">Dispute Under Review</p>
                <p className="text-sm text-red-600 mt-1">Admin will resolve within 48 hours.</p>
                {order.dispute?.resolution && <p className="text-sm text-gray-700 mt-2 bg-white p-2 rounded">{order.dispute.resolution}</p>}
              </div>
            )}

            {order.status === 'COMPLETED' && (
              <div className="card bg-green-50 border border-green-200">
                <p className="font-semibold text-green-800">Order Completed ✅</p>
                <p className="text-sm text-green-600 mt-1">Payment released to supplier.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
