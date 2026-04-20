import React, { useEffect, useState } from 'react';
import Navbar from '../../components/shared/Navbar';
import { adminAPI } from '../../services/api';
import StatusBadge from '../../components/shared/StatusBadge';
import toast from 'react-hot-toast';

export default function AdminDisputes() {
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState(null);
  const [resolution, setResolution] = useState('');
  const [action, setAction] = useState('release_to_supplier');

  useEffect(() => { fetch(); }, []);

  const fetch = async () => {
    adminAPI.getDisputes().then(({ data }) => setDisputes(data)).finally(() => setLoading(false));
  };

  const handleResolve = async (id) => {
    if (!resolution.trim()) { toast.error('Enter resolution details'); return; }
    try {
      await adminAPI.resolveDispute(id, { resolution, action });
      toast.success('Dispute resolved');
      setResolving(null);
      setResolution('');
      fetch();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Disputes ({disputes.filter(d => d.status === 'OPEN').length} open)</h1>
        {loading ? <div className="card animate-pulse h-40" /> : (
          <div className="space-y-4">
            {disputes.length === 0 ? <div className="card text-center py-12 text-gray-500">No disputes raised</div>
              : disputes.map((d) => (
              <div key={d.id} className="card">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-gray-800">Order #{d.order_id} — {d.raisedBy?.name}</p>
                    <p className="text-sm text-gray-600 mt-1">{d.reason}</p>
                    <p className="text-xs text-gray-400 mt-1">{new Date(d.created_at).toLocaleString()}</p>
                  </div>
                  <StatusBadge status={d.status} />
                </div>

                {d.status === 'OPEN' && (
                  resolving === d.id ? (
                    <div className="mt-4 bg-gray-50 rounded-lg p-4 space-y-3">
                      <div>
                        <label className="text-sm font-medium text-gray-700">Action</label>
                        <select className="input mt-1" value={action} onChange={(e) => setAction(e.target.value)}>
                          <option value="release_to_supplier">Release payment to supplier</option>
                          <option value="refund_buyer">Refund buyer</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Resolution Details</label>
                        <textarea className="input mt-1 h-24 resize-none" value={resolution} onChange={(e) => setResolution(e.target.value)} placeholder="Explain the resolution..." />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleResolve(d.id)} className="btn-primary text-sm">Confirm Resolution</button>
                        <button onClick={() => setResolving(null)} className="btn-outline text-sm">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setResolving(d.id)} className="mt-3 btn-accent text-sm">Resolve Dispute</button>
                  )
                )}

                {d.resolution && (
                  <div className="mt-3 bg-green-50 rounded-lg p-3">
                    <p className="text-xs font-semibold text-green-700">Resolution</p>
                    <p className="text-sm text-green-800 mt-1">{d.resolution}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
