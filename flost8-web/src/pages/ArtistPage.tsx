import { useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion, useScroll, useTransform } from 'framer-motion'
import { CaretLeft, InstagramLogo } from '@phosphor-icons/react'
import { getPublicArtistBySlug } from '../lib/artistRoster'
import MusicEmbed from '../components/artist/MusicEmbed'
import PlatformIcon from '../components/ui/PlatformIcon'
import { fadeUp, staggerParent } from '../lib/motion'
import { useMotionSafe } from '../hooks/useMotionSafe'

export default function ArtistPage() {
  const { slug } = useParams<{ slug: string }>()
  const heroRef = useRef<HTMLDivElement>(null)
  const { reduce } = useMotionSafe()
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] })
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.08])
  const y = useTransform(scrollYProgress, [0, 1], ['0%', '6%'])
  const artist = slug ? getPublicArtistBySlug(slug) : undefined

  // ALL hooks above — early return only after hooks
  if (!artist) {
    return (
      <main id="main-content" tabIndex={-1} className="bg-base min-h-[100dvh] grid place-items-center px-6 outline-none">
        <div className="text-center">
          <p className="font-display text-5xl text-ink md:text-7xl">Artist not found</p>
          <Link
            to="/#roster"
            className="accent-press mt-6 inline-flex min-h-[44px] items-center gap-2 rounded-full bg-accent px-6 py-3 font-grotesk text-sm text-ink"
          >
            Back to roster
          </Link>
        </div>
      </main>
    )
  }

  // Listen section shows YouTube videos only (SoundCloud/other embeds excluded)
  const youtubeMusic = artist.music?.filter((m) => m.type === 'youtube') ?? []
  const hasSingleTrack = youtubeMusic.length === 1

  return (
    <main id="main-content" tabIndex={-1} className="bg-base min-h-[100dvh] outline-none">
      <div className="mx-auto max-w-[1200px] px-6 md:px-10 pt-28 md:pt-32 pb-24">
        {/* BACK ROW */}
        <Link
          to="/#roster"
          className="inline-flex min-h-[44px] items-center gap-2 font-grotesk text-sm text-[var(--ink-72)] transition-colors hover:text-ink"
        >
          <CaretLeft size={16} weight="bold" />
          Back to roster
        </Link>

        {/* HERO */}
        <section
          ref={heroRef}
          className="mt-8 grid grid-cols-1 items-center gap-8 md:grid-cols-2 md:gap-12"
        >
          {/* PORTRAIT — first in DOM, stacks on top on mobile */}
          <div className="relative overflow-hidden rounded-2xl edge-refract aspect-[3/4] w-full max-w-[480px] photo-treat">
            <motion.div
              className="h-full w-full"
              style={reduce ? undefined : { scale, y }}
            >
              <img
                src={`/photos/${artist.slug}.webp`}
                alt={artist.name}
                loading="lazy"
                decoding="async"
                className="grade-portrait is-active h-full w-full object-cover"
                onError={(e) => {
                  const el = e.currentTarget;
                  el.style.display = 'none';
                  const wrapper = el.closest('.photo-treat') as HTMLElement | null;
                  if (wrapper) wrapper.style.backgroundColor = '#1B0F24';
                }}
              />
            </motion.div>
            {/* Hero scrim: stronger bottom gradient to anchor low-res photos compositionally */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3"
              style={{
                background: 'linear-gradient(to top, rgba(18,9,23,0.55) 0%, transparent 100%)',
                zIndex: 3,
              }}
            />
          </div>

          {/* IDENTITY */}
          <motion.div
            variants={staggerParent}
            initial={reduce ? 'visible' : 'hidden'}
            animate="visible"
          >
            {/* Genre eyebrow */}
            {artist.genre && (
              <motion.p
                variants={fadeUp}
                className="font-grotesk text-[13px] uppercase tracking-[0.25em] text-accent-ink"
              >
                {artist.genre}
              </motion.p>
            )}

            {/* Name */}
            <motion.h1
              variants={fadeUp}
              className="mt-3 font-display text-6xl leading-[0.9] text-ink md:text-8xl break-words"
            >
              {artist.name}
            </motion.h1>

            {/* realName · tagline */}
            {(artist.realName || artist.tagline) && (
              <motion.p
                variants={fadeUp}
                className="mt-3 font-grotesk text-lg text-[var(--ink-72)] break-words"
              >
                {[artist.realName, artist.tagline].filter(Boolean).join(' · ')}
              </motion.p>
            )}

            {/* Bio — moved inline beside portrait */}
            {artist.bio && (
              <motion.div variants={fadeUp} className="mt-5">
                <p className="font-grotesk text-[13px] uppercase tracking-[0.25em] text-accent-ink">
                  About
                </p>
                <p className="mt-3 max-w-[60ch] font-grotesk text-[1rem] leading-relaxed text-[var(--ink-72)]">
                  {artist.bio}
                </p>
              </motion.div>
            )}

            {/* Social row: IG handle + streaming platforms */}
            {(artist.instagram?.handle || artist.platforms?.length) && (
              <motion.div
                variants={fadeUp}
                className="mt-6 flex flex-wrap items-center gap-3"
              >
                {artist.instagram?.handle && (
                  <a
                    href={`https://instagram.com/${artist.instagram.handle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="accent-press inline-flex min-h-[44px] items-center gap-2 rounded-full border border-[var(--accent-line)] px-5 py-2.5 font-grotesk text-sm text-ink transition-colors hover:bg-[var(--accent-soft)]"
                  >
                    <InstagramLogo size={18} />
                    @{artist.instagram.handle}
                  </a>
                )}

                {artist.platforms?.map((platform) => (
                  <a
                    key={platform.name}
                    href={platform.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={platform.name}
                    className="accent-press inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-[var(--accent-line)] p-2.5 text-[var(--ink-72)] transition-colors hover:bg-[var(--accent-soft)] hover:text-[var(--accent)]"
                  >
                    <PlatformIcon name={platform.name} size={18} />
                  </a>
                ))}
              </motion.div>
            )}

            {/* Book CTA */}
            <motion.div variants={fadeUp} className="mt-8">
              <Link
                to={`/bookings?artist=${artist.slug}`}
                className="accent-press edge-refract inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full bg-accent px-7 py-3 font-grotesk text-[1rem] text-ink sm:w-auto"
              >
                Book {artist.name}
              </Link>
            </motion.div>
          </motion.div>
        </section>

        {/* MUSIC */}
        {youtubeMusic.length > 0 && (
          <section className="mt-20 md:mt-28">
            <p className="font-grotesk text-[13px] uppercase tracking-[0.25em] text-accent-ink">
              Listen
            </p>
            <div
              className={`mt-6 grid grid-cols-1 gap-5 ${hasSingleTrack ? 'max-w-[720px]' : 'md:grid-cols-2'}`}
            >
              {youtubeMusic.map((link, i) => (
                <MusicEmbed key={i} link={link} />
              ))}
            </div>
          </section>
        )}

        {/* GIGS */}
        {artist.gigs && artist.gigs.length > 0 && (
          <motion.section
            variants={staggerParent}
            initial={reduce ? 'visible' : 'hidden'}
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            className="mt-20 md:mt-28"
          >
            <motion.p
              variants={fadeUp}
              className="font-grotesk text-[13px] uppercase tracking-[0.25em] text-accent-ink"
            >
              Played
            </motion.p>
            <motion.div variants={fadeUp} className="mt-6 flex flex-wrap gap-3">
              {artist.gigs.map((gig) => (
                <span
                  key={gig}
                  className="rounded-full border border-[var(--accent-line)] bg-raise px-4 py-2 font-grotesk text-sm text-[var(--ink-72)]"
                >
                  {gig}
                </span>
              ))}
            </motion.div>
          </motion.section>
        )}
      </div>
    </main>
  )
}
