import { PORTAL_URL } from '../api';

const LINK_GROUPS = [
  {
    title: 'Product',
    links: [
      { href: '#services', label: 'Services' },
      { href: '#how-it-works', label: 'How it works' },
      { href: '#cities', label: 'Cities' },
      { href: '#download', label: 'Get the app' },
    ],
  },
  {
    title: 'Partners',
    links: [
      { href: '#partners', label: 'Become a partner' },
      { href: '#download', label: 'Partner app' },
    ],
  },
  {
    title: 'Access',
    links: [{ href: PORTAL_URL, label: 'Portal login' }],
  },
];

export default function Footer() {
  return (
    <footer className="border-t border-hairline">
      <div className="mx-auto max-w-content px-5 py-14">
        <div className="grid grid-cols-2 gap-10 sm:grid-cols-4">
          <div className="col-span-2">
            <img src="/logo-dark.png" alt="SoS - Services On Site" className="h-9 w-auto" />
            <p className="mt-3 max-w-xs text-sm text-muted">
              24&times;7 roadside assistance, dispatched in real time, across India.
            </p>
          </div>
          {LINK_GROUPS.map((group) => (
            <div key={group.title}>
              <p className="text-xs font-medium uppercase tracking-wide text-muted">{group.title}</p>
              <ul className="mt-3 space-y-2.5">
                {group.links.map((l) => (
                  <li key={l.label}>
                    <a href={l.href} className="text-sm text-ink/80 transition-colors hover:text-beacon">
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-hairline pt-6 sm:flex-row">
          <p className="text-xs text-muted">&copy; {new Date().getFullYear()} SoS &ndash; Services On Site. All rights reserved.</p>
          <p className="font-mono text-xs text-muted">Made for the road, built in India.</p>
        </div>
      </div>
    </footer>
  );
}
