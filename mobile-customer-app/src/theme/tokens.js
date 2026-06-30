// Brand palette (SoS - Services On Site): Primary Red, Midnight Black,
// Safety Yellow, White, Light Grey. Primary Red doubles as both the main
// call-to-action color and the SOS/emergency color -- which fits, since
// the brand itself is literally named after the emergency signal. Safety
// Yellow is the secondary highlight (ratings, "in motion" status states).
// App UI typeface is Inter throughout, per brand guidelines.

export const colors = {
  background: '#F5F5F5', // Light Grey
  surface: '#FFFFFF',    // White
  surfaceMuted: '#ECECEC', // derived light neutral
  border: '#E0E0E0',       // derived light neutral

  textPrimary: '#121212', // Midnight Black
  textSecondary: '#6E6E6E', // derived neutral
  textOnAccent: '#FFFFFF',

  accent: '#E53935',     // Primary Red -- primary CTAs and the SOS button
  accentDeep: '#C62828', // derived deeper red, pressed state
  accentSoft: '#FBE0DF', // derived light red tint, card backgrounds

  highlight: '#FFC107',     // Safety Yellow -- secondary accent / "in motion"
  highlightSoft: '#FFF3CD', // derived light yellow tint
  highlightDeep: '#8A6500', // derived deep yellow, text-on-light-yellow

  sos: '#E53935',     // same as accent -- kept as a separate name for intent
  sosSoft: '#FBE0DF',

  warning: '#8A6500',
};

// Three-tier status semantics, kept consistent across every SoS surface:
// Safety Yellow for anything active/in-motion, Primary Red for anything
// stopped or wrong, and Midnight Black (neutral, calm) for resolved states
// -- there's no green in the brand palette, so "done" reads as settled
// rather than as a success color.
export const statusColor = {
  REQUESTED: colors.textSecondary,
  ASSIGNED: colors.highlightDeep,
  EN_ROUTE: colors.highlightDeep,
  ARRIVED: colors.highlightDeep,
  IN_PROGRESS: colors.highlightDeep,
  COMPLETED: colors.textPrimary,
  CANCELLED: colors.sos,
  NO_PARTNER_FOUND: colors.sos,
};

export const statusLabel = {
  REQUESTED: 'Finding a partner',
  ASSIGNED: 'Partner assigned',
  EN_ROUTE: 'On the way',
  ARRIVED: 'Partner has arrived',
  IN_PROGRESS: 'Work in progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  NO_PARTNER_FOUND: 'No partner available',
};

export const fonts = {
  display: 'Inter_700Bold',
  displayMedium: 'Inter_600SemiBold',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemiBold: 'Inter_600SemiBold',
};

export const spacing = (n) => n * 4;

export const radius = {
  sm: 8,
  md: 14,
  lg: 20,
  pill: 999,
};
