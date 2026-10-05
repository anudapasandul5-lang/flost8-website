import { describe, expect, it } from 'vitest'
import { getPublicArtistBySlug } from './artistRoster'
import { MUSIC_ARTIST_SLUGS, RELEASES, coverStrip, releasesFor } from './releases'

describe('RELEASES', () => {
  it('has unique ids and urls', () => {
    expect(new Set(RELEASES.map((r) => r.id)).size).toBe(RELEASES.length)
    expect(new Set(RELEASES.map((r) => r.url)).size).toBe(RELEASES.length)
  })

  it('is sorted newest first', () => {
    const dates = RELEASES.map((r) => r.date)
    expect(dates).toEqual([...dates].sort().reverse())
  })

  it('gives every release a playable source on the right host', () => {
    for (const r of RELEASES) {
      const host = new URL(r.audio.url).hostname
      if (r.audio.kind === 'mp3') expect(host).toBe('geo-samples.beatport.com')
      else expect(host).toBe('soundcloud.com')
      expect(r.cover).toMatch(/^https:\/\//)
      expect(r.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  })

  it('only credits artists that exist on the roster', () => {
    for (const r of RELEASES) {
      expect(r.artistSlugs.length).toBeGreaterThan(0)
      for (const s of r.artistSlugs) expect(getPublicArtistBySlug(s), `${r.title}: ${s}`).toBeDefined()
    }
  })

  it('keeps a Beatport buy link when SoundCloud plays the full track', () => {
    const haze = RELEASES.find((r) => r.title === 'Haze')
    expect(haze?.audio.kind).toBe('soundcloud')
    expect(haze?.buyUrl).toContain('beatport.com/track/')
  })

  it('tags unofficial remixes as SoundCloud-only', () => {
    const unofficial = RELEASES.filter((r) => r.unofficial)
    expect(unofficial.length).toBe(3)
    for (const r of unofficial) {
      expect(r.buyUrl).toBeUndefined()
      expect(r.audio.kind).toBe('soundcloud')
    }
  })

  it('lists both artists for the page', () => {
    expect(MUSIC_ARTIST_SLUGS).toEqual(['dr-green', 'anush'])
  })
})

describe('coverStrip', () => {
  it('skips the latest rows and repeats no cover', () => {
    const list = releasesFor('dr-green')
    const strip = coverStrip(list, 5, 6)
    const latest = new Set(list.slice(0, 5).map((r) => r.cover))
    expect(strip.length).toBe(6)
    expect(new Set(strip.map((r) => r.cover)).size).toBe(6)
    for (const r of strip) expect(latest.has(r.cover)).toBe(false)
  })
})
