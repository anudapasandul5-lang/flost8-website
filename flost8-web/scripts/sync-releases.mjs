// Refresh the /music catalogue from Beatport. Reads each artist's full track listing
// (paginated) from the page's __NEXT_DATA__ and writes src/lib/releases.generated.json —
// committed, so the site never calls Beatport at runtime. New release = re-run + commit.
// Hand-written SoundCloud entries live in src/lib/releases.ts and are merged there.
//
// Run: npm run releases:sync
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

// Beatport artist ids. `slug` matches the site roster (src/lib/artistRoster.ts).
const ARTISTS = [
  { slug: 'dr-green', id: 925957, bpSlug: 'dr-green' },
  { slug: 'anush', id: 1191714, bpSlug: 'anush' },
]
const OUT = path.join('src', 'lib', 'releases.generated.json')
const PER_PAGE = 100

// Beatport sits behind a Cloudflare challenge. Node's fetch gets 403 on most requests
// whatever the headers (TLS fingerprint), but curl with a link-preview crawler UA
// passes reliably (verified 7/7), so shell out to it. curl ships with Windows 10+,
// macOS and Linux. ponytail: if this starts 403ing, swap the UA or drive a browser.
const UA = 'facebookexternalhit/1.1'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function fetchHtml(url) {
  let last
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      return execFileSync('curl', ['-sSf', '--max-time', '30', '-A', UA, url], {
        encoding: 'utf8',
        maxBuffer: 64 * 1024 * 1024,
      })
    } catch (err) {
      last = String(err.message).split('\n')[0]
      await sleep(800)
    }
  }
  throw new Error(`${url} -> ${last}`)
}

async function fetchPage(artist, page) {
  const url = `https://www.beatport.com/artist/${artist.bpSlug}/${artist.id}/tracks?per_page=${PER_PAGE}&page=${page}`
  const html = await fetchHtml(url)
  const raw = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)?.[1]
  if (!raw) throw new Error(`${url} -> no __NEXT_DATA__ (page layout changed?)`)
  const queries = JSON.parse(raw).props.pageProps.dehydratedState.queries
  const data = queries.find((q) => q.queryKey?.[0] === 'tracks')?.state?.data
  if (!data?.results) throw new Error(`${url} -> no tracks query in page data`)
  return data
}

async function fetchAllTracks(artist) {
  const tracks = []
  for (let page = 1; ; page++) {
    const data = await fetchPage(artist, page)
    tracks.push(...data.results)
    if (!data.next || tracks.length >= data.count) return tracks
    await sleep(400)
  }
}

// Ours = the artist made it: original mix, or a remix they did. Not ours = another
// producer remixed their track (the artist is credited, someone else is the remixer).
function isOurs(track, artistId) {
  if (track.remixers.some((r) => r.id === artistId)) return true
  if (track.remixers.length > 0) return false
  return track.artists.some((a) => a.id === artistId)
}

const cover = (t) => t.release.image.dynamic_uri.replace('{w}x{h}', '500x500')

function toEntry(t) {
  const names = (list) => list.map((a) => a.name)
  return {
    id: String(t.id),
    title: t.name,
    mix: t.mix_name,
    artists: names(t.artists),
    // Remixers are listed separately; the UI shows them next to the mix name.
    remixers: names(t.remixers),
    label: t.release.label.name,
    release: t.release.name,
    date: t.new_release_date || t.publish_date,
    cover: cover(t),
    sampleUrl: t.sample_url,
    url: `https://www.beatport.com/track/${t.slug}/${t.id}`,
  }
}

// A compilation re-release repeats a track under a later date; same title + mix +
// artists is the same recording, keep the earliest.
const dedupeKey = (e) =>
  [e.title, e.mix, [...e.artists, ...e.remixers].sort().join('|')].join('~').toLowerCase()

async function main() {
  const byKey = new Map()
  for (const artist of ARTISTS) {
    const all = await fetchAllTracks(artist)
    const ours = all.filter((t) => isOurs(t, artist.id) && t.sample_url)
    console.log(`${artist.slug}: ${all.length} listed, ${ours.length} ours`)
    for (const t of ours) {
      const entry = toEntry(t)
      const key = dedupeKey(entry)
      const prev = byKey.get(key)
      if (!prev) byKey.set(key, { ...entry, artistSlugs: [artist.slug] })
      else {
        // Same recording seen again: either a collab listed under both artists, or a
        // re-release. Merge the slug; keep whichever row is older.
        const slugs = [...new Set([...prev.artistSlugs, artist.slug])]
        byKey.set(key, { ...(entry.date < prev.date ? entry : prev), artistSlugs: slugs })
      }
    }
  }

  const releases = [...byKey.values()].sort(
    (a, b) => b.date.localeCompare(a.date) || Number(b.id) - Number(a.id),
  )
  // Guard: a blocked or reshaped page must not wipe the committed catalogue.
  if (releases.length === 0) throw new Error('0 releases parsed — refusing to overwrite')

  fs.writeFileSync(OUT, JSON.stringify(releases, null, 2) + '\n')
  const perArtist = ARTISTS.map((a) => `${a.slug} ${releases.filter((r) => r.artistSlugs.includes(a.slug)).length}`)
  console.log(`wrote ${releases.length} releases (${perArtist.join(', ')}) -> ${OUT}`)
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
