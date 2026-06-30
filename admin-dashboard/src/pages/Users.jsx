import { useEffect, useState } from 'react';
import { api, apiErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import BeaconBadge from '../components/BeaconBadge';

const ROLE_OPTIONS = ['CUSTOMER', 'PARTNER', 'RSA_AGENCY', 'ADMIN', 'SUPPORT'];

export default function Users() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', email: '', status: 'ACTIVE' });
  const [saving, setSaving] = useState(false);
  const { isSuperAdmin } = useAuth();

  async function load() {
    try {
      const params = {};
      if (roleFilter) params.role = roleFilter;
      if (statusFilter) params.status = statusFilter;
      if (search.trim()) params.search = search.trim();
      const { data } = await api.get('/admin/users', { params });
      setUsers(data.users);
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  useEffect(() => { load(); }, [roleFilter, statusFilter]);
  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [search]);

  function openEdit(u) {
    setEditing(u);
    setEditForm({ name: u.name || '', email: u.email || '', status: u.status });
  }

  async function saveEdit() {
    if (!editing) return;
    setSaving(true);
    try {
      await api.patch(`/admin/users/${editing.id}`, {
        name: editForm.name || undefined,
        email: editForm.email || null,
        status: editForm.status,
      });
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
      <div>
        <h1 className="font-display text-2xl font-semibold">Users</h1>
        <p className="mt-1 text-sm text-muted">Every account on the platform &mdash; customers, partners, agencies, and staff.</p>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="flex flex-wrap items-center gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or phone"
          className="w-56 rounded-lg border border-hairline bg-panel-raised px-2.5 py-2 text-sm outline-none focus:border-live"
        />
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="rounded-lg border border-hairline bg-panel-raised px-2.5 py-2 text-sm outline-none focus:border-live">
          <option value="">All roles</option>
          {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r.replaceAll('_', ' ')}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-lg border border-hairline bg-panel-raised px-2.5 py-2 text-sm outline-none focus:border-live">
          <option value="">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="PENDING">Pending</option>
          <option value="SUSPENDED">Suspended</option>
          <option value="BLOCKED">Blocked</option>
        </select>
      </div>

      <div className="panel overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-hairline text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Joined</th>
              {isSuperAdmin && <th className="px-4 py-3"></th>}
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-hairline last:border-0 hover:bg-panel-raised">
                <td className="px-4 py-3">{u.name || 'Unnamed'}</td>
                <td className="px-4 py-3 font-mono text-xs">{u.phone}</td>
                <td className="px-4 py-3 text-muted">{u.role.replaceAll('_', ' ')}</td>
                <td className="px-4 py-3"><BeaconBadge status={u.status} /></td>
                <td className="px-4 py-3 text-xs text-muted">{new Date(u.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</td>
                {isSuperAdmin && (
                  <td className="px-4 py-3">
                    <button onClick={() => openEdit(u)} className="rounded-lg border border-hairline px-2.5 py-1.5 text-xs text-muted hover:text-ink">
                      Edit
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {users.length === 0 && (
              <tr><td colSpan={isSuperAdmin ? 6 : 5} className="px-4 py-8 text-center text-sm text-muted">No users match these filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 z-20 flex justify-end bg-black/50" onClick={() => setEditing(null)}>
          <div className="h-full w-full max-w-md overflow-y-auto bg-panel p-6" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4">
              <p className="text-xs text-muted">Edit user</p>
              <h2 className="mt-1 font-display text-lg font-semibold">{editing.role.replaceAll('_', ' ')}</h2>
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
                <label className="mb-1 block text-xs text-muted">Email</label>
                <input
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full rounded-lg border border-hairline bg-panel-raised px-2.5 py-2 text-sm outline-none focus:border-live"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted">Account status</label>
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
