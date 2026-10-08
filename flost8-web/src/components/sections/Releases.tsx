import { useState, type CSSProperties, type KeyboardEvent } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, CaretDown, Pause, Play } from '@phosphor-icons/react'
import EyebrowRule from '../ui/EyebrowRule'
import { getPublicArtistBySlug } from '../../lib/artistRoster'
import { MUSIC_ARTIST_SLUGS, coverStrip, releaseYear, releasesFor, type Release } from '../../lib/releases'
import { scEmbed, useReleasePlayer, useTrackPosition, type ReleasePlayer } from '../../hooks/useReleasePlayer'

const LATEST_ROWS = 5
const STRIP_COVERS = 6
const PAGE_SIZE = 10

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
// "DR. GREEN" -> "Dr Green"
const firstName = (name: string) =>
  name.replace(/\./g, '').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())

/** Cover art that falls back to the artist's portrait if the CDN image fails. */
function Cover({ src, slug, className }: { src: string; slug: string; className: string }) {
  const [failedSrc, setFailedSrc] = useState<string>()
  return (
    <img
      src={failedSrc === src ? `/photos/${slug}.webp` : src}
      alt=""
      referrerPolicy="no-referrer"
      decoding="async"
      onError={() => setFailedSrc(src)}
      className={className}
    />
  )
}

function Progress({ player, kind }: { player: ReleasePlayer; kind: Release['audio']['kind'] }) {
  const { pos, dur } = useTrackPosition(player.progress)
  const pct = dur ? Math.min(100, (pos / dur) * 100) : 0
  return (
    <div className="flex items-center gap-3 font-grotesk text-xs tabular-nums text-[var(--ink-50)]">
      <span>{fmt(pos)}</span>
      <div className="relative h-1 flex-1 overflow-hidden rounded-full bg-white/10">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-accent transition-[width] duration-300 ease-linear"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span>{kind === 'mp3' ? 'Preview' : 'Full track'}</span>
    </div>
  )
}

function NowPlaying({ release, slug, player }: { release: Release; slug: string; player: ReleasePlayer }) {
  const playing = player.release?.id === release.id && player.playing
  return (
    <div className="flex flex-col gap-6">
      <div className={`grid items-center gap-6 sm:grid-cols-[minmax(0,240px)_minmax(0,1fr)] md:gap-10 ${playing ? 'is-playing' : ''}`}>
        <div className="relative aspect-square w-[62%] max-w-[240px] sm:w-full">
          <div className="vinyl" style={{ '--label': `url("${release.cover}")` } as CSSProperties} />
          <Cover
            src={release.cover}
            slug={slug}
            className="relative z-[1] h-full w-full rounded-xl object-cover shadow-[0_24px_60px_rgba(0,0,0,0.6)]"
          />
        </div>
        <div className="min-w-0 sm:pl-10">
          <p className="font-grotesk text-xs uppercase tracking-[0.18em] text-accent-ink">
            {playing ? 'Now playing' : player.release ? 'Paused' : 'Latest release'}
          </p>
          <h2 className="mt-2 font-display text-5xl leading-[0.9] text-ink md:text-6xl">{release.title}</h2>
          <p className="mt-2 font-grotesk text-sm text-[var(--ink-72)]">
            {release.mix}
            <br />
            {release.artists.join(', ')}
          </p>
          <p className="font-grotesk text-sm text-[var(--ink-50)]">
            {release.label}, {releaseYear(release)}
          </p>
          <div className="mt-5 flex items-center gap-3">
            <button
              type="button"
              onClick={() => player.toggle(release)}
              aria-label={`${playing ? 'Pause' : 'Play'} ${release.title}`}
              className="accent-press edge-refract grid size-14 place-items-center rounded-full bg-accent text-ink"
            >
              {playing ? <Pause size={24} weight="fill" /> : <Play size={24} weight="fill" />}
            </button>
            <a
              href={release.buyUrl ?? release.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[44px] items-center gap-1.5 font-grotesk text-sm text-[var(--ink-72)] transition-colors hover:text-ink"
            >
              {release.buyUrl ? 'Buy on Beatport' : 'Open on SoundCloud'}
              <ArrowUpRight size={16} weight="bold" />
            </a>
          </div>
        </div>
      </div>

      <Progress player={player} kind={release.audio.kind} />

      {/* Only if the browser refused to autoplay the hidden SoundCloud widget (iOS). */}
      {player.blocked && release.audio.kind === 'soundcloud' && (
        <iframe
          title={`${release.title} on SoundCloud`}
          src={scEmbed(release.audio.url)}
          allow="autoplay"
          className="h-[166px] w-full rounded-xl border-0"
        />
      )}
    </div>
  )
}

function TrackRow({
  release,
  number,
  active,
  playing,
  onClick,
}: {
  release: Release
  number: number
  active: boolean
  playing: boolean
  onClick: () => void
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        aria-label={`${active && playing ? 'Pause' : 'Play'} ${release.title}, ${release.mix}`}
        className={`grid min-h-[56px] w-full grid-cols-[1.75rem_44px_minmax(0,1fr)] items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors duration-150 hover:bg-white/[0.05] ${
          active ? 'bg-white/[0.08]' : ''
        }`}
      >
        <span className={`font-grotesk text-sm tabular-nums ${active ? 'text-ink' : 'text-[var(--ink-50)]'}`}>
          {active && playing ? (
            <span className="eq" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
          ) : (
            number
          )}
        </span>
        <Cover
          src={release.cover}
          slug={release.artistSlugs[0]}
          className="size-11 rounded-md object-cover"
        />
        <span className="min-w-0 font-grotesk">
          <span
            className={`block truncate text-[15px] font-medium transition-colors duration-150 ${
              active ? 'text-accent-ink' : 'text-ink'
            }`}
          >
            {release.title} <span className="font-normal text-[var(--ink-50)]">{release.mix}</span>
            {release.unofficial && (
              <span className="ml-1 rounded border border-white/25 px-1.5 py-px align-middle text-[10px] text-[var(--ink-72)]">
                Unofficial
              </span>
            )}
          </span>
          <span className="block truncate text-[13px] text-[var(--ink-72)]">
            {release.artists.join(', ')}
            <span className="text-[var(--ink-50)]"> · {release.label}</span>
          </span>
        </span>
      </button>
    </li>
  )
}

export default function Releases() {
  const player = useReleasePlayer()
  const [slug, setSlug] = useState(MUSIC_ARTIST_SLUGS[0] ?? '')
  const [showAll, setShowAll] = useState(false)
  const [visible, setVisible] = useState(PAGE_SIZE)

  const artist = getPublicArtistBySlug(slug)
  const list = releasesFor(slug)
  if (!artist || list.length === 0) return null

  const latest = list.slice(0, LATEST_ROWS)
  // Before anything is chosen the stage shows the newest release, paused.
  const shown = player.release ?? latest[0]
  const strip = coverStrip(list, LATEST_ROWS, STRIP_COVERS)
  const name = firstName(artist.name)

  const switchArtist = (next: string) => {
    if (next === slug) return
    player.stop() // switching artist stops playback and resets the stage to that artist's newest
    setSlug(next)
    setShowAll(false)
    setVisible(PAGE_SIZE)
  }

  const onTabKey = (e: KeyboardEvent, i: number) => {
    const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
    if (!step) return
    e.preventDefault()
    const next = MUSIC_ARTIST_SLUGS[(i + step + MUSIC_ARTIST_SLUGS.length) % MUSIC_ARTIST_SLUGS.length]
    switchArtist(next)
    document.getElementById(`music-tab-${next}`)?.focus()
  }

  const rowProps = (r: Release) => ({
    active: player.release?.id === r.id,
    playing: player.playing,
    onClick: () => player.toggle(r),
  })

  return (
    <section className="relative bg-base pb-24 pt-8 md:pt-12">
      <div className="mx-auto max-w-[1400px] px-4 md:px-10">
        <h1 className="sr-only">FLOST8 original music</h1>
        <p className="font-grotesk text-[13px] uppercase tracking-[0.25em] text-accent-ink">FLOST8 Music</p>
        <EyebrowRule />

        {/* The artist names are the switcher. */}
        <div role="tablist" aria-label="Artist" className="mt-4 flex flex-wrap items-baseline gap-x-6 md:gap-x-10">
          {MUSIC_ARTIST_SLUGS.map((s, i) => (
            <button
              key={s}
              id={`music-tab-${s}`}
              type="button"
              role="tab"
              aria-selected={s === slug}
              aria-controls="music-panel"
              tabIndex={s === slug ? 0 : -1}
              onClick={() => switchArtist(s)}
              onKeyDown={(e) => onTabKey(e, i)}
              className="name-tab font-display text-6xl leading-[0.9] md:text-8xl"
            >
              {getPublicArtistBySlug(s)?.name}
            </button>
          ))}
        </div>

        {/* Stage: one artist at a time. Only an artist switch remounts it (keyed by slug);
            track and play changes patch it in place. */}
        <div
          id="music-panel"
          role="tabpanel"
          aria-labelledby={`music-tab-${slug}`}
          className="music-stage edge-refract mt-6 overflow-hidden rounded-3xl md:mt-8"
        >
          <div key={slug} className="stage-in grid gap-3 p-3 md:p-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
            <div className="edge-refract photo-treat relative aspect-square overflow-hidden rounded-2xl bg-base-raise lg:aspect-[4/5] lg:self-start">
              <img
                src={`/photos/${slug}.webp`}
                alt={name}
                style={{ objectPosition: artist.focal ?? 'center' }}
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="pointer-events-none absolute inset-0 z-[3] bg-gradient-to-t from-base via-base/20 to-transparent" />
              <div className="absolute inset-x-5 bottom-5 z-[4] flex flex-wrap items-center gap-3 md:inset-x-7 md:bottom-7">
                <Link
                  to={`/bookings?artist=${slug}`}
                  className="accent-press edge-refract inline-flex min-h-[44px] items-center gap-2 rounded-full bg-accent px-5 py-3 font-grotesk text-sm font-medium text-ink"
                >
                  Book {name}
                  <ArrowUpRight size={16} weight="bold" />
                </Link>
                <Link
                  to={`/artist/${slug}`}
                  className="inline-flex min-h-[44px] items-center rounded-full border border-white/15 bg-base/50 px-4 py-3 font-grotesk text-sm text-ink backdrop-blur transition-colors hover:border-white/50"
                >
                  Artist page
                </Link>
              </div>
            </div>

            <div className="flex flex-col gap-6 p-2 md:p-6">
              <NowPlaying release={shown} slug={slug} player={player} />
              <div>
                <p className="px-2.5 font-grotesk text-xs uppercase tracking-[0.18em] text-[var(--ink-50)]">Latest</p>
                <ol className="mt-2">
                  {latest.map((r, i) => (
                    <TrackRow key={r.id} release={r} number={i + 1} {...rowProps(r)} />
                  ))}
                </ol>
              </div>
            </div>
          </div>
        </div>

        {/* Releases strip */}
        <div className="mt-12 flex items-end justify-between gap-4 md:mt-16">
          <h2 className="font-grotesk text-xl font-semibold text-ink md:text-2xl">Releases</h2>
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            aria-expanded={showAll}
            aria-controls="music-all-tracks"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-white/20 px-5 py-2.5 font-grotesk text-sm text-ink transition-colors hover:border-white/60"
          >
            All {list.length} tracks
            <CaretDown size={16} weight="bold" className={`transition-transform duration-200 ${showAll ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {strip.length > 0 && (
          <div className="no-scrollbar -mx-4 mt-5 flex snap-x scroll-pl-4 md:scroll-pl-0 gap-4 overflow-x-auto px-4 pb-6 pt-2 md:mx-0 md:px-0">
            {strip.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => player.toggle(r)}
                aria-label={`Play ${r.title}, ${r.mix}`}
                className="w-[42vw] shrink-0 snap-start text-left sm:w-[200px]"
              >
                <Cover src={r.cover} slug={slug} className="cover-lift aspect-square w-full rounded-xl object-cover" />
                <span className="mt-2.5 block truncate font-grotesk text-sm text-ink">{r.title}</span>
                <span className="block font-grotesk text-[13px] text-[var(--ink-50)]">{releaseYear(r)}</span>
              </button>
            ))}
          </div>
        )}

        {showAll && (
          <div id="music-all-tracks" className="stage-in mt-4 rounded-2xl bg-base-raise p-2 edge-refract md:p-3">
            <ol>
              {list.slice(0, visible).map((r, i) => (
                <TrackRow key={r.id} release={r} number={i + 1} {...rowProps(r)} />
              ))}
            </ol>
            {visible < list.length && (
              <button
                type="button"
                onClick={() => setVisible((v) => v + PAGE_SIZE)}
                className="mx-auto mt-3 flex min-h-[44px] items-center rounded-full border border-white/20 px-5 py-2.5 font-grotesk text-sm text-ink transition-colors hover:border-white/60"
              >
                Show more ({list.length - visible} left)
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
