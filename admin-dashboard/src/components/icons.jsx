const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' };

export function IconGrid(props) {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" {...common} {...props}>
      <rect x="3" y="3" width="6" height="6" rx="1" />
      <rect x="11" y="3" width="6" height="6" rx="1" />
      <rect x="3" y="11" width="6" height="6" rx="1" />
      <rect x="11" y="11" width="6" height="6" rx="1" />
    </svg>
  );
}

export function IconMap(props) {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" {...common} {...props}>
      <path d="M10 2c3 0 5 2.2 5 5 0 3.6-5 9-5 9s-5-5.4-5-9c0-2.8 2-5 5-5z" />
      <circle cx="10" cy="7" r="1.6" />
    </svg>
  );
}

export function IconList(props) {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" {...common} {...props}>
      <circle cx="3.6" cy="5" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="3.6" cy="10" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="3.6" cy="15" r="0.9" fill="currentColor" stroke="none" />
      <path d="M7 5h10M7 10h10M7 15h10" />
    </svg>
  );
}

export function IconUsers(props) {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" {...common} {...props}>
      <circle cx="7" cy="6.5" r="2.5" />
      <path d="M2.5 17c0-2.8 2-5 4.5-5s4.5 2.2 4.5 5" />
      <circle cx="14.5" cy="7.5" r="2" />
      <path d="M12.5 17c0-2.2 1.3-4 3-4.6" />
    </svg>
  );
}

export function IconTag(props) {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" {...common} {...props}>
      <path d="M3 3h6l8 8-6 6-8-8V3z" />
      <circle cx="6.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconLogout(props) {
  return (
    <svg viewBox="0 0 20 20" width="16" height="16" {...common} {...props}>
      <path d="M8 3H4.5A1.5 1.5 0 0 0 3 4.5v11A1.5 1.5 0 0 0 4.5 17H8" />
      <path d="M13 14l4-4-4-4M17 10H7" />
    </svg>
  );
}

export function IconShield(props) {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" {...common} {...props}>
      <path d="M10 2.5l6 2.2v4.8c0 4-2.5 6.8-6 8-3.5-1.2-6-4-6-8V4.7l6-2.2z" />
      <path d="M7.3 9.8l2 2 3.4-4" />
    </svg>
  );
}

export function IconBuilding(props) {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" {...common} {...props}>
      <rect x="4" y="3" width="12" height="14" rx="1" />
      <path d="M7 6.5h1.4M11.6 6.5H13M7 10h1.4M11.6 10H13" />
      <path d="M8.5 17v-3h3v3" />
    </svg>
  );
}

export function IconBell(props) {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" {...common} {...props}>
      <path d="M10 3a4.5 4.5 0 0 0-4.5 4.5v2.3c0 .8-.3 1.6-.9 2.2L3.5 13.2c-.5.5-.1 1.3.6 1.3h11.8c.7 0 1.1-.8.6-1.3l-1.1-1.2a3 3 0 0 1-.9-2.2V7.5A4.5 4.5 0 0 0 10 3z" />
      <path d="M8.2 16.2a1.8 1.8 0 0 0 3.6 0" />
    </svg>
  );
}

export function IconGeofence(props) {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" {...common} {...props}>
      <path d="M10 16.2S14.7 11.3 14.7 7.7a4.7 4.7 0 1 0-9.4 0c0 3.6 4.7 8.5 4.7 8.5z" />
      <circle cx="10" cy="7.7" r="1.6" />
      <circle cx="10" cy="12.5" r="6" strokeDasharray="1.6 1.8" />
    </svg>
  );
}

export function IconAudit(props) {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" {...common} {...props}>
      <path d="M5.5 3h7l2 2v11a1 1 0 0 1-1 1h-8a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
      <path d="M6.8 8.2l1.2 1.2 2.2-2.4M6.8 12.6l1.2 1.2 2.2-2.4" />
      <path d="M12.3 8.6h1M12.3 13h1" />
    </svg>
  );
}

export function IconTrigger(props) {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" {...common} {...props}>
      <path d="M11 2.5L4.5 11.3h4.2l-.9 6.2 6.7-9h-4.3l.8-6z" />
    </svg>
  );
}

// ----------------------------------------------------------------------------
// Service / automotive icon set -- rounded line, consistent stroke weight.
// Used wherever a request or service-catalog row needs to show what kind of
// job it is: the Live Map markers, the Requests table, and the Pricing page.
// ----------------------------------------------------------------------------

export function IconTire(props) {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" {...common} {...props}>
      <circle cx="10" cy="10" r="7" />
      <circle cx="10" cy="10" r="2.4" />
      <path d="M10 3v2.2M10 14.8V17M3 10h2.2M14.8 10H17M5.5 5.5l1.5 1.5M13 13l1.5 1.5M14.5 5.5L13 7M7 13l-1.5 1.5" />
    </svg>
  );
}

export function IconBattery(props) {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" {...common} {...props}>
      <rect x="3" y="6" width="14" height="10" rx="1.5" />
      <path d="M7 6V4.3M13 6V4.3" />
      <path d="M11.2 9l-2.6 3.1h2.3l-2.1 2.9" />
    </svg>
  );
}

export function IconFuel(props) {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" {...common} {...props}>
      <path d="M4 17V5.6A1.6 1.6 0 0 1 5.6 4h3.3A1.6 1.6 0 0 1 10.5 5.6V17" />
      <path d="M3.3 17h7.9" />
      <path d="M6.6 4V2.5" />
      <path d="M10.5 8h1.7c.9 0 1.7.8 1.7 1.7V14a1.3 1.3 0 0 0 1.3 1.3" />
    </svg>
  );
}

export function IconTowTruck(props) {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" {...common} {...props}>
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

export function IconWrench(props) {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" {...common} {...props}>
      <path d="M12.6 3.4a3 3 0 1 0-3.9 3.9L3.3 12.7l2 2 5.4-5.4a3 3 0 0 0 3.9-3.9l-1.7 1.7-1.4-.4-.4-1.4 1.5-1.5z" />
    </svg>
  );
}

export function IconKey(props) {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" {...common} {...props}>
      <circle cx="6.2" cy="6.2" r="3.2" />
      <path d="M8.5 8.5L16 16" />
      <path d="M13.2 13.2l1.6-1.6M15.1 15.1l1.6-1.6" />
    </svg>
  );
}

export function IconSiren(props) {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" {...common} {...props}>
      <path d="M5 11.2a5 5 0 0 1 10 0v2.8H5v-2.8z" />
      <path d="M3.2 17h13.6" />
      <path d="M10 4V2.3" />
      <path d="M6.3 5.3L5.1 4M13.7 5.3L14.9 4" />
    </svg>
  );
}

/** Maps the ServiceType.icon keys seeded on the backend to a component. */
export const SERVICE_ICON_COMPONENTS = {
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

/**
 * Raw inner-SVG markup (no outer <svg> tag) for the same glyphs, kept in
 * sync with the components above by hand. Leaflet's divIcon only accepts an
 * HTML string, not React elements, so map markers build their icon this way.
 */
export const SERVICE_ICON_GLYPHS = {
  siren: '<path d="M5 11.2a5 5 0 0 1 10 0v2.8H5v-2.8z"/><path d="M3.2 17h13.6"/><path d="M10 4V2.3"/><path d="M6.3 5.3L5.1 4M13.7 5.3L14.9 4"/>',
  wrench: '<path d="M12.6 3.4a3 3 0 1 0-3.9 3.9L3.3 12.7l2 2 5.4-5.4a3 3 0 0 0 3.9-3.9l-1.7 1.7-1.4-.4-.4-1.4 1.5-1.5z"/>',
  battery: '<rect x="3" y="6" width="14" height="10" rx="1.5"/><path d="M7 6V4.3M13 6V4.3"/><path d="M11.2 9l-2.6 3.1h2.3l-2.1 2.9"/>',
  'battery-charging': '<rect x="3" y="6" width="14" height="10" rx="1.5"/><path d="M7 6V4.3M13 6V4.3"/><path d="M11.2 9l-2.6 3.1h2.3l-2.1 2.9"/>',
  fuel: '<path d="M4 17V5.6A1.6 1.6 0 0 1 5.6 4h3.3A1.6 1.6 0 0 1 10.5 5.6V17"/><path d="M3.3 17h7.9"/><path d="M6.6 4V2.5"/><path d="M10.5 8h1.7c.9 0 1.7.8 1.7 1.7V14a1.3 1.3 0 0 0 1.3 1.3"/>',
  tire: '<circle cx="10" cy="10" r="7"/><circle cx="10" cy="10" r="2.4"/><path d="M10 3v2.2M10 14.8V17M3 10h2.2M14.8 10H17M5.5 5.5l1.5 1.5M13 13l1.5 1.5M14.5 5.5L13 7M7 13l-1.5 1.5"/>',
  'tow-flatbed': '<path d="M2 13.5V8a1 1 0 0 1 1-1h6.5v6.5"/><path d="M9.5 7.5H13c.4 0 .7.2.9.6L15 11h2a1 1 0 0 1 1 1v1.5"/><path d="M11.2 7.5V5a1 1 0 0 1 1-1h1"/><circle cx="13.4" cy="3.7" r="1"/><circle cx="5.5" cy="15.2" r="1.7"/><circle cx="14.5" cy="15.2" r="1.7"/><path d="M2 13.5h1.8M16.5 13.5h1.5"/>',
  'tow-crane': '<path d="M2 13.5V8a1 1 0 0 1 1-1h6.5v6.5"/><path d="M9.5 7.5H13c.4 0 .7.2.9.6L15 11h2a1 1 0 0 1 1 1v1.5"/><path d="M11.2 7.5V5a1 1 0 0 1 1-1h1"/><circle cx="13.4" cy="3.7" r="1"/><circle cx="5.5" cy="15.2" r="1.7"/><circle cx="14.5" cy="15.2" r="1.7"/><path d="M2 13.5h1.8M16.5 13.5h1.5"/>',
  key: '<circle cx="6.2" cy="6.2" r="3.2"/><path d="M8.5 8.5L16 16"/><path d="M13.2 13.2l1.6-1.6M15.1 15.1l1.6-1.6"/>',
};

export function serviceIconSvg(iconKey, { color = 'currentColor', size = 16 } = {}) {
  const glyph = SERVICE_ICON_GLYPHS[iconKey] || SERVICE_ICON_GLYPHS.wrench;
  return `<svg viewBox="0 0 20 20" width="${size}" height="${size}" fill="none" stroke="${color}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${glyph}</svg>`;
}
