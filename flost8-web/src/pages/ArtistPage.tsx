import { useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion, useScroll, useTransform } from 'framer-motion'
import { CaretLeft, InstagramLogo } from '@phosphor-icons/react'
import { getPublicArtistBySlug } from '../lib/artistRoster'
import MusicEmbed from '../components/artist/MusicEmbed'
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
      <main className="bg-base min-h-[100dvh] grid place-items-center px-6">
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

  const hasSingleTrack = artist.music?.length === 1

  return (
    <main className="bg-base min-h-[100dvh]">
      <div className="mx-auto max-w-[1200px] px-6 md:px-10 pt-28 md:pt-32 pb-24">
        {/* BACK ROW */}
        <Link
          to="/#roster"
          className="inline-flex items-center gap-2 font-grotesk text-sm text-[var(--ink-72)] transition-colors hover:text-ink"
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
          <div className="relative overflow-hidden rounded-2xl edge-refract aspect-[3/4] w-full max-w-[480px]">
            <motion.div
              className="h-full w-full"
              style={reduce ? undefined : { scale, y }}
            >
              <picture>
                <source srcSet={`/photos/${artist.slug}.webp`} type="image/webp" />
                <img
                  src={`/photos/${artist.slug}.png`}
                  alt={artist.name}
                  loading="lazy"
                  decoding="async"
                  className="grade-portrait is-active h-full w-full object-cover"
                />
              </picture>
            </motion.div>
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

            {/* Stats + IG row */}
            {(artist.instagram?.followers || artist.instagram?.handle) && (
              <motion.div
                variants={fadeUp}
                className="mt-6 flex flex-wrap items-center gap-6"
              >
                {artist.instagram.followers && (
                  <div className="flex flex-col">
                    <span className="font-display text-4xl text-ink">
                      {artist.instagram.followers}
                    </span>
                    <span className="font-grotesk text-xs uppercase tracking-wide text-[var(--ink-50)]">
                      Instagram
                    </span>
                  </div>
                )}

                {artist.instagram.handle && (
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
              </motion.div>
            )}

            {/* Book CTA */}
            <motion.div variants={fadeUp} className="mt-8">
              <Link
                to={`/bookings?artist=${artist.slug}`}
                className="accent-press edge-refract inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full bg-accent px-7 py-3 font-grotesk text-base text-ink sm:w-auto"
              >
                Book {artist.name}
              </Link>
            </motion.div>
          </motion.div>
        </section>

        {/* BIO */}
        {artist.bio && (
          <motion.section
            variants={fadeUp}
            initial={reduce ? 'visible' : 'hidden'}
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            className="mt-20 md:mt-28"
          >
            <p className="font-grotesk text-[13px] uppercase tracking-[0.25em] text-accent-ink">
              About
            </p>
            <p className="mt-4 max-w-[65ch] font-grotesk text-lg leading-relaxed text-[var(--ink-72)]">
              {artist.bio}
            </p>
          </motion.section>
        )}

        {/* MUSIC */}
        {artist.music && artist.music.length > 0 && (
          <section className="mt-20 md:mt-28">
            <p className="font-grotesk text-[13px] uppercase tracking-[0.25em] text-accent-ink">
              Listen
            </p>
            <div
              className={`mt-6 grid grid-cols-1 gap-5 ${hasSingleTrack ? 'max-w-[720px]' : 'md:grid-cols-2'}`}
            >
              {artist.music.map((link, i) => (
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
