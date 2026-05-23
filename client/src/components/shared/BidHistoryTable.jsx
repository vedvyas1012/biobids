import React from 'react';
import { formatDistanceToNow } from 'date-fns';

const STATUS_STYLES = {
  PENDING:  'bg-yellow-100 text-yellow-700',
  ACCEPTED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-600',
  EXPIRED:  'bg-gray-100 text-gray-500',
  WITHDRAWN:'bg-gray-100 text-gray-500',
};

export default function BidHistoryTable({ bids = [] }) {
  if (!bids.length) return null;

  // Sort newest first
  const sorted = [...bids].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  return (
    <div className="card">
      <h2 className="text-lg font-bold text-gray-800 mb-4">Bid History ({bids.length})</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-primary text-white">
              <th className="px-4 py-2.5 text-left font-semibold rounded-tl-lg">#</th>
              <th className="px-4 py-2.5 text-left font-semibold">Bidder</th>
              <th className="px-4 py-2.5 text-left font-semibold">Time</th>
              <th className="px-4 py-2.5 text-left font-semibold">Quantity</th>
              <th className="px-4 py-2.5 text-left font-semibold">Price/tonne</th>
              <th className="px-4 py-2.5 text-left font-semibold">Total Value</th>
              <th className="px-4 py-2.5 text-left font-semibold rounded-tr-lg">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sorted.map((bid, idx) => (
              <tr key={bid.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-gray-500 font-medium">{sorted.length - idx}</td>
                <td className="px-4 py-3 text-gray-600">Bidder #{bid.buyer?.id ? (bid.buyer.id % 100) : (idx + 1)}</td>
                <td className="px-4 py-3 text-gray-500">
                  {formatDistanceToNow(new Date(bid.created_at), { addSuffix: true })}
                </td>
                <td className="px-4 py-3 font-medium">{parseFloat(bid.quantity_requested).toFixed(2)}t</td>
                <td className="px-4 py-3 font-medium">₹{(bid.price_per_tonne / 100).toLocaleString('en-IN')}/t</td>
                <td className="px-4 py-3 font-semibold text-primary">
                  ₹{(bid.total_amount / 100).toLocaleString('en-IN')}
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLES[bid.status] || 'bg-gray-100 text-gray-500'}`}>
                    {bid.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-400 mt-3 text-center">🔒 Bidder identities are kept confidential</p>
    </div>
  );
}
