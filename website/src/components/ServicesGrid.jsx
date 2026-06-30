import { useEffect, useState } from 'react';
import { api } from '../api';
import { ServiceIcon } from './icons';
import Reveal from './Reveal';

export default function ServicesGrid() {
  const [services, setServices] = useState([]);
  const [error, setError] = useState(false);

  useEffect(() => {
    api
      .get('/catalog/services')
      .then(({ data }) => setServices(data.serviceTypes))
      .catch(() => setError(true));
  }, []);

  return (
    <section id="services" className="mx-auto max-w-content px-5 py-20 md:py-28">
      <Reveal className="mx-auto max-w-xl text-center">
        <p className="font-mono text-xs font-medium uppercase tracking-[0.18em] text-beacon">What we cover</p>
        <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
          One app for every roadside problem
        </h2>
        <p className="mt-3 text-muted">
          Every service below is live on the platform today &mdash; pricing starts at the amount shown and scales
          with distance.
        </p>
      </Reveal>

      {error && <p className="mt-10 text-center text-sm text-muted">Couldn't load the service catalog right now &mdash; please check back shortly.</p>}

      <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {services.map((s, i) => (
          <Reveal key={s.id} delay={(i % 3) * 80}>
            <div className="panel group h-full p-6 transition-colors hover:border-beacon/50">
              <div className="flex items-center justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-beacon/10 text-beacon">
                  <ServiceIcon icon={s.icon} />
                </div>
                {s.isEmergencySos && (
                  <span className="rounded-full bg-danger/15 px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wide text-danger">
                    SOS
                  </span>
                )}
              </div>
              <h3 className="mt-4 font-display text-base font-semibold text-ink">{s.name}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{s.description}</p>
              <p className="mt-4 font-mono text-sm text-ink">
                from <span className="font-semibold text-beacon">₹{s.basePrice}</span>
                {s.estimatedMins && <span className="text-muted"> &middot; ~{s.estimatedMins} min ETA</span>}
              </p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
