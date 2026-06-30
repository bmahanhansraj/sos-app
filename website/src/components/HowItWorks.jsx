import { IconMapPin, IconUsers, IconClock, IconStar } from './icons';
import Reveal from './Reveal';

const STEPS = [
  {
    icon: IconMapPin,
    title: 'Tell us what\'s wrong',
    body: 'Pick a service in the app: towing, battery, tire, fuel, lockout, or a general SOS if you\'re not sure.',
  },
  {
    icon: IconUsers,
    title: 'We match the nearest partner',
    body: 'A verified, KYC-checked partner near your location responds, usually in under a minute.',
  },
  {
    icon: IconClock,
    title: 'Track them in real time',
    body: 'Watch your partner\'s live location and ETA update on the map, the same way you\'d track a cab.',
  },
  {
    icon: IconStar,
    title: 'Pay and rate',
    body: 'Cashless checkout once the job is done, then rate the partner so the network stays reliable.',
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="border-y border-hairline bg-panel/40">
      <div className="mx-auto max-w-content px-5 py-20 md:py-28">
        <Reveal className="mx-auto max-w-xl text-center">
          <p className="font-mono text-xs font-medium uppercase tracking-[0.18em] text-beacon">How it works</p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            From breakdown to back on the road
          </h2>
        </Reveal>

        <div className="mt-14 grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, i) => (
            <Reveal key={step.title} delay={i * 100} className="relative">
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm text-muted">{String(i + 1).padStart(2, '0')}</span>
                <span className="h-px flex-1 bg-hairline" />
              </div>
              <div className="mt-4 flex h-11 w-11 items-center justify-center rounded-lg bg-beacon/10 text-beacon">
                <step.icon />
              </div>
              <h3 className="mt-4 font-display text-base font-semibold text-ink">{step.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{step.body}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
