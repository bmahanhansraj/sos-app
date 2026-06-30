import { useEffect, useState } from 'react';
import { api, apiErrorMessage } from '../api/client';

const ACTION_LABELS = {
  PARTNER_APPROVED: 'Partner approved',
  PARTNER_REJECTED: 'Partner rejected',
  PARTNER_UPDATED: 'Partner profile edited',
  USER_UPDATED: 'User account edited',
  AGENCY_CREATED: 'Fleet onboarded',
  AGENCY_UPDATED: 'Fleet edited',
  ADMIN_USER_CREATED: 'Staff account created',
  ADMIN_USER_UPDATED: 'Staff account edited',
  BROADCAST_SENT: 'Broadcast sent',
  CITY_CREATED: 'City added',
  CITY_UPDATED: 'City / geofence edited',
  SERVICE_TYPE_CREATED: 'Service type added',
  SERVICE_TYPE_UPDATED: 'Service type edited',
  PRICING_RULE_CREATED: 'Pricing rule added',
  PRICING_RULE_UPDATED: 'Pricing rule edited',
};

function actionLabel(action) {
  return ACTION_LABELS[action] || action.replaceAll('_', ' ').toLowerCase().replace(/^./, (c) => c.toUpperCase());
}

function actionTone(action) {
  if (action.includes('REJECTED')) return 'text-danger';
  if (action.includes('APPROVED') || action.includes('CREATED') || action.includes('ONBOARDED')) return 'text-ok';
  return 'text-ink';
}

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState('');
  const [actionFilter, setActionFilter] = useState('');

  async function load() {
    try {
      const { data } = await api.get('/admin/audit-logs', { params: { limit: 200 } });
      setLogs(data.logs);
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  useEffect(() => { load(); }, []);

  const actions = [...new Set(logs.map((l) => l.action))].sort();
  const visible = actionFilter ? logs.filter((l) => l.action === actionFilter) : logs;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">Audit log</h1>
          <p className="mt-1 text-sm text-muted">
            Every sensitive action &mdash; approvals, account changes, pricing edits, broadcasts &mdash; recorded
            with who did it and when. This is Admin-only, same as the actions it tracks.
          </p>
        </div>
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="rounded-lg border border-hairline bg-panel-raised px-2.5 py-1.5 text-sm outline-none focus:border-live"
        >
          <option value="">All actions</option>
          {actions.map((a) => <option key={a} value={a}>{actionLabel(a)}</option>)}
        </select>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="panel overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-hairline text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">Who</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Details</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((log) => {
              let details = null;
              try { details = log.details ? JSON.parse(log.details) : null; } catch { /* leave as raw string below */ }
              return (
                <tr key={log.id} className="border-b border-hairline last:border-0">
                  <td className="px-4 py-3 whitespace-nowrap text-xs text-muted">
                    {new Date(log.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                  </td>
                  <td className="px-4 py-3">
                    {log.actor ? (
                      <span>{log.actor.name || 'Unknown'} <span className="text-xs text-muted">&middot; {log.actor.role}</span></span>
                    ) : (
                      <span className="text-xs text-muted">System</span>
                    )}
                  </td>
                  <td className={`px-4 py-3 font-medium ${actionTone(log.action)}`}>{actionLabel(log.action)}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted">
                    {details ? Object.entries(details).map(([k, v]) => `${k}: ${v}`).join(', ') : (log.details || '—')}
                  </td>
                </tr>
              );
            })}
            {visible.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-muted">No matching audit entries.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
