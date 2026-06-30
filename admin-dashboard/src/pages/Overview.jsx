import { useEffect, useState } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { api, apiErrorMessage } from '../api/client';
import StatCard from '../components/StatCard';
import { useSocket } from '../context/SocketContext';

const STATUS_LABELS = {
  REQUESTED: 'Requested',
  ASSIGNED: 'Assigned',
  EN_ROUTE: 'En route',
  ARRIVED: 'Arrived',
  IN_PROGRESS: 'In progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  NO_PARTNER_FOUND: 'No partner',
};

export default function Overview() {
  const [summary, setSummary] = useState(null);
  const [trend, setTrend] = useState([]);
  const [error, setError] = useState('');
  const { socket } = useSocket();

  async function load() {
    try {
      const { data } = await api.get('/admin/dashboard/summary');
      setSummary(data);
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  async function loadTrend() {
    try {
      const { data } = await api.get('/admin/dashboard/analytics', { params: { days: 14 } });
      setTrend(data.series.map((d) => ({ ...d, label: new Date(d.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) })));
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  useEffect(() => {
    load();
    loadTrend();
    const interval = setInterval(() => { load(); loadTrend(); }, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!socket) return;
    socket.on('request:status', load);
    return () => socket.off('request:status', load);
  }, [socket]);

  if (error) return <p className="text-sm text-danger">{error}</p>;
  if (!summary) return <p className="text-sm text-muted">Loading dashboard...</p>;

  const chartData = Object.entries(STATUS_LABELS).map(([key, label]) => ({
    status: label,
    count: summary.requestsByStatus[key] || 0,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Overview</h1>
        <p className="mt-1 text-sm text-muted">Live snapshot of dispatch activity across the network.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total requests" value={summary.totalRequests} sublabel={`${summary.todaysRequestCount} today`} />
        <StatCard label="Active right now" value={summary.activeRequestCount} accent="live" />
        <StatCard label="Completion rate" value={`${summary.completionRate}%`} accent="ok" />
        <StatCard label="Revenue collected" value={`₹${summary.totalRevenue.toLocaleString('en-IN')}`} accent="beacon" />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Partners online" value={summary.partners.online} sublabel={`of ${summary.partners.total} total`} accent="live" />
        <StatCard label="Available now" value={summary.partners.available} accent="ok" />
        <StatCard label="KYC approved" value={summary.partners.approved} />
        <StatCard label="Pending KYC review" value={summary.partners.pendingKyc} accent="beacon" />
      </div>

      <div className="panel p-5">
        <p className="mb-4 text-sm font-medium text-ink">Requests by status</p>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2E2E2E" vertical={false} />
            <XAxis dataKey="status" tick={{ fill: '#9C9C9C', fontSize: 12 }} axisLine={{ stroke: '#2E2E2E' }} tickLine={false} />
            <YAxis tick={{ fill: '#9C9C9C', fontSize: 12 }} axisLine={{ stroke: '#2E2E2E' }} tickLine={false} allowDecimals={false} />
            <Tooltip
              contentStyle={{ background: '#1A1A1A', border: '1px solid #2E2E2E', borderRadius: 8, color: '#FFFFFF' }}
              cursor={{ fill: '#242424' }}
            />
            <Bar dataKey="count" fill="#FFC107" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="panel p-5">
        <p className="mb-4 text-sm font-medium text-ink">14-day trend &mdash; requests &amp; revenue</p>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={trend} margin={{ top: 0, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2E2E2E" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: '#9C9C9C', fontSize: 11 }} axisLine={{ stroke: '#2E2E2E' }} tickLine={false} />
            <YAxis yAxisId="left" tick={{ fill: '#9C9C9C', fontSize: 12 }} axisLine={{ stroke: '#2E2E2E' }} tickLine={false} allowDecimals={false} />
            <YAxis yAxisId="right" orientation="right" tick={{ fill: '#9C9C9C', fontSize: 12 }} axisLine={{ stroke: '#2E2E2E' }} tickLine={false} />
            <Tooltip
              contentStyle={{ background: '#1A1A1A', border: '1px solid #2E2E2E', borderRadius: 8, color: '#FFFFFF' }}
              cursor={{ stroke: '#2E2E2E' }}
            />
            <Legend wrapperStyle={{ fontSize: 12, color: '#9C9C9C' }} />
            <Line yAxisId="left" type="monotone" dataKey="requests" name="Requests" stroke="#FFC107" strokeWidth={2} dot={false} />
            <Line yAxisId="left" type="monotone" dataKey="completed" name="Completed" stroke="#43A047" strokeWidth={2} dot={false} />
            <Line yAxisId="right" type="monotone" dataKey="revenue" name="Revenue (₹)" stroke="#2196F3" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
