export const APPS_SCRIPT_URL = import.meta.env.VITE_APPS_SCRIPT_URL ?? '';
export const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY ?? '';
export const CONTACT_EMAIL = 'bookings@flost8.lk';
export const DOMAIN = 'flost8.lk';

// Metric placeholders — update when real numbers are ready
export const METRICS = {
  bookingsDriven:    '00',
  activePartners:    '00',
  citiesReached:     '00',
  monthlyReach:      '00',
} as const;

export const ARTISTS = [
  { slug: 'maalin',         name: 'MAALIN',        role: 'DJ / Producer' },
  { slug: 'dr-green',       name: 'DR. GREEN',      role: 'DJ / Producer' },
  { slug: 'sonal',          name: 'SONAL',          role: 'DJ / Producer' },
  { slug: 'rakhil',         name: 'RAKHIL',         role: 'DJ / Producer' },
  { slug: 'the-professor',  name: 'THE PROFESSOR',  role: 'DJ / Producer' },
  { slug: 'anush',          name: 'ANUSH',          role: 'DJ / Producer' },
] as const;

export const NAV_LINKS = [
  { label: 'Roster',  href: '#roster' },
  { label: 'Shows',   href: '#shows' },
  { label: 'Book',    href: '/bookings' },
  { label: 'About',   href: '#about' },
] as const;
