import { PUBLIC_ARTISTS } from './artistRoster'

export const BOOKING_API_URL = '/api/script';
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

export const ARTISTS = PUBLIC_ARTISTS;

export const NAV_LINKS = [
  { label: 'Roster',  href: '/#roster' },
  { label: 'Shows',   href: '/#shows' },
  { label: 'Book',    href: '/bookings' },
  { label: 'About',   href: '/#about' },
] as const;
