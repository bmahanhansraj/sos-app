import { useEffect, useState } from 'react';
import { api, apiErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import BeaconBadge from '../components/BeaconBadge';

export default function Partners() {
  const { isSuperAdmin } = useAuth();
  const [partners, setPartners] = useState([]);
  const [cities, setCities] = useState([]);
  const [agencies, setAgencies] = useState([]);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [fleetFilter, setFleetFilter] = useState('');
  const [rejecting, setRejecting] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [busyId, setBusyId] = useState(null);

  const [editing, setEditing] = useState(null); // partner being edited
  const [editForm, setEditForm] = useState({ vehicleType: '', vehicleRegNumber: '', cityId: '', agencyId: '' });
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      const [p, c, a] = await Promise.all([
        api.get('/admin/partners'),
        api.get('/catalog/cities'),
        api.get('/admin/agencies'),
      ]);
      setPartners(p.data.partners);
      setCities(c.data.cities);
      setAgencies(a.data.agencies);
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  useEffect(() => { load(); }, []);

  const agencyNameById = Object.fromEntries(agencies.map((a) => [a.id, a.name]));

  const pending = partners.filter((p) => p.kycStatus === 'PENDING_REVIEW');
  const others = partners
    .filter((p) => p.kycStatus !== 'PENDING_REVIEW')
    .filter((p) => {
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return (p.user?.name || '').toLowerCase().includes(q) || (p.user?.phone || '').includes(q);
    })
    .filter((p) => {
      if (!fleetFilter) return true;
      if (fleetFilter === 'INDEPENDENT') return !p.agencyId;
      return p.agencyId === fleetFilter;
    });

  async function approve(id) {
    setBusyId(id);
    try {
      await api.post(`/admin/partners/${id}/approve`);
      await load();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  async function reject(id) {
    if (!rejectReason.trim()) return;
    setBusyId(id);
    try {
      await api.post(`/admin/partners/${id}/reject`, { reason: rejectReason.trim() });
      setRejecting(null);
      setRejectReason('');
      await load();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  function openEdit(p) {
    setEditing(p);
    setEditForm({
      vehicleType: p.vehicleType || '',
      vehicleRegNumber: p.vehicleRegNumber || '',
      cityId: p.cityId || '',
      agencyId: p.agencyId || '',
    });
  }

  async function saveEdit() {
    if (!editing) return;
    setSaving(true);
    try {
      await api.patch(`/admin/partners/${editing.id}`, {
        vehicleType: editForm.vehicleType,
        vehicleRegNumber: editForm.vehicleRegNumber || null,
        cityId: editForm.cityId || null,
        agencyId: editForm.agencyId || null,
      });
      setEditing(null);
      await load();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function toggleSuspend(p) {
    setBusyId(p.id);
    try {
      const nextStatus = p.user?.status === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED';
      await api.patch(`/admin/users/${p.userId}`, { status: nextStatus });
      await load();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-semibold">Partners</h1>
        <p className="mt-1 text-sm text-muted">KYC approvals, the live partner directory, and partner profile edits.</p>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <section>
        <div className="mb-3 flex items-center gap-2">
          <h2 className="text-sm font-medium text-ink">KYC approval queue</h2>
          {pending.length > 0 && (
            <span className="rounded-full bg-beacon/15 px-2 py-0.5 text-xs font-medium text-beacon">{pending.length}</span>
          )}
        </div>
        {pending.length === 0 ? (
          <p className="panel p-5 text-sm text-muted">No partners are waiting on review.</p>
        ) : (
          <div className="space-y-3">
            {pending.map((p) => (
              <div key={p.id} className="panel flex items-center justify-between gap-4 p-4">
                <div className="min-w-0">
                  <p className="font-medium">{p.user?.name || 'Unnamed partner'}</p>
                  <p className="font-mono text-xs text-muted">{p.user?.phone}</p>
                  <p className="mt-1 text-xs text-muted">{p.vehicleType.replaceAll('_', ' ')} &middot; DL {p.drivingLicenseNumber || '—'}</p>
                </div>
                {!isSuperAdmin ? (
                  <span className="text-xs text-muted">Awaiting admin review</span>
                ) : rejecting === p.id ? (
                  <div className="flex items-center gap-2">
                    <input
                      autoFocus
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Reason for rejection"
                      className="w-48 rounded-lg border border-hairline bg-panel-raised px-2.5 py-1.5 text-sm outline-none focus:border-live"
                    />
                    <button onClick={() => reject(p.id)} disabled={busyId === p.id} className="rounded-lg bg-danger px-3 py-1.5 text-sm font-medium text-ink disabled:opacity-50">
                      Confirm
                    </button>
                    <button onClick={() => { setRejecting(null); setRejectReason(''); }} className="text-sm text-muted hover:text-ink">
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-shrink-0 items-center gap-2">
                    <button onClick={() => approve(p.id)} disabled={busyId === p.id} className="rounded-lg bg-ok px-3 py-1.5 text-sm font-medium text-void disabled:opacity-50">
                      Approve
                    </button>
                    <button onClick={() => setRejecting(p.id)} className="rounded-lg border border-hairline px-3 py-1.5 text-sm text-muted hover:text-ink">
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium text-ink">Partner directory</h2>
          <div className="flex items-center gap-2">
            <select
              value={fleetFilter}
              onChange={(e) => setFleetFilter(e.target.value)}
              className="rounded-lg border border-hairline bg-panel-raised px-2.5 py-1.5 text-sm outline-none focus:border-live"
            >
              <option value="">All fleets</option>
              <option value="INDEPENDENT">Independent (no fleet)</option>
              {agencies.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or phone"
              className="w-56 rounded-lg border border-hairline bg-panel-raised px-2.5 py-1.5 text-sm outline-none focus:border-live"
            />
          </div>
        </div>
        <div className="panel overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-hairline text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3">Partner</th>
                <th className="px-4 py-3">Vehicle</th>
                <th className="px-4 py-3">Fleet</th>
                <th className="px-4 py-3">KYC</th>
                <th className="px-4 py-3">Account</th>
                <th className="px-4 py-3">Online</th>
                <th className="px-4 py-3">Rating</th>
                <th className="px-4 py-3">Jobs</th>
                <th className="px-4 py-3">Earnings</th>
                {isSuperAdmin && <th className="px-4 py-3"></th>}
              </tr>
            </thead>
            <tbody>
              {others.map((p) => (
                <tr key={p.id} className="border-b border-hairline last:border-0 hover:bg-panel-raised">
                  <td className="px-4 py-3">
                    <p>{p.user?.name || 'Unnamed'}</p>
                    <p className="font-mono text-xs text-muted">{p.user?.phone}</p>
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {p.vehicleType.replaceAll('_', ' ')}
                    {p.vehicleRegNumber && <span className="ml-1 font-mono text-xs">({p.vehicleRegNumber})</span>}
                  </td>
                  <td className="px-4 py-3">
                    {p.agencyId ? (
                      <span className="rounded-full bg-beacon/15 px-2 py-0.5 text-xs font-medium text-beacon">{agencyNameById[p.agencyId] || 'Fleet'}</span>
                    ) : (
                      <span className="text-xs text-muted">Independent</span>
                    )}
                  </td>
                  <td className="px-4 py-3"><BeaconBadge status={p.kycStatus} /></td>
                  <td className="px-4 py-3"><BeaconBadge status={p.user?.status || 'ACTIVE'} /></td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1.5 text-xs">
                      <span className={`beacon-dot ${p.isOnline ? 'bg-ok is-live' : 'bg-muted'}`} />
                      {p.isOnline ? (p.isAvailable ? 'Available' : 'On a job') : 'Offline'}
                    </span>
                  </td>
                  <td className="px-4 py-3">{p.avgRating ? `${p.avgRating.toFixed(1)} (${p.totalRatings})` : '—'}</td>
                  <td className="px-4 py-3">{p.totalJobs}</td>
                  <td className="px-4 py-3 font-mono text-xs">₹{p.totalEarnings.toLocaleString('en-IN')}</td>
                  {isSuperAdmin && (
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEdit(p)} className="rounded-lg border border-hairline px-2.5 py-1.5 text-xs text-muted hover:text-ink">
                          Edit
                        </button>
                        <button
                          onClick={() => toggleSuspend(p)}
                          disabled={busyId === p.id}
                          className={`rounded-lg border px-2.5 py-1.5 text-xs disabled:opacity-50 ${p.user?.status === 'SUSPENDED' ? 'border-ok/30 text-ok' : 'border-danger/30 text-danger'}`}
                        >
                          {p.user?.status === 'SUSPENDED' ? 'Reactivate' : 'Suspend'}
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {others.length === 0 && (
                <tr><td colSpan={isSuperAdmin ? 10 : 9} className="px-4 py-8 text-center text-sm text-muted">No partners match.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {editing && (
        <div className="fixed inset-0 z-20 flex justify-end bg-black/50" onClick={() => setEditing(null)}>
          <div className="h-full w-full max-w-md overflow-y-auto bg-panel p-6" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4">
              <p className="text-xs text-muted">Edit partner</p>
              <h2 className="mt-1 font-display text-lg font-semibold">{editing.user?.name || 'Unnamed partner'}</h2>
              <p className="font-mono text-xs text-muted">{editing.user?.phone}</p>
            </div>

            <div className="space-y-4 text-sm">
              <div>
                <label className="mb-1 block text-xs text-muted">Vehicle type</label>
                <input
                  value={editForm.vehicleType}
                  onChange={(e) => setEditForm({ ...editForm, vehicleType: e.target.value })}
                  className="w-full rounded-lg border border-hairline bg-panel-raised px-2.5 py-2 text-sm outline-none focus:border-live"
                  placeholder="e.g. TWO_WHEELER, FOUR_WHEELER, FLATBED_TRUCK"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted">Vehicle registration number</label>
                <input
                  value={editForm.vehicleRegNumber}
                  onChange={(e) => setEditForm({ ...editForm, vehicleRegNumber: e.target.value })}
                  className="w-full rounded-lg border border-hairline bg-panel-raised px-2.5 py-2 text-sm outline-none focus:border-live"
                  placeholder="DL01AB1234"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted">City</label>
                <select
                  value={editForm.cityId}
                  onChange={(e) => setEditForm({ ...editForm, cityId: e.target.value })}
                  className="w-full rounded-lg border border-hairline bg-panel-raised px-2.5 py-2 text-sm outline-none focus:border-live"
                >
                  <option value="">Unassigned</option>
                  {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted">Fleet / agency</label>
                <select
                  value={editForm.agencyId}
                  onChange={(e) => setEditForm({ ...editForm, agencyId: e.target.value })}
                  className="w-full rounded-lg border border-hairline bg-panel-raised px-2.5 py-2 text-sm outline-none focus:border-live"
                >
                  <option value="">Independent (no fleet)</option>
                  {agencies.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
            </div>

            <div className="mt-6 flex gap-2">
              <button onClick={saveEdit} disabled={saving} className="flex-1 rounded-lg bg-beacon px-3 py-2 text-sm font-medium text-void disabled:opacity-50">
                {saving ? 'Saving...' : 'Save changes'}
              </button>
              <button onClick={() => setEditing(null)} className="rounded-lg border border-hairline px-3 py-2 text-sm text-muted hover:text-ink">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
