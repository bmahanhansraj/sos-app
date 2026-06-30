import { useEffect, useState } from 'react';
import { PORTAL_URL } from '../api';
import { IconMenu, IconClose, IconArrowRight } from './icons';

const LINKS = [
  { href: '#services', label: 'Services' },
  { href: '#how-it-works', label: 'How it works' },
  { href: '#cities', label: 'Cities' },
  { href: '#partners', label: 'Become a partner' },
];

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 8);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
        scrolled ? 'border-b border-hairline bg-void/90 backdrop-blur' : 'border-b border-transparent bg-transparent'
      }`}
    >
      <div className="mx-auto flex max-w-content items-center justify-between px-5 py-3.5">
        <a href="#top" className="flex items-center gap-2">
          <img src="/logo-dark.png" alt="SoS - Services On Site" className="h-9 w-auto" />
        </a>

        <nav className="hidden items-center gap-8 md:flex">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className="text-sm text-muted transition-colors hover:text-ink">
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <a
            href={PORTAL_URL}
            className="group flex items-center gap-1.5 rounded-lg border border-hairline px-4 py-2 text-sm font-medium text-ink transition-colors hover:border-beacon hover:text-beacon"
          >
            Login
            <IconArrowRight className="transition-transform group-hover:translate-x-0.5" />
          </a>
        </div>

        <button onClick={() => setOpen(true)} aria-label="Open menu" className="text-ink md:hidden">
          <IconMenu />
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 bg-void md:hidden">
          <div className="mx-auto flex max-w-content items-center justify-between px-5 py-3.5">
            <img src="/logo-dark.png" alt="SoS - Services On Site" className="h-9 w-auto" />
            <button onClick={() => setOpen(false)} aria-label="Close menu" className="text-ink">
              <IconClose />
            </button>
          </div>
          <nav className="flex flex-col gap-1 px-5 pt-6">
            {LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-3 text-lg text-ink hover:bg-panel-raised"
              >
                {l.label}
              </a>
            ))}
            <a
              href={PORTAL_URL}
              className="mt-3 rounded-lg bg-beacon px-3 py-3 text-center text-lg font-medium text-void"
            >
              Login to portal
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}
