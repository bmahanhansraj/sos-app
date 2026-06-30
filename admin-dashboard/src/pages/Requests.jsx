import { useEffect, useMemo, useState } from 'react';
import { api, apiErrorMessage } from '../api/client';
import BeaconBadge from '../components/BeaconBadge';
import { useSocket } from '../context/SocketContext';

const STATUS_OPTIONS = [
  'REQUESTED', 'ASSIGNED', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS',
  'COMPLETED', 'CANCELLED', 'NO_PARTNER_FOUND',
];

export default function Requests() {
  const [requests, setRequests] = useState([]);
  const [serviceTypes, setServiceTypes] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [partners, setPartners] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [sosOnly, setSosOnly] = useState(false);
  const [selected, setSelected] = useState(null);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState('');
  const [assignPartnerId, setAssignPartnerId] = useState('');
  const [assigning, setAssigning] = useState(false);
  const { socket } = useSocket();

  const serviceTypeMap = useMemo(() => Object.fromEntries(serviceTypes.map((s) => [s.id, s.name])), [serviceTypes]);
  const customerMap = useMemo(() => Object.fromEntries(customers.map((c) => [c.id, c.user?.name || c.user?.phone || 'Customer'])), [customers]);
  const partnerMap = useMemo(() => Object.fromEntries(partners.map((p) => [p.id, p.user?.name || p.user?.phone || 'Partner'])), [partners]);
  const approvedPartners = useMemo(() => partners.filter((p) => p.kycStatus === 'APPROVED'), [partners]);

  async function loadRequests() {
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (sosOnly) params.isSos = 'true';
      const { data } = await api.get('/admin/requests', { params });
      setRequests(data.requests.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  async function loadLookups() {
    try {
      const [st, cu, pa] = await Promise.all([
        api.get('/catalog/services'),
        api.get('/admin/customers'),
        api.get('/admin/partners'),
      ]);
      setServiceTypes(st.data.serviceTypes);
      setCustomers(cu.data.customers);
      setPartners(pa.data.partners);
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  useEffect(() => { loadLookups(); }, []);
  useEffect(() => { loadRequests(); }, [statusFilter, sosOnly]);

  useEffect(() => {
    if (!socket) return;
    socket.on('request:status', loadRequests);
    return () => socket.off('request:status', loadRequests);
  }, [socket, statusFilter, sosOnly]);

  async function openDetail(req) {
    setSelected(req);
    setAssignPartnerId('');
    try {
      const { data } = await api.get(`/requests/${req.id}`);
      setSelected(data.request);
      setHistory(data.history);
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  async function handleAssign() {
    if (!assignPartnerId || !selected) return;
    setAssigning(true);
    try {
      const { data } = await api.post(`/admin/requests/${selected.id}/assign`, { partnerId: assignPartnerId });
      setSelected(data.request);
      loadRequests();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setAssigning(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold">Requests</h1>
          <p className="mt-1 text-sm text-muted">All service requests across the network.</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-hairline bg-panel-raised px-3 py-2 text-sm text-ink outline-none focus:border-live"
          >
            <option value="">All statuses</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s.replaceAll('_', ' ')}</option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-sm text-muted">
            <input type="checkbox" checked={sosOnly} onChange={(e) => setSosOnly(e.target.checked)} className="accent-danger" />
            SOS only
          </label>
        </div>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="panel overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-hairline text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3">Request</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Service</th>
              <th className="px-4 py-3">Partner</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Created</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((r) => (
              <tr
                key={r.id}
                onClick={() => openDetail(r)}
                className="cursor-pointer border-b border-hairline last:border-0 hover:bg-panel-raised"
              >
                <td className="px-4 py-3 font-mono text-xs">
                  {r.requestNumber}
                  {r.isSos && <span className="ml-2 rounded bg-danger/15 px-1.5 py-0.5 text-[10px] font-medium text-danger">SOS</span>}
                </td>
                <td className="px-4 py-3">{customerMap[r.customerId] || '—'}</td>
                <td className="px-4 py-3">{serviceTypeMap[r.serviceTypeId] || '—'}</td>
                <td className="px-4 py-3">{r.assignedPartnerId ? partnerMap[r.assignedPartnerId] || '—' : '—'}</td>
                <td className="px-4 py-3"><BeaconBadge status={r.status} /></td>
                <td className="px-4 py-3 font-mono text-xs">₹{(r.finalPrice ?? r.estimatedPrice).toFixed(0)}</td>
                <td className="px-4 py-3 text-xs text-muted">{new Date(r.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</td>
              </tr>
            ))}
            {requests.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-muted">No requests match these filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="fixed inset-0 z-20 flex justify-end bg-black/50" onClick={() => setSelected(null)}>
          <div className="h-full w-full max-w-md overflow-y-auto bg-panel p-6" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-start justify-between">
              <div>
                <p className="font-mono text-xs text-muted">{selected.requestNumber}</p>
                <h2 className="mt-1 font-display text-lg font-semibold">{serviceTypeMap[selected.serviceTypeId] || 'Service'}</h2>
              </div>
              <BeaconBadge status={selected.status} />
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <p className="text-xs text-muted">Pickup</p>
                <p>{selected.pickupAddress || `${selected.pickupLat.toFixed(4)}, ${selected.pickupLng.toFixed(4)}`}</p>
              </div>
              <div className="flex gap-6">
                <div>
                  <p className="text-xs text-muted">Customer</p>
                  <p>{customerMap[selected.customerId] || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted">Partner</p>
                  <p>{selected.assignedPartnerId ? partnerMap[selected.assignedPartnerId] || '—' : 'Unassigned'}</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted">Price</p>
                <p className="font-mono">₹{(selected.finalPrice ?? selected.estimatedPrice).toFixed(2)}</p>
              </div>
            </div>

            {!['COMPLETED', 'CANCELLED'].includes(selected.status) && (
              <div className="mt-5 border-t border-hairline pt-4">
                <p className="mb-2 text-xs uppercase tracking-wide text-muted">Manual assign / reassign</p>
                <div className="flex gap-2">
                  <select
                    value={assignPartnerId}
                    onChange={(e) => setAssignPartnerId(e.target.value)}
                    className="flex-1 rounded-lg border border-hairline bg-panel-raised px-2.5 py-2 text-sm outline-none focus:border-live"
                  >
                    <option value="">Choose a partner...</option>
                    {approvedPartners.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.user?.name || p.user?.phone} {p.isOnline ? '(online)' : '(offline)'}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleAssign}
                    disabled={!assignPartnerId || assigning}
                    className="rounded-lg bg-beacon px-3 py-2 text-sm font-medium text-void disabled:opacity-50"
                  >
                    {assigning ? 'Assigning...' : 'Assign'}
                  </button>
                </div>
                <p className="mt-1.5 text-xs text-muted">Overrides the automatic nearest-partner dispatch.</p>
              </div>
            )}

            <div className="mt-5 border-t border-hairline pt-4">
              <p className="mb-2 text-xs uppercase tracking-wide text-muted">Status history</p>
              <ul className="space-y-2">
                {history.map((h) => (
                  <li key={h.id} className="flex items-center justify-between text-xs">
                    <BeaconBadge status={h.status} />
                    <span className="text-muted">{new Date(h.changedAt).toLocaleTimeString('en-IN')}</span>
                  </li>
                ))}
              </ul>
            </div>

            <button onClick={() => setSelected(null)} className="mt-6 w-full rounded-lg border border-hairline py-2 text-sm text-muted hover:text-ink">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
