import { useEffect, useState } from 'react';
import { api, apiErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

const AUDIENCE_OPTIONS = [
  { value: 'ALL', label: 'Everyone' },
  { value: 'CUSTOMERS', label: 'Customers only' },
  { value: 'PARTNERS', label: 'Partners only' },
  { value: 'USER', label: 'Specific user' },
];

export default function Notifications() {
  const [broadcasts, setBroadcasts] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState({ audience: 'ALL', title: '', body: '' });
  const { isSuperAdmin } = useAuth();
  const { socket } = useSocket();

  const [userQuery, setUserQuery] = useState('');
  const [userResults, setUserResults] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [searching, setSearching] = useState(false);

  async function load() {
    try {
      const { data } = await api.get('/admin/notifications/broadcasts');
      setBroadcasts(data.broadcasts);
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!socket) return;
    socket.on('broadcast:sent', load);
    return () => socket.off('broadcast:sent', load);
  }, [socket]);

  // Debounced user search for the "Specific user" audience mode.
  useEffect(() => {
    if (form.audience !== 'USER' || !userQuery.trim()) {
      setUserResults([]);
      return;
    }
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const { data } = await api.get('/admin/users', { params: { search: userQuery.trim() } });
        setUserResults(data.users.slice(0, 8));
      } catch (err) {
        setError(apiErrorMessage(err));
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [userQuery, form.audience]);

  function chooseAudience(value) {
    setForm({ ...form, audience: value });
    if (value !== 'USER') {
      setSelectedUser(null);
      setUserQuery('');
    }
  }

  function pickUser(u) {
    setSelectedUser(u);
    setUserResults([]);
    setUserQuery('');
  }

  async function send(e) {
    e.preventDefault();
    if (form.audience === 'USER' && !selectedUser) {
      setError('Pick a user to send this to first.');
      return;
    }
    setSending(true);
    setError('');
    setSuccess('');
    try {
      const payload = { ...form, userId: form.audience === 'USER' ? selectedUser.id : undefined };
      const { data } = await api.post('/admin/notifications/broadcast', payload);
      const who = form.audience === 'USER' ? (selectedUser.name || selectedUser.phone) : `${data.broadcast.recipientCount} recipient${data.broadcast.recipientCount === 1 ? '' : 's'}`;
      setSuccess(
        `Sent to ${who}` +
          (data.broadcast.pushSentCount > 0 ? ` (${data.broadcast.pushSentCount} via push)` : ' (no devices with push registered yet)')
      );
      setForm({ audience: 'ALL', title: '', body: '' });
      setSelectedUser(null);
      await load();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Notifications</h1>
        <p className="mt-1 text-sm text-muted">Push a message to every active customer, every partner, a specific person, or everyone at once.</p>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}
      {success && <p className="text-sm text-ok">{success}</p>}

      {isSuperAdmin ? (
        <form onSubmit={send} className="panel space-y-4 p-5">
          <div>
            <label className="mb-1.5 block text-xs uppercase tracking-wide text-muted">Audience</label>
            <div className="flex flex-wrap gap-2">
              {AUDIENCE_OPTIONS.map((opt) => (
                <button
                  type="button"
                  key={opt.value}
                  onClick={() => chooseAudience(opt.value)}
                  className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                    form.audience === opt.value ? 'border-beacon bg-beacon/15 text-beacon' : 'border-hairline text-muted hover:text-ink'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {form.audience === 'USER' && (
            <div>
              <label className="mb-1.5 block text-xs uppercase tracking-wide text-muted">Recipient</label>
              {selectedUser ? (
                <div className="flex items-center justify-between rounded-lg border border-hairline bg-panel-raised px-3 py-2 text-sm">
                  <span>
                    {selectedUser.name || 'Unnamed'} <span className="text-muted">&middot; {selectedUser.phone} &middot; {selectedUser.role.replaceAll('_', ' ')}</span>
                  </span>
                  <button type="button" onClick={() => setSelectedUser(null)} className="text-xs text-muted hover:text-ink">
                    Change
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <input
                    value={userQuery}
                    onChange={(e) => setUserQuery(e.target.value)}
                    placeholder="Type a name or phone number (3+ letters)..."
                    className="w-full rounded-lg border border-hairline bg-panel-raised px-3 py-2 text-sm outline-none focus:border-live"
                  />
                  {userQuery.trim().length >= 3 && (
                    <div className="absolute z-10 mt-1 w-full rounded-lg border border-hairline bg-panel shadow-lg">
                      {searching ? (
                        <p className="px-3 py-2 text-xs text-muted">Searching...</p>
                      ) : userResults.length === 0 ? (
                        <p className="px-3 py-2 text-xs text-muted">No matching users.</p>
                      ) : (
                        userResults.map((u) => (
                          <button
                            type="button"
                            key={u.id}
                            onClick={() => pickUser(u)}
                            className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-panel-raised"
                          >
                            <span>{u.name || 'Unnamed'}</span>
                            <span className="text-xs text-muted">{u.phone} &middot; {u.role.replaceAll('_', ' ')}</span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-xs uppercase tracking-wide text-muted">Title</label>
            <input
              required
              maxLength={100}
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Monsoon advisory"
              className="w-full rounded-lg border border-hairline bg-panel-raised px-3 py-2 text-sm outline-none focus:border-live"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs uppercase tracking-wide text-muted">Message</label>
            <textarea
              required
              maxLength={500}
              rows={4}
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              placeholder="What should they know?"
              className="w-full resize-none rounded-lg border border-hairline bg-panel-raised px-3 py-2 text-sm outline-none focus:border-live"
            />
          </div>
          <button type="submit" disabled={sending} className="rounded-lg bg-beacon px-4 py-2 text-sm font-medium text-void disabled:opacity-50">
            {sending ? 'Sending...' : 'Send'}
          </button>
        </form>
      ) : (
        <p className="panel p-5 text-sm text-muted">Sending broadcasts is restricted to full Admins. You can still see send history below.</p>
      )}

      <section>
        <h2 className="mb-3 text-sm font-medium text-ink">Recent broadcasts</h2>
        <div className="panel overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-hairline text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Audience</th>
                <th className="px-4 py-3">Recipients</th>
                <th className="px-4 py-3">Push delivered</th>
                <th className="px-4 py-3">Sent</th>
              </tr>
            </thead>
            <tbody>
              {broadcasts.map((b) => (
                <tr key={b.id} className="border-b border-hairline last:border-0">
                  <td className="px-4 py-3">
                    <p className="font-medium">{b.title}</p>
                    <p className="max-w-md truncate text-xs text-muted">{b.body}</p>
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {b.audience === 'USER' && b.targetUser
                      ? `${b.targetUser.name || 'Unnamed'} (${b.targetUser.phone})`
                      : AUDIENCE_OPTIONS.find((o) => o.value === b.audience)?.label || b.audience}
                  </td>
                  <td className="px-4 py-3">{b.recipientCount}</td>
                  <td className="px-4 py-3">{b.pushSentCount}</td>
                  <td className="px-4 py-3 text-xs text-muted">{new Date(b.sentAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</td>
                </tr>
              ))}
              {broadcasts.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-muted">No broadcasts sent yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
