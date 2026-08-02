import { PUBLIC_ARTISTS } from './artistRoster'

export const BOOKING_API_URL = '/api/script';
export const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY ?? '';
export const CONTACT_EMAIL = 'bookings@flost8.lk';
export const ADMIN_EMAIL = 'admin@flost8.lk';

// Partner logos — rendered by the Partners section, counted by the Metrics section.
// Each slug maps to /logos/color/<slug>.jpg.
export const PARTNERS = [
  { slug: 'corso', name: 'Corso', url: 'https://www.instagram.com/corso.lk/' },
  { slug: 'a_logo', name: 'Astroid SL', url: 'https://astroidsl.com/' },
  { slug: 'vibe_mount', name: 'Vibe Mount', url: 'https://www.instagram.com/vibemount_/' },
  { slug: 'pixels_n_pints', name: 'Pixels n Pints', url: 'https://www.instagram.com/pixelsnpints.cmb/' },
  { slug: 'abstract_mark', name: 'Address.lk', url: 'https://www.addresshop.com/' },
  { slug: 'speedbay', name: 'Speedbay', url: 'https://www.instagram.com/speedbaylk/' },
  { slug: 'reignite', name: 'Reignite', url: 'https://www.reignitee.com/' },
  { slug: 'hype_bomb', name: 'Hype Bomb', url: 'https://www.instagram.com/drinkhypebam/' },
  { slug: 'spinner_energy_drink', name: 'Spinner Energy Drink', url: 'https://www.instagram.com/spinnerenergydrink/' },
  { slug: 'traveling_bruncher', name: 'The Traveling Bruncher', url: 'https://www.instagram.com/thetravelingbruncher/' },
  { slug: 'vocaine', name: 'Vocaine', url: 'https://vocaine.com/' },
  { slug: 'snack_entity', name: 'Snack Entity', url: 'https://snackentity.lk/' },
  { slug: 'calista', name: 'Calista', url: 'https://calistaclothing.com/' },
  { slug: 'sozo', name: 'SOZO', url: 'https://sozoiced.com/' },
  { slug: 'crepe_runner', name: 'Crepe Runner', url: 'https://creperunner.lk/' },
  { slug: 'oyster_colombo', name: 'Oyster Colombo', url: 'https://www.instagram.com/oyster_colombo/' },
  { slug: 'noir_luxe', name: 'Noir Luxe', url: 'https://www.instagram.com/noir.luxe.lk/' },
  { slug: 'slfd', name: 'Solitude', url: 'https://solitude.lk/' },
] as const;

// Impact metrics shown in the Stats section
export const METRICS = {
  bookingsDriven:    '30',
  activePartners:    String(PARTNERS.length), // tracks the grid — add a partner, the number follows
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
