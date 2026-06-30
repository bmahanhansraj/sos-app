import { useEffect, useState } from 'react';
import { api, apiErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';

const EVENT_LABELS = {
  SIGNUP: 'Sign Up',
  LOGIN: 'Login',
  ORDER_CONFIRMED: 'Order Confirmed',
  ORDER_COMPLETED: 'Order Completed',
  ORDER_DELAYED: 'Delay in Order',
  ORDER_CANCELLED: 'Order Cancelled',
};

const EVENT_DESCRIPTIONS = {
  SIGNUP: 'A new customer, partner, or fleet account is created.',
  LOGIN: 'Any existing account successfully logs in.',
  ORDER_CONFIRMED: 'Payment succeeds and we start finding a partner.',
  ORDER_COMPLETED: 'A partner marks the job done (OTP verified).',
  ORDER_DELAYED: "An assigned job runs well past its estimated ETA, detected automatically (checked every couple of minutes, no manual trigger needed).",
  ORDER_CANCELLED: 'A request is cancelled, by the customer or due to payment failure.',
};

const CHANNEL_LABELS = { EMAIL: 'Email', SMS: 'SMS', WHATSAPP: 'WhatsApp', ALERT: 'In-app / push alert' };
const CHANNEL_ORDER = ['EMAIL', 'SMS', 'WHATSAPP', 'ALERT'];

const TEMPLATE_VARS = ['name', 'phone', 'email', 'requestNumber', 'serviceName', 'amount', 'partnerName', 'cancelReason'];

export default function NotificationRules() {
  const [rules, setRules] = useState([]);
  const [events, setEvents] = useState([]);
  const [error, setError] = useState('');
  const [logs, setLogs] = useState([]);
  const [showLog, setShowLog] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ subject: '', message: '' });
  const [saving, setSaving] = useState(false);
  const { isSuperAdmin } = useAuth();

  async function load() {
    try {
      const { data } = await api.get('/admin/notification-rules');
      setRules(data.rules);
      setEvents(data.events);
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  async function loadLog() {
    try {
      const { data } = await api.get('/admin/notification-dispatch-log', { params: { limit: 100 } });
      setLogs(data.logs);
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  useEffect(() => { load(); }, []);
  useEffect(() => { if (showLog) loadLog(); }, [showLog]);

  async function toggleRule(rule) {
    try {
      await api.patch(`/admin/notification-rules/${encodeURIComponent(rule.id)}`, { enabled: !rule.enabled });
      load();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  function startEdit(rule) {
    setEditingId(rule.id);
    setEditForm({ subject: rule.subject || '', message: rule.message });
  }

  async function saveEdit(rule) {
    if (!editForm.message.trim()) {
      setError('Message can\'t be empty.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await api.patch(`/admin/notification-rules/${encodeURIComponent(rule.id)}`, {
        subject: rule.channel === 'EMAIL' ? editForm.subject : undefined,
        message: editForm.message,
      });
      setEditingId(null);
      await load();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const rulesByEvent = events.reduce((acc, ev) => {
    acc[ev] = CHANNEL_ORDER.map((ch) => rules.find((r) => r.event === ev && r.channel === ch)).filter(Boolean);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Notification triggers</h1>
        <p className="mt-1 text-sm text-muted">
          Choose which channels fire automatically for each lifecycle event, and edit the message each one sends.
          {!isSuperAdmin && ' You can view this configuration; only full Admins can change it.'}
        </p>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="space-y-4">
        {events.map((ev) => (
          <div key={ev} className="panel p-5">
            <div className="mb-3">
              <h2 className="text-sm font-semibold text-ink">{EVENT_LABELS[ev] || ev}</h2>
              <p className="text-xs text-muted">{EVENT_DESCRIPTIONS[ev]}</p>
            </div>
            <div className="space-y-2">
              {(rulesByEvent[ev] || []).map((rule) => {
                const editing = editingId === rule.id;
                return (
                  <div key={rule.id} className="rounded-lg border border-hairline">
                    <div className="flex items-center justify-between gap-3 px-3 py-2.5">
                      <div className="flex items-center gap-3">
                        {isSuperAdmin ? (
                          <button
                            onClick={() => toggleRule(rule)}
                            className={`rounded-full px-2.5 py-1 text-xs font-medium ${rule.enabled ? 'bg-ok/15 text-ok' : 'bg-muted/15 text-muted'}`}
                          >
                            {rule.enabled ? 'On' : 'Off'}
                          </button>
                        ) : (
                          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${rule.enabled ? 'bg-ok/15 text-ok' : 'bg-muted/15 text-muted'}`}>
                            {rule.enabled ? 'On' : 'Off'}
                          </span>
                        )}
                        <span className="text-sm font-medium">{CHANNEL_LABELS[rule.channel]}</span>
                      </div>
                      {isSuperAdmin && !editing && (
                        <button onClick={() => startEdit(rule)} className="text-xs text-muted hover:text-ink">
                          Edit message
                        </button>
                      )}
                    </div>
                    {editing ? (
                      <div className="space-y-2 border-t border-hairline bg-panel-raised/40 px-3 py-3">
                        {rule.channel === 'EMAIL' && (
                          <input
                            value={editForm.subject}
                            onChange={(e) => setEditForm({ ...editForm, subject: e.target.value })}
                            placeholder="Email subject"
                            className="w-full rounded-lg border border-hairline bg-panel-raised px-2.5 py-1.5 text-sm outline-none focus:border-live"
                          />
                        )}
                        <textarea
                          value={editForm.message}
                          onChange={(e) => setEditForm({ ...editForm, message: e.target.value })}
                          rows={3}
                          className="w-full resize-none rounded-lg border border-hairline bg-panel-raised px-2.5 py-1.5 text-sm outline-none focus:border-live"
                        />
                        <p className="text-xs text-muted">
                          Variables: {TEMPLATE_VARS.map((v) => <code key={v} className="mr-1.5 rounded bg-panel px-1 py-0.5 font-mono">{`{{${v}}}`}</code>)}
                        </p>
                        <div className="flex gap-2">
                          <button onClick={() => saveEdit(rule)} disabled={saving || !editForm.message.trim()} className="rounded-lg bg-beacon px-3 py-1.5 text-xs font-medium text-void disabled:opacity-50">
                            {saving ? 'Saving...' : 'Save'}
                          </button>
                          <button onClick={() => setEditingId(null)} className="rounded-lg border border-hairline px-3 py-1.5 text-xs text-muted hover:text-ink">
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="truncate border-t border-hairline px-3 py-2 font-mono text-xs text-muted">
                        {rule.subject ? `"${rule.subject}" — ` : ''}{rule.message}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <section>
        <button onClick={() => setShowLog((v) => !v)} className="text-sm font-medium text-ink hover:text-beacon">
          {showLog ? '▾' : '▸'} Recent dispatch log
        </button>
        {showLog && (
          <div className="panel mt-3 overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-hairline text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-3">When</th>
                  <th className="px-4 py-3">Event</th>
                  <th className="px-4 py-3">Channel</th>
                  <th className="px-4 py-3">Recipient</th>
                  <th className="px-4 py-3">Result</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id} className="border-b border-hairline last:border-0">
                    <td className="px-4 py-2.5 whitespace-nowrap text-xs text-muted">
                      {new Date(l.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                    </td>
                    <td className="px-4 py-2.5">{EVENT_LABELS[l.event] || l.event}</td>
                    <td className="px-4 py-2.5 text-muted">{CHANNEL_LABELS[l.channel] || l.channel}</td>
                    <td className="px-4 py-2.5 text-xs text-muted">{l.user?.name || l.recipient || '—'}</td>
                    <td className="px-4 py-2.5">
                      {l.ok ? (
                        <span className="text-xs font-medium text-ok">Sent</span>
                      ) : (
                        <span className="text-xs font-medium text-muted" title={l.reason || ''}>Skipped{l.reason ? ` — ${l.reason}` : ''}</span>
                      )}
                    </td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-muted">No dispatches yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
