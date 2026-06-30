import { AppBadgesRow } from './AppBadges';
import Reveal from './Reveal';

export default function DownloadSection() {
  return (
    <section id="download" className="border-t border-hairline bg-panel/40">
      <div className="mx-auto max-w-content px-5 py-20 text-center md:py-28">
        <Reveal>
          <p className="font-mono text-xs font-medium uppercase tracking-[0.18em] text-beacon">Get the app</p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            Help, one tap away
          </h2>
          <p className="mx-auto mt-3 max-w-md text-muted">
            The SoS customer and partner apps are in final testing. Badges below are placeholders &mdash;
            store listings go live soon.
          </p>
          <div className="mt-8 flex justify-center">
            <AppBadgesRow />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
