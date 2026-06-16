export type MusicLink =
  | { type: 'youtube'; url: string; title?: string }
  | { type: 'soundcloud'; url: string; title?: string }

export interface PublicArtist {
  slug: string
  name: string
  role: string
  realName?: string
  tagline?: string
  genre?: string
  instagram?: { handle?: string; followers?: string }
  music?: MusicLink[]
  gigs?: string[]
  bio?: string
}

export const PUBLIC_ARTISTS: PublicArtist[] = [
  {
    slug: 'dr-green',
    name: 'DR. GREEN',
    role: 'DJ / Producer',
    realName: 'Daniel Claessen',
    tagline: 'Groove Engineer',
    genre: 'Progressive House',
    instagram: { handle: 'dr_green_sl', followers: '12K' },
    music: [
      { type: 'youtube', url: 'https://www.youtube.com/watch?v=mIzxpKdVS7g' },
      { type: 'youtube', url: 'https://www.youtube.com/watch?v=jPFlSMzOJEI&t=789s' },
      { type: 'youtube', url: 'https://www.youtube.com/watch?v=ZP14TK60BIs&t=3297s' },
    ],
    gigs: ['Soundgarden Festival', 'Dr Green & Friends', 'International Tours'],
    bio: 'Hailing from the beautiful island of Sri Lanka, Dr. Green is a DJ and producer who has been making waves in the electronic music scene. With a distinct taste for progressive house, deep house, and melodic techno, his track productions are a true reflection of his personal style.',
  },
  {
    slug: 'maalin',
    name: 'MAALIN',
    role: 'DJ / Producer',
    realName: 'Dev Maalin',
    tagline: 'CrowdHyper',
    genre: 'Progressive House',
    instagram: { handle: 'maalin.ofc', followers: '1K' },
    music: [
      {
        type: 'soundcloud',
        url: 'https://soundcloud.com/user-25002526/maalin-audiosolo-set-wav?si=474d7dea853042e98df400dfbe3e9135&utm_source=clipboard&utm_medium=text&utm_campaign=social_sharing',
      },
    ],
    gigs: ['AGRA Festival', 'AudioSolo', 'Nexgen'],
  },
  {
    slug: 'sonal',
    name: 'SONAL',
    role: 'DJ / Producer',
    realName: 'Sonal Kodikara',
    tagline: 'Powerhouse',
    genre: 'Progressive House',
    instagram: { handle: 'sonal.musicc', followers: '2K' },
    music: [{ type: 'youtube', url: 'https://www.youtube.com/watch?v=Bou6t7w7SXE&t=12s' }],
    gigs: ['Pirates', 'AGRA Festival', 'Ilovebrunch', 'ORIX'],
  },
  {
    slug: 'imthxd',
    name: 'IMTHXD',
    role: 'DJ / Producer',
    realName: 'Imthad Intikab',
    tagline: 'AllRounder',
    genre: 'Progressive House',
    instagram: { handle: 'imthxdtf', followers: '1K' },
    music: [
      {
        type: 'soundcloud',
        url: 'https://soundcloud.com/imthad-intikab/imthxd-live-at-arcane-one-more?si=4ddcefa0d2d744e9aee2904d4ea35d03&utm_source=clipboard&utm_medium=text&utm_campaign=social_sharing',
      },
    ],
    gigs: ['AudioSolo', 'Balance Festival Day2', 'Ocean Drive'],
  },
  {
    slug: 'the-professor',
    name: 'THE PROFESSOR',
    role: 'DJ / Producer',
    realName: 'Rusith Tharuka',
    tagline: 'Groovinator',
    genre: 'Progressive House',
    instagram: { handle: 'professor_music._', followers: '1K' },
    gigs: ['ILoveBrunch', 'Soundgarden AfterParty'],
  },
  {
    slug: 'anush',
    name: 'ANUSH',
    role: 'DJ / Producer',
    realName: 'Anushka Nilupul',
    tagline: 'Vinyl Master',
    genre: 'Progressive House',
    instagram: { handle: 'anush.music_', followers: '1.3K' },
    music: [
      { type: 'youtube', url: 'https://www.youtube.com/watch?v=gahOpfpJZkQ' },
      { type: 'youtube', url: 'https://www.youtube.com/watch?v=ecAFSbPQ-rk' },
    ],
    gigs: ['ILoveBrunch', 'Soundgarden AfterParty'],
    bio: 'ANUSH is a Sri Lanka based Electronic Music DJ/Producer whose journey in music began in 2015. In 2024, he stepped into music production, focusing mainly on Progressive House while also exploring the deeper and melodic sounds of Organic House. With a passion for underground electronic music, ANUSH continues to shape his sound through emotional melodies, driving grooves, and atmospheric rhythms, creating unique musical experiences both as a producer and DJ.',
  },
]

export const BOOKING_ARTIST_OPTIONS = [
  { value: 'any', label: 'Any FLOST8 artist' },
  ...PUBLIC_ARTISTS.map((artist) => ({
    value: artist.slug,
    label: artist.name,
  })),
]

export function getPublicArtistBySlug(slug: string): PublicArtist | undefined {
  return PUBLIC_ARTISTS.find((artist) => artist.slug === slug)
}
