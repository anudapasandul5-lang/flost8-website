import { PUBLIC_ARTISTS } from './artistRoster'

export const BOOKING_API_URL = '/api/script';
export const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY ?? '';
export const CONTACT_EMAIL = 'bookings@flost8.lk';
export const ADMIN_EMAIL = 'admin@flost8.lk';
export const DOMAIN = 'flost8.lk';

// Impact metrics shown in the Stats section
export const METRICS = {
  bookingsDriven:    '30',
  activePartners:    '24',
  citiesReached:     '12',
  contentProduced:   '40',
} as const;

export const ARTISTS = PUBLIC_ARTISTS;

// Services — shared by the hero teaser row and the Services section.
export const SERVICES = [
  {
    no: '01',
    title: 'Artist Development',
    line: 'Identity, sound, and stage presence shaped into a career.',
  },
  {
    no: '02',
    title: 'Booking System',
    line: 'One channel for venues, brands, and events to lock our roster, backed by a real calendar.',
  },
  {
    no: '03',
    title: 'Content Engine',
    line: 'Sets, visuals, and campaign content produced in-house so the work travels further than the room.',
  },
] as const;

export const NAV_LINKS = [
  { label: 'Roster',  href: '/#roster' },
  { label: 'What We Do',   href: '/#about' },
  { label: 'Shows',   href: '/#shows' },
  { label: 'Book',    href: '/bookings' },
] as const;
