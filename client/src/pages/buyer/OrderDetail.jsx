import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '../../components/shared/Navbar';
import { ordersAPI, paymentsAPI } from '../../services/api';
import StatusBadge from '../../components/shared/StatusBadge';
import toast from 'react-hot-toast';

const STEPS = [
  { key: 'AWAITING_PAYMENT', label: 'Awaiting Payment' },
  { key: 'PAYMENT_ESCROWED', label: 'Payment Escrowed' },
  { key: 'IN_TRANSIT', label: 'In Transit' },
  { key: 'COMPLETED', label: 'Completed' },
];

export default function BuyerOrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initiating, setInitiating] = useState(false);
  const [disputing, setDisputing] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');

  const reload = () => ordersAPI.getById(id).then(({ data }) => setOrder(data));

  useEffect(() => {
    reload().catch(() => navigate(-1)).finally(() => setLoading(false));
  }, [id]);

  const handleInitiateEscrow = async () => {
    setInitiating(true);
    // Open a blank window SYNCHRONOUSLY before any await — this is the only way to avoid
    // popup blockers, which reject window.open() calls from async contexts.
    const popup = window.open('', '_blank', 'noopener,noreferrer');
    try {
      const { data } = await paymentsAPI.initiate(order.id);
      toast.success('Escrow transaction created! Opening payment page…');
      // Update local state with payment URL so button renders immediately
      setOrder((prev) => ({ ...prev, escrow_payment_url: data.payment_url }));
      if (popup) {
        popup.location.href = data.payment_url;
      } else {
        // Fallback if popup was blocked despite our synchronous open
        window.open(data.payment_url, '_blank', 'noopener,noreferrer');
      }
    } catch (err) {
      if (popup) popup.close();
      toast.error(err.response?.data?.message || 'Failed to initiate payment');
    } finally {
      setInitiating(false);
    }
  };

  const handleOpenEscrow = () => {
    if (order.escrow_payment_url) {
      window.open(order.escrow_payment_url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleConfirmDelivery = async () => {
    if (!confirm('Confirm delivery and release payment to supplier?')) return;
    try {
      await ordersAPI.confirmDelivery(id);
      toast.success('Delivery confirmed! Payment released to supplier.');
      reload();
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
      reload();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setDisputing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }
  if (!order) return null;

  const currentStep = STEPS.findIndex((s) => s.key === order.status);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex justify-between items-start mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Order #{order.id}</h1>
          <StatusBadge status={order.status} />
        </div>

        {/* Escrow Progress Timeline */}
        <div className="card mb-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Escrow Progress</h2>
          <div className="flex justify-between relative">
            <div className="absolute top-4 left-0 right-0 h-0.5 bg-gray-200 z-0" />
            {STEPS.map((step, i) => (
              <div key={step.key} className="flex flex-col items-center z-10">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                  i < currentStep ? 'bg-green-500 text-white' :
                  i === currentStep ? 'bg-primary text-white ring-4 ring-primary/20' :
                  'bg-gray-200 text-gray-400'
                }`}>
                  {i < currentStep ? '✓' : i + 1}
                </div>
                <p className={`text-xs mt-2 text-center w-20 ${
                  i <= currentStep ? 'text-primary font-medium' : 'text-gray-400'
                }`}>
                  {step.label}
                </p>
              </div>
            ))}
          </div>

          {order.escrow_transaction_id && (
            <p className="text-xs text-gray-400 mt-4 text-center">
              Escrow Transaction ID: <span className="font-mono">{order.escrow_transaction_id}</span>
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Order Details */}
          <div className="card">
            <h2 className="font-bold text-gray-800 mb-3">Order Details</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Supplier</span><span>{order.supplier?.name}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Biomass</span><span className="capitalize">{order.listing?.biomass_type?.replace(/_/g, ' ')}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Quantity</span><span>{order.quantity}t</span></div>
              <div className="flex justify-between">
                <span className="text-gray-500">Total</span>
                <span className="font-bold text-primary">₹{(order.total_amount / 100).toLocaleString('en-IN')}</span>
              </div>
              {order.vehicle_number && (
                <>
                  <hr />
                  <div className="flex justify-between"><span className="text-gray-500">Vehicle</span><span>{order.vehicle_number}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Driver</span><span>{order.driver_contact}</span></div>
                  {order.estimated_delivery && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">ETA</span>
                      <span>{new Date(order.estimated_delivery).toLocaleDateString()}</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Action Panel */}
          <div className="space-y-4">
            {/* Step 1: Initiate Escrow */}
            {order.status === 'AWAITING_PAYMENT' && !order.escrow_payment_url && (
              <div className="card bg-yellow-50 border border-yellow-200">
                <p className="font-semibold text-yellow-800 mb-1">Payment Required</p>
                <p className="text-sm text-yellow-700 mb-4">
                  Funds are held securely by Escrow.com and released to the supplier only after you confirm delivery.
                </p>
                <button onClick={handleInitiateEscrow} disabled={initiating} className="btn-accent w-full">
                  {initiating ? 'Creating escrow…' : `🔒 Initiate Escrow — ₹${(order.total_amount / 100).toLocaleString('en-IN')}`}
                </button>
              </div>
            )}

            {/* Step 1b: Escrow created, buyer needs to fund it */}
            {order.status === 'AWAITING_PAYMENT' && order.escrow_payment_url && (
              <div className="card bg-yellow-50 border border-yellow-200">
                <p className="font-semibold text-yellow-800 mb-1">Complete Your Payment</p>
                <p className="text-sm text-yellow-700 mb-4">
                  Your escrow transaction is ready. Click below to fund it on Escrow.com.
                  Once funded, we will be notified automatically.
                </p>
                <button onClick={handleOpenEscrow} className="btn-accent w-full mb-2">
                  💳 Pay on Escrow.com
                </button>
                <p className="text-xs text-yellow-600 text-center">Opens Escrow.com in a new tab</p>
              </div>
            )}

            {/* Step 2: Payment escrowed — waiting for dispatch */}
            {order.status === 'PAYMENT_ESCROWED' && (
              <div className="card bg-blue-50 border border-blue-200">
                <p className="font-semibold text-blue-800 mb-1">Payment Secured in Escrow</p>
                <p className="text-sm text-blue-600">
                  Your ₹{(order.total_amount / 100).toLocaleString('en-IN')} is held safely by Escrow.com.
                  Funds will be released to the supplier after you confirm delivery.
                </p>
                {order.escrow_payment_url && (
                  <button onClick={handleOpenEscrow} className="mt-3 text-sm text-blue-700 underline">
                    View on Escrow.com
                  </button>
                )}
              </div>
            )}

            {/* Step 3: In transit — confirm or dispute */}
            {order.status === 'IN_TRANSIT' && (
              <div className="card">
                <p className="font-semibold text-gray-800 mb-3">Order In Transit</p>
                <button onClick={handleConfirmDelivery} className="btn-primary w-full mb-3">
                  Confirm Delivery & Release Payment
                </button>
                <details>
                  <summary className="text-sm text-red-600 cursor-pointer hover:underline">
                    Raise a dispute instead
                  </summary>
                  <form onSubmit={handleDispute} className="mt-3 space-y-2">
                    <textarea
                      className="input h-24 resize-none"
                      value={disputeReason}
                      onChange={(e) => setDisputeReason(e.target.value)}
                      placeholder="Describe the issue with the delivery…"
                      required
                    />
                    <button
                      type="submit"
                      disabled={disputing}
                      className="text-sm border border-red-300 text-red-600 px-4 py-2 rounded-lg w-full hover:bg-red-50"
                    >
                      {disputing ? 'Raising…' : 'Raise Dispute'}
                    </button>
                  </form>
                </details>
              </div>
            )}

            {order.status === 'DISPUTED' && (
              <div className="card bg-red-50 border border-red-200">
                <p className="font-semibold text-red-800">Dispute Under Review</p>
                <p className="text-sm text-red-600 mt-1">
                  Admin and Escrow.com will resolve this within 48 hours.
                </p>
                {order.dispute?.resolution && (
                  <p className="text-sm text-gray-700 mt-2 bg-white p-2 rounded">
                    {order.dispute.resolution}
                  </p>
                )}
              </div>
            )}

            {order.status === 'COMPLETED' && (
              <div className="card bg-green-50 border border-green-200">
                <p className="font-semibold text-green-800">Order Completed</p>
                <p className="text-sm text-green-600 mt-1">Payment has been released to the supplier.</p>
              </div>
            )}

            {order.status === 'REFUNDED' && (
              <div className="card bg-gray-50 border border-gray-200">
                <p className="font-semibold text-gray-800">Order Refunded</p>
                <p className="text-sm text-gray-600 mt-1">Payment has been returned to you via Escrow.com.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
