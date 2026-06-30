import { IconTruck, IconShieldCheck, IconUsers } from './icons';
import Reveal from './Reveal';

const POINTS = [
  { icon: IconTruck, text: 'Pick your own hours and service area' },
  { icon: IconShieldCheck, text: 'Cashless payouts after every completed job' },
  { icon: IconUsers, text: 'Fleet owners can onboard their whole team' },
];

export default function PartnerCTA() {
  return (
    <section id="partners" className="mx-auto max-w-content px-5 py-20 md:py-28">
      <Reveal>
        <div className="panel relative overflow-hidden p-8 sm:p-12">
          <div
            className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(255,193,7,0.10), transparent 70%)' }}
          />
          <div className="relative grid gap-8 md:grid-cols-2 md:items-center">
            <div>
              <p className="font-mono text-xs font-medium uppercase tracking-[0.18em] text-beacon">For mechanics &amp; tow operators</p>
              <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
                Drive earnings, not just kilometers
              </h2>
              <p className="mt-3 max-w-md text-muted">
                Join the network of verified roadside partners getting matched to nearby jobs the moment a
                customer needs help.
              </p>
              <a
                href="#download"
                className="mt-7 inline-block rounded-lg bg-beacon px-6 py-3 text-sm font-semibold text-void transition-opacity hover:opacity-90"
              >
                Get the partner app
              </a>
            </div>
            <ul className="space-y-4">
              {POINTS.map((p) => (
                <li key={p.text} className="flex items-center gap-3">
                  <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-beacon/10 text-beacon">
                    <p.icon width={17} height={17} />
                  </span>
                  <span className="text-sm text-ink">{p.text}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
