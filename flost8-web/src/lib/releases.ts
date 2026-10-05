import generated from './releases.generated.json'

// Original releases by FLOST8 artists, newest first. Two sources, merged here:
//  - Beatport: src/lib/releases.generated.json, rebuilt by `npm run releases:sync`
//    (2-minute preview MP3 + a buy link).
//  - SoundCloud: hand-written below. A track on both plays in full from SoundCloud and
//    keeps its Beatport page as the buy link; unofficial remixes are SoundCloud only.

export type ReleaseAudio =
  | { kind: 'mp3'; url: string } // Beatport 2-min preview
  | { kind: 'soundcloud'; url: string } // full track, hidden widget

export type Release = {
  id: string
  title: string
  mix: string
  /** Credited artists on the record, not necessarily ours (we may have remixed it). */
  artists: string[]
  label: string
  /** ISO date, YYYY-MM-DD. */
  date: string
  cover: string
  /** Roster slugs (src/lib/artistRoster.ts) of our artists who made it. */
  artistSlugs: string[]
  unofficial?: boolean
  audio: ReleaseAudio
  /** Where "open" goes: SoundCloud when that plays, otherwise Beatport. */
  url: string
  /** Beatport page, set when it is a purchasable release. */
  buyUrl?: string
}

// Beatport track id -> the SoundCloud upload that plays instead of the preview.
const SOUNDCLOUD_FULL: Record<string, string> = {
  '28440685': 'https://soundcloud.com/balkan-connection/anush-d-mice-depth-09-original', // Depth 09
  '28806284': 'https://soundcloud.com/ah-digital-1/anush-static-dreams-ah-digital-compilations-2', // Static Dreams
  '30377695': 'https://soundcloud.com/routineespresso/d-mice-anush-haze-1', // Haze
}

const UNOFFICIAL_REMIXES: Release[] = [
  {
    id: 'sc-embers',
    title: 'Embers',
    mix: 'Unofficial Remix',
    artists: ['CamelPhat', 'Shimza', 'Julia Church'],
    label: 'SoundCloud',
    date: '2026-05-23',
    cover: 'https://i1.sndcdn.com/artworks-IoseQzC5uS0UJARK-jlnWwQ-t500x500.jpg',
    artistSlugs: ['anush'],
    unofficial: true,
    audio: { kind: 'soundcloud', url: 'https://soundcloud.com/deejanush/camelphat-shimza-julia-church' },
    url: 'https://soundcloud.com/deejanush/camelphat-shimza-julia-church',
  },
  {
    id: 'sc-vaseegara',
    title: 'Vaseegara',
    mix: 'Unofficial Remix',
    artists: ['Anush', 'MIRΛGΞ'],
    label: 'SoundCloud',
    date: '2026-03-24',
    cover: 'https://i1.sndcdn.com/artworks-z7zgRyATt2kLYsyp-0P7v1Q-t500x500.jpg',
    artistSlugs: ['anush'],
    unofficial: true,
    audio: { kind: 'soundcloud', url: 'https://soundcloud.com/deejanush/anush-x-mirlgx-vaseegara' },
    url: 'https://soundcloud.com/deejanush/anush-x-mirlgx-vaseegara',
  },
  {
    id: 'sc-cheri-cheri-lady',
    title: 'Cheri Cheri Lady',
    mix: 'Unofficial Remix',
    artists: ['Modern Talking'],
    label: 'SoundCloud',
    date: '2025-09-04',
    cover: 'https://i1.sndcdn.com/artworks-ucvsbQpXulRxZnm6-br8Zgw-t500x500.jpg',
    artistSlugs: ['anush'],
    unofficial: true,
    audio: {
      kind: 'soundcloud',
      url: 'https://soundcloud.com/deejanush/modern-talking-cheri-cheri-lady-anush-x-mirg-unofficial-remix',
    },
    url: 'https://soundcloud.com/deejanush/modern-talking-cheri-cheri-lady-anush-x-mirg-unofficial-remix',
  },
]

const fromBeatport: Release[] = generated.map((g) => {
  const full = SOUNDCLOUD_FULL[g.id]
  return {
    id: g.id,
    title: g.title,
    mix: g.mix,
    artists: g.artists,
    label: g.label,
    date: g.date,
    cover: g.cover,
    artistSlugs: g.artistSlugs,
    audio: full ? { kind: 'soundcloud', url: full } : { kind: 'mp3', url: g.sampleUrl },
    url: full ?? g.url,
    buyUrl: g.url,
  }
})

export const RELEASES: Release[] = [...fromBeatport, ...UNOFFICIAL_REMIXES].sort(
  (a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id),
)

export const releasesFor = (slug: string): Release[] => RELEASES.filter((r) => r.artistSlugs.includes(slug))

/** Slugs that have at least one release, in the order the page lists them. */
export const MUSIC_ARTIST_SLUGS = ['dr-green', 'anush'].filter((s) => releasesFor(s).length > 0)

export const releaseYear = (r: Release): string => r.date.slice(0, 4)

/** Covers for the "Releases" strip: the next `n` distinct covers after the latest rows. */
export function coverStrip(list: Release[], skip: number, n: number): Release[] {
  const seen = new Set(list.slice(0, skip).map((r) => r.cover))
  const out: Release[] = []
  for (const r of list.slice(skip)) {
    if (seen.has(r.cover)) continue
    seen.add(r.cover)
    out.push(r)
    if (out.length === n) break
  }
  return out
}
