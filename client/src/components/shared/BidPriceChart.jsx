import React from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { formatDistanceToNow } from 'date-fns';

const PRIMARY = '#2d6a4f';
const PRIMARY_DARK = '#1b4332';

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-lg text-xs min-w-[140px]">
      <p className="font-bold text-gray-700 mb-1">Bid #{d.bidNum}</p>
      <p className="text-primary font-bold text-sm">₹{d.price.toLocaleString('en-IN')}/t</p>
      <p className="text-gray-500 mt-0.5">{d.quantity}t &nbsp;·&nbsp; ₹{d.total.toLocaleString('en-IN')} total</p>
      <p className="text-gray-400 mt-1">{d.timeAgo}</p>
      <span className={`inline-block mt-1.5 px-1.5 py-0.5 rounded text-[10px] font-semibold
        ${d.status === 'ACCEPTED' ? 'bg-green-100 text-green-700' :
          d.status === 'REJECTED' ? 'bg-red-100 text-red-600' :
          d.status === 'PENDING'  ? 'bg-yellow-100 text-yellow-700' :
          'bg-gray-100 text-gray-500'}`}>
        {d.status}
      </span>
    </div>
  );
};

export default function BidPriceChart({ bids = [] }) {
  if (!bids.length) return null;

  // Sort oldest → newest for time-series display
  const sorted = [...bids].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  const data = sorted.map((bid, idx) => ({
    bidNum:   idx + 1,
    price:    bid.price_per_tonne / 100,
    total:    bid.total_amount / 100,
    quantity: parseFloat(bid.quantity_requested).toFixed(1),
    timeAgo:  formatDistanceToNow(new Date(bid.created_at), { addSuffix: true }),
    status:   bid.status,
  }));

  const prices   = data.map((d) => d.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const avgPrice = Math.round(prices.reduce((s, p) => s + p, 0) / prices.length);
  const trend    = prices.length > 1 ? prices[prices.length - 1] - prices[0] : 0;

  return (
    <div className="card">
      {/* Header */}
      <div className="flex justify-between items-start mb-1">
        <div>
          <h2 className="text-base font-bold text-gray-800">Bid Price Trend</h2>
          <p className="text-xs text-gray-400 mt-0.5">{bids.length} bid{bids.length !== 1 ? 's' : ''} received</p>
        </div>
        {trend !== 0 && (
          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${trend > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
            {trend > 0 ? '▲' : '▼'} ₹{Math.abs(trend).toLocaleString('en-IN')}
          </span>
        )}
      </div>

      {/* Mini stats */}
      <div className="flex gap-3 mb-4 mt-2">
        <div className="flex-1 bg-gray-50 rounded-lg px-3 py-2 text-center">
          <p className="text-[10px] text-gray-400 uppercase tracking-wide">Lowest</p>
          <p className="text-sm font-bold text-gray-700">₹{minPrice.toLocaleString('en-IN')}</p>
        </div>
        <div className="flex-1 bg-primary-50 rounded-lg px-3 py-2 text-center">
          <p className="text-[10px] text-gray-400 uppercase tracking-wide">Avg</p>
          <p className="text-sm font-bold text-primary">₹{avgPrice.toLocaleString('en-IN')}</p>
        </div>
        <div className="flex-1 bg-gray-50 rounded-lg px-3 py-2 text-center">
          <p className="text-[10px] text-gray-400 uppercase tracking-wide">Highest</p>
          <p className="text-sm font-bold text-gray-700">₹{maxPrice.toLocaleString('en-IN')}</p>
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id="bidGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={PRIMARY} stopOpacity={0.25} />
              <stop offset="95%" stopColor={PRIMARY} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
          <XAxis
            dataKey="bidNum"
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            tickFormatter={(v) => `#${v}`}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: '#9ca3af' }}
            tickFormatter={(v) => `₹${(v / 1000).toFixed(1)}k`}
            domain={['auto', 'auto']}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: PRIMARY, strokeWidth: 1, strokeDasharray: '4 4' }} />
          {/* Average reference line */}
          <ReferenceLine y={avgPrice} stroke={PRIMARY} strokeDasharray="4 4" strokeOpacity={0.4} />
          <Area
            type="monotone"
            dataKey="price"
            stroke={PRIMARY}
            strokeWidth={2.5}
            fill="url(#bidGradient)"
            dot={{ fill: PRIMARY, strokeWidth: 0, r: 4 }}
            activeDot={{ r: 6, fill: PRIMARY_DARK, stroke: '#fff', strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
      <p className="text-[10px] text-gray-300 text-center mt-2">Price per tonne (₹) over time</p>
    </div>
  );
}
