import { useEffect, useState } from 'react';
import { api } from '../api';
import Reveal from './Reveal';

const REFRESH_MS = 30000;

const STAT_DEFS = [
  { key: 'verifiedPartners', label: 'Verified Partners' },
  { key: 'ordersServed', label: 'Orders Served' },
  { key: 'citiesServing', label: 'Cities Live' },
  { key: 'serviceTypesOffered', label: 'Services Offered' },
];

function formatNumber(n) {
  if (n === null || n === undefined) return '—';
  return n.toLocaleString('en-IN');
}

export default function LiveStats() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const { data } = await api.get('/public/stats');
        if (!cancelled) {
          setStats(data);
          setError(false);
        }
      } catch {
        if (!cancelled) setError(true);
      }
    }

    load();
    const interval = setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return (
    <section className="border-y border-hairline bg-panel/60">
      <div className="mx-auto max-w-content px-5 py-10">
        <Reveal className="mb-6 flex items-center justify-center gap-2 sm:justify-start">
          <span className={`beacon-dot ${!error ? 'is-live bg-beacon' : 'bg-muted'}`} />
          <span className="font-mono text-xs uppercase tracking-[0.18em] text-muted">
            {error ? 'Live data temporarily unavailable' : 'Live from the dispatch network'}
          </span>
        </Reveal>
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4 sm:gap-4">
          {STAT_DEFS.map((s, i) => (
            <Reveal key={s.key} delay={i * 80} className="text-center sm:text-left">
              <p className="font-mono text-3xl font-semibold tabular-nums text-ink sm:text-4xl">
                {error ? '—' : formatNumber(stats?.[s.key])}
              </p>
              <p className="mt-1 text-xs text-muted sm:text-sm">{s.label}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
