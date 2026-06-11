export interface PublicArtist {
  slug: string
  name: string
  role: string
}

export const PUBLIC_ARTISTS: PublicArtist[] = [
  { slug: 'maalin', name: 'MAALIN', role: 'DJ / Producer' },
  { slug: 'dr-green', name: 'DR. GREEN', role: 'DJ / Producer' },
  { slug: 'sonal', name: 'SONAL', role: 'DJ / Producer' },
  { slug: 'imthxd', name: 'IMTHXD', role: 'DJ / Producer' },
  { slug: 'the-professor', name: 'THE PROFESSOR', role: 'DJ / Producer' },
  { slug: 'anush', name: 'ANUSH', role: 'DJ / Producer' },
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
