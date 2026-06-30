const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' };

/* ---------------------------------------------------------------------- */
/* Service icons -- glyphs kept byte-for-byte identical to                */
/* admin-dashboard/src/components/icons.jsx so a service looks the same   */
/* whether someone sees it on the public site or in the dispatch console. */
/* ---------------------------------------------------------------------- */

function IconSiren(props) {
  return (
    <svg viewBox="0 0 20 20" width="20" height="20" {...common} {...props}>
      <path d="M5 11.2a5 5 0 0 1 10 0v2.8H5v-2.8z" />
      <path d="M3.2 17h13.6" />
      <path d="M10 4V2.3" />
      <path d="M6.3 5.3L5.1 4M13.7 5.3L14.9 4" />
    </svg>
  );
}

function IconWrench(props) {
  return (
    <svg viewBox="0 0 20 20" width="20" height="20" {...common} {...props}>
      <path d="M12.6 3.4a3 3 0 1 0-3.9 3.9L3.3 12.7l2 2 5.4-5.4a3 3 0 0 0 3.9-3.9l-1.7 1.7-1.4-.4-.4-1.4 1.5-1.5z" />
    </svg>
  );
}

function IconBattery(props) {
  return (
    <svg viewBox="0 0 20 20" width="20" height="20" {...common} {...props}>
      <rect x="3" y="6" width="14" height="10" rx="1.5" />
      <path d="M7 6V4.3M13 6V4.3" />
      <path d="M11.2 9l-2.6 3.1h2.3l-2.1 2.9" />
    </svg>
  );
}

function IconFuel(props) {
  return (
    <svg viewBox="0 0 20 20" width="20" height="20" {...common} {...props}>
      <path d="M4 17V5.6A1.6 1.6 0 0 1 5.6 4h3.3A1.6 1.6 0 0 1 10.5 5.6V17" />
      <path d="M3.3 17h7.9" />
      <path d="M6.6 4V2.5" />
      <path d="M10.5 8h1.7c.9 0 1.7.8 1.7 1.7V14a1.3 1.3 0 0 0 1.3 1.3" />
    </svg>
  );
}

function IconTire(props) {
  return (
    <svg viewBox="0 0 20 20" width="20" height="20" {...common} {...props}>
      <circle cx="10" cy="10" r="7" />
      <circle cx="10" cy="10" r="2.4" />
      <path d="M10 3v2.2M10 14.8V17M3 10h2.2M14.8 10H17M5.5 5.5l1.5 1.5M13 13l1.5 1.5M14.5 5.5L13 7M7 13l-1.5 1.5" />
    </svg>
  );
}

function IconTowTruck(props) {
  return (
    <svg viewBox="0 0 20 20" width="20" height="20" {...common} {...props}>
      <path d="M2 13.5V8a1 1 0 0 1 1-1h6.5v6.5" />
      <path d="M9.5 7.5H13c.4 0 .7.2.9.6L15 11h2a1 1 0 0 1 1 1v1.5" />
      <path d="M11.2 7.5V5a1 1 0 0 1 1-1h1" />
      <circle cx="13.4" cy="3.7" r="1" />
      <circle cx="5.5" cy="15.2" r="1.7" />
      <circle cx="14.5" cy="15.2" r="1.7" />
      <path d="M2 13.5h1.8M16.5 13.5h1.5" />
    </svg>
  );
}

function IconKey(props) {
  return (
    <svg viewBox="0 0 20 20" width="20" height="20" {...common} {...props}>
      <circle cx="6.2" cy="6.2" r="3.2" />
      <path d="M8.5 8.5L16 16" />
      <path d="M13.2 13.2l1.6-1.6M15.1 15.1l1.6-1.6" />
    </svg>
  );
}

const SERVICE_ICON_COMPONENTS = {
  siren: IconSiren,
  wrench: IconWrench,
  battery: IconBattery,
  'battery-charging': IconBattery,
  fuel: IconFuel,
  tire: IconTire,
  'tow-flatbed': IconTowTruck,
  'tow-crane': IconTowTruck,
  key: IconKey,
};

export function ServiceIcon({ icon, ...props }) {
  const Component = SERVICE_ICON_COMPONENTS[icon] || IconWrench;
  return <Component {...props} />;
}

/* ---------------------------------------------------------------------- */
/* Site-chrome icons                                                      */
/* ---------------------------------------------------------------------- */

export function IconArrowRight(props) {
  return (
    <svg viewBox="0 0 20 20" width="16" height="16" {...common} {...props}>
      <path d="M4 10h12M11 5l5 5-5 5" />
    </svg>
  );
}

export function IconMapPin(props) {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" {...common} {...props}>
      <path d="M10 17.5S15.5 12 15.5 7.7a5.5 5.5 0 1 0-11 0c0 4.3 5.5 9.8 5.5 9.8z" />
      <circle cx="10" cy="7.7" r="2" />
    </svg>
  );
}

export function IconUsers(props) {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" {...common} {...props}>
      <circle cx="7" cy="6.5" r="2.5" />
      <path d="M2.5 16c0-2.8 2-5 4.5-5s4.5 2.2 4.5 5" />
      <circle cx="14.5" cy="7.5" r="2" />
      <path d="M12.8 11.2c1.9.4 3.2 2.2 3.2 4.8" />
    </svg>
  );
}

export function IconShieldCheck(props) {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" {...common} {...props}>
      <path d="M10 2.5l6 2.2v4.8c0 4-2.6 6.8-6 8-3.4-1.2-6-4-6-8V4.7l6-2.2z" />
      <path d="M7.3 10l1.9 1.9 3.5-3.8" />
    </svg>
  );
}

export function IconClock(props) {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" {...common} {...props}>
      <circle cx="10" cy="10" r="7.2" />
      <path d="M10 6v4.2l3 1.8" />
    </svg>
  );
}

export function IconStar(props) {
  return (
    <svg viewBox="0 0 20 20" width="16" height="16" {...common} {...props} fill="currentColor" stroke="none">
      <path d="M10 2.2l2.3 4.9 5.3.7-3.9 3.7.9 5.3-4.6-2.5-4.6 2.5.9-5.3-3.9-3.7 5.3-.7L10 2.2z" />
    </svg>
  );
}

export function IconMenu(props) {
  return (
    <svg viewBox="0 0 20 20" width="22" height="22" {...common} {...props}>
      <path d="M3 6h14M3 10h14M3 14h14" />
    </svg>
  );
}

export function IconClose(props) {
  return (
    <svg viewBox="0 0 20 20" width="22" height="22" {...common} {...props}>
      <path d="M5 5l10 10M15 5L5 15" />
    </svg>
  );
}

export function IconDownload(props) {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" {...common} {...props}>
      <path d="M10 3v9.5M6.3 9.2L10 12.9l3.7-3.7" />
      <path d="M4 15.5h12" />
    </svg>
  );
}

export function IconTruck(props) {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" {...common} {...props}>
      <path d="M2 13.5V6a1 1 0 0 1 1-1h7.5v8.5" />
      <path d="M10.5 8H14c.4 0 .8.2 1 .6L16.5 11H18a1 1 0 0 1 1 1v1.5" />
      <circle cx="6" cy="15.2" r="1.7" />
      <circle cx="15" cy="15.2" r="1.7" />
      <path d="M2 13.5h2.3M16.7 13.5H19" />
    </svg>
  );
}
