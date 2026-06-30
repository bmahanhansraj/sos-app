// Brand palette (SoS - Services On Site), dark "operational tool" theme.
// Midnight Black is a literal brand color, so the dark background here is
// on-brand, not just a stylistic choice. Safety Yellow is the partner app's
// primary accent (online toggle, accept actions) since it reads as "go" in
// this constrained five-color system; Primary Red is reserved for SOS jobs
// and problem states. App UI typeface is Inter throughout, per brand
// guidelines, shared with the customer app.

export const colors = {
  background: '#121212', // Midnight Black
  surface: '#1A1A1A',    // derived neutral, one step up for elevation
  surfaceRaised: '#242424', // derived neutral
  border: '#2E2E2E',        // derived neutral

  textPrimary: '#FFFFFF', // White
  textSecondary: '#9C9C9C', // derived neutral
  textOnAccent: '#121212',  // Midnight Black -- used as text on bright accent buttons

  accent: '#FFC107',     // Safety Yellow -- primary CTA / "go" actions
  accentDeep: '#C79100', // derived deeper yellow, pressed state
  accentSoft: '#3A2C10', // derived dark yellow tint, card backgrounds

  online: '#FFC107',     // alias: "online" reuses the brand accent (no green in palette)
  onlineSoft: '#3A2C10',
  offline: '#9C9C9C',

  sos: '#E53935',     // Primary Red
  sosSoft: '#3A1A1A', // derived dark red tint

  warning: '#FFC107',
  warningSoft: '#3A2C10',
};

export const statusColor = {
  REQUESTED: colors.textSecondary,
  ASSIGNED: colors.accent,
  EN_ROUTE: colors.accent,
  ARRIVED: colors.accent,
  IN_PROGRESS: colors.accent,
  COMPLETED: colors.textPrimary,
  CANCELLED: colors.sos,
  NO_PARTNER_FOUND: colors.sos,
};

export const fonts = {
  display: 'Inter_700Bold',
  displayBold: 'Inter_700Bold',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemiBold: 'Inter_600SemiBold',
  mono: 'Inter_500Medium',
};

export const spacing = (n) => n * 4;

export const radius = {
  sm: 8,
  md: 14,
  lg: 20,
  pill: 999,
};
