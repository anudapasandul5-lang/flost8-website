import { PUBLIC_ARTISTS } from './artistRoster'

export const BOOKING_API_URL = '/api/script';
export const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY ?? '';
export const CONTACT_EMAIL = 'bookings@flost8.lk';
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
    line: 'Identity, sound, and stage presence shaped into a career — not a calendar of gigs.',
  },
  {
    no: '02',
    title: 'Booking System',
    line: 'One channel for venues, brands, and events to lock our roster, backed by a real calendar.',
  },
  {
    no: '03',
    title: 'Content Engine',
    line: 'Sets, reels, and visuals produced in-house so the work travels further than the room.',
  },
] as const;

export const NAV_LINKS = [
  { label: 'Roster',  href: '/#roster' },
  { label: 'Shows',   href: '/#shows' },
  { label: 'Book',    href: '/bookings' },
  { label: 'About',   href: '/#about' },
] as const;
