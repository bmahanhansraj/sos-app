import { ServiceIcon } from './icons';

const NEARBY_GLYPHS = [
  { icon: 'tow-flatbed', top: '8%', left: '12%' },
  { icon: 'battery', top: '18%', left: '78%' },
  { icon: 'tire', top: '68%', left: '8%' },
  { icon: 'fuel', top: '78%', left: '72%' },
  { icon: 'wrench', top: '42%', left: '88%' },
];

export default function Hero() {
  return (
    <section id="top" className="relative overflow-hidden pb-20 pt-32 md:pb-28 md:pt-44">
      <div className="mx-auto grid max-w-content items-center gap-12 px-5 md:grid-cols-2 md:gap-8">
        <div>
          <p className="font-mono text-xs font-medium uppercase tracking-[0.18em] text-danger">
            24&times;7 Roadside Assistance &middot; India
          </p>
          <h1 className="mt-4 font-display text-4xl font-bold leading-[1.08] tracking-tight text-ink sm:text-5xl lg:text-[3.4rem]">
            Your vehicle breaks down.
            <br />
            <span className="text-beacon">We're already on the way.</span>
          </h1>
          <p className="mt-5 max-w-md text-base leading-relaxed text-muted">
            Towing, battery jump-starts, flat tires, fuel delivery and more &mdash; verified partners reach
            you wherever you are, with live tracking from the moment they accept.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a
              href="#download"
              className="rounded-lg bg-beacon px-6 py-3 text-sm font-semibold text-void transition-opacity hover:opacity-90"
            >
              Get the app
            </a>
            <a
              href="#partners"
              className="rounded-lg border border-hairline px-6 py-3 text-sm font-medium text-ink transition-colors hover:border-beacon hover:text-beacon"
            >
              Become a partner
            </a>
          </div>
        </div>

        <div className="relative mx-auto flex h-72 w-72 items-center justify-center sm:h-96 sm:w-96">
          {/* Radar disc */}
          <div
            className="absolute inset-0 rounded-full"
            style={{ background: 'radial-gradient(circle at 50% 50%, rgba(255,193,7,0.08), transparent 70%)' }}
          />
          {/* Pulsing rings */}
          <span className="radar-ring absolute h-24 w-24 rounded-full border border-beacon/40 sm:h-28 sm:w-28" />
          <span className="radar-ring absolute h-24 w-24 rounded-full border border-beacon/40 sm:h-28 sm:w-28" style={{ animationDelay: '1s' }} />
          <span className="radar-ring absolute h-24 w-24 rounded-full border border-beacon/40 sm:h-28 sm:w-28" style={{ animationDelay: '2s' }} />

          {/* Center marker */}
          <div className="relative z-10 flex h-16 w-16 items-center justify-center rounded-full bg-beacon shadow-lg sm:h-20 sm:w-20">
            <svg viewBox="0 0 20 20" width="30" height="30" fill="none" stroke="#121212" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 17.5S15.5 12 15.5 7.7a5.5 5.5 0 1 0-11 0c0 4.3 5.5 9.8 5.5 9.8z" />
              <circle cx="10" cy="7.7" r="2" />
            </svg>
          </div>

          {/* Nearby partner glyphs, scattered around the disc */}
          {NEARBY_GLYPHS.map((g) => (
            <div
              key={g.icon + g.top}
              className="absolute flex h-9 w-9 items-center justify-center rounded-full border border-hairline bg-panel text-muted shadow-panel sm:h-10 sm:w-10"
              style={{ top: g.top, left: g.left }}
            >
              <ServiceIcon icon={g.icon} width={16} height={16} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
