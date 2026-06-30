import { useEffect, useState } from 'react';
import { api } from '../api';
import { IconMapPin } from './icons';
import Reveal from './Reveal';

export default function Cities() {
  const [cities, setCities] = useState([]);
  const [error, setError] = useState(false);

  useEffect(() => {
    api
      .get('/catalog/cities')
      .then(({ data }) => setCities(data.cities.filter((c) => c.isActive)))
      .catch(() => setError(true));
  }, []);

  return (
    <section id="cities" className="mx-auto max-w-content px-5 py-20 md:py-28">
      <Reveal className="mx-auto max-w-xl text-center">
        <p className="font-mono text-xs font-medium uppercase tracking-[0.18em] text-beacon">Where we are</p>
        <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
          Live in these cities today
        </h2>
        <p className="mt-3 text-muted">We're expanding to new cities every month &mdash; this list updates the moment a new one goes live.</p>
      </Reveal>

      {error && <p className="mt-10 text-center text-sm text-muted">Couldn't load city coverage right now &mdash; please check back shortly.</p>}

      <div className="mt-10 flex flex-wrap justify-center gap-3">
        {cities.map((c, i) => (
          <Reveal key={c.id} delay={i * 60}>
            <div className="flex items-center gap-2.5 rounded-full border border-hairline bg-panel px-5 py-2.5">
              <IconMapPin className="text-beacon" width={16} height={16} />
              <span className="text-sm font-medium text-ink">{c.name}</span>
              {c.stateName && <span className="text-xs text-muted">{c.stateName}</span>}
            </div>
          </Reveal>
        ))}
        <Reveal delay={cities.length * 60}>
          <div className="flex items-center gap-2.5 rounded-full border border-dashed border-hairline px-5 py-2.5">
            <span className="text-sm text-muted">+ more coming soon</span>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
