import { useEffect, useState } from 'react';
import { api, apiErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import BeaconBadge from '../components/BeaconBadge';

export default function Team() {
  const [admins, setAdmins] = useState([]);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newMember, setNewMember] = useState({ name: '', phone: '', role: 'SUPPORT' });

  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', role: 'SUPPORT', status: 'ACTIVE' });
  const [saving, setSaving] = useState(false);

  const { user } = useAuth();

  async function load() {
    try {
      const { data } = await api.get('/admin/admins');
      setAdmins(data.admins);
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  useEffect(() => { load(); }, []);

  async function createMember(e) {
    e.preventDefault();
    setCreating(true);
    setError('');
    try {
      await api.post('/admin/admins', {
        name: newMember.name.trim(),
        phone: newMember.phone.trim(),
        role: newMember.role,
      });
      setNewMember({ name: '', phone: '', role: 'SUPPORT' });
      setShowCreate(false);
      await load();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setCreating(false);
    }
  }

  function openEdit(a) {
    setEditing(a);
    setEditForm({ name: a.name || '', role: a.role, status: a.status });
  }

  async function saveEdit() {
    if (!editing) return;
    setSaving(true);
    try {
      await api.patch(`/admin/admins/${editing.id}`, editForm);
      setEditing(null);
      await load();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">Team</h1>
          <p className="mt-1 text-sm text-muted">
            Full Admins and limited-access Customer Support staff &mdash; enforced on every request the server
            receives, not just hidden in the menu.
          </p>
        </div>
        <button onClick={() => setShowCreate((v) => !v)} className="rounded-lg bg-beacon px-3.5 py-2 text-sm font-medium text-void">
          {showCreate ? 'Cancel' : '+ Add team member'}
        </button>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="panel overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-hairline text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3">Capability</th>
              <th className="px-4 py-3 text-center">Full Admin</th>
              <th className="px-4 py-3 text-center">Customer Support</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['Dashboard analytics & live map', true, true],
              ['View requests, partners, fleets, users', true, true],
              ['Assign / reassign partners on a request', true, true],
              ['View pricing & catalog', true, true],
              ['Send broadcasts (everyone, segment, or specific user)', true, false],
              ['Edit notification triggers (Email/SMS/WhatsApp/Alert per event)', true, false],
              ['Approve / reject partner KYC', true, false],
              ['Edit partner or user accounts (incl. suspend)', true, false],
              ['Create or edit pricing & catalog', true, false],
              ['Add / edit cities & service-area geofences', true, false],
              ['Onboard / edit fleet partners', true, false],
              ['Manage other staff accounts (this page)', true, false],
              ['View audit log', true, false],
            ].map(([label, admin, support]) => (
              <tr key={label} className="border-b border-hairline last:border-0">
                <td className="px-4 py-2.5">{label}</td>
                <td className="px-4 py-2.5 text-center">{admin ? <span className="text-ok">✓</span> : <span className="text-muted">—</span>}</td>
                <td className="px-4 py-2.5 text-center">{support ? <span className="text-ok">✓</span> : <span className="text-muted">—</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showCreate && (
        <form onSubmit={createMember} className="panel grid grid-cols-2 gap-3 p-4 lg:grid-cols-4">
          <input required value={newMember.name} onChange={(e) => setNewMember({ ...newMember, name: e.target.value })} placeholder="Full name" className="rounded-lg border border-hairline bg-panel-raised px-2.5 py-2 text-sm outline-none focus:border-live" />
          <input required value={newMember.phone} onChange={(e) => setNewMember({ ...newMember, phone: e.target.value })} placeholder="+919876543210" className="rounded-lg border border-hairline bg-panel-raised px-2.5 py-2 text-sm outline-none focus:border-live" />
          <select value={newMember.role} onChange={(e) => setNewMember({ ...newMember, role: e.target.value })} className="rounded-lg border border-hairline bg-panel-raised px-2.5 py-2 text-sm outline-none focus:border-live">
            <option value="SUPPORT">Customer Support (limited access)</option>
            <option value="ADMIN">Full Admin</option>
          </select>
          <button type="submit" disabled={creating} className="rounded-lg bg-beacon px-3 py-2 text-sm font-medium text-void disabled:opacity-50">
            {creating ? 'Adding...' : 'Add to team'}
          </button>
        </form>
      )}

      <div className="panel overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-hairline text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Joined</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {admins.map((a) => {
              const isSelf = a.id === user?.id;
              return (
                <tr key={a.id} className="border-b border-hairline last:border-0 hover:bg-panel-raised">
                  <td className="px-4 py-3">{a.name || 'Unnamed'}{isSelf && <span className="ml-2 rounded bg-beacon/15 px-1.5 py-0.5 text-[10px] font-medium text-beacon">You</span>}</td>
                  <td className="px-4 py-3 font-mono text-xs">{a.phone}</td>
                  <td className="px-4 py-3 text-muted">{a.role === 'ADMIN' ? 'Full Admin' : 'Customer Support'}</td>
                  <td className="px-4 py-3"><BeaconBadge status={a.status} /></td>
                  <td className="px-4 py-3 text-xs text-muted">{new Date(a.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</td>
                  <td className="px-4 py-3">
                    {!isSelf && (
                      <button onClick={() => openEdit(a)} className="rounded-lg border border-hairline px-2.5 py-1.5 text-xs text-muted hover:text-ink">
                        Edit
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
            {admins.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-muted">No team members yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 z-20 flex justify-end bg-black/50" onClick={() => setEditing(null)}>
          <div className="h-full w-full max-w-md overflow-y-auto bg-panel p-6" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4">
              <p className="text-xs text-muted">Edit team member</p>
              <h2 className="mt-1 font-display text-lg font-semibold">{editing.name || 'Unnamed'}</h2>
              <p className="font-mono text-xs text-muted">{editing.phone}</p>
            </div>

            <div className="space-y-4 text-sm">
              <div>
                <label className="mb-1 block text-xs text-muted">Name</label>
                <input
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full rounded-lg border border-hairline bg-panel-raised px-2.5 py-2 text-sm outline-none focus:border-live"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted">Role</label>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                  className="w-full rounded-lg border border-hairline bg-panel-raised px-2.5 py-2 text-sm outline-none focus:border-live"
                >
                  <option value="SUPPORT">Customer Support (limited access)</option>
                  <option value="ADMIN">Full Admin</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted">Status</label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  className="w-full rounded-lg border border-hairline bg-panel-raised px-2.5 py-2 text-sm outline-none focus:border-live"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="SUSPENDED">Suspended</option>
                  <option value="BLOCKED">Blocked</option>
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
