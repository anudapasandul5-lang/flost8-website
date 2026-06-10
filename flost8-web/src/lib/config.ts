import { PUBLIC_ARTISTS } from './artistRoster'

export const BOOKING_API_URL = '/api/script';
export const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY ?? '';
export const CONTACT_EMAIL = 'bookings@flost8.lk';
export const DOMAIN = 'flost8.lk';

// Attitude-word metrics — punchy, all-caps, semantic to label
export const METRICS = {
  bookingsDriven:    'LOUD',
  activePartners:    'PACKED',
  citiesReached:     'SOLD OUT',
  monthlyReach:      'EVERY ROOM',
} as const;

export const ARTISTS = PUBLIC_ARTISTS;

export const NAV_LINKS = [
  { label: 'Roster',  href: '/#roster' },
  { label: 'Shows',   href: '/#shows' },
  { label: 'Book',    href: '/bookings' },
  { label: 'About',   href: '/#about' },
] as const;
