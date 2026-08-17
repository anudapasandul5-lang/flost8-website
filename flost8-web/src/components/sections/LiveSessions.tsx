import { Link } from 'react-router-dom'
import { motion, type Variants } from 'framer-motion'
import { ArrowUpRight } from '@phosphor-icons/react'
import EyebrowRule from '../ui/EyebrowRule'
import RevealLines from '../ui/RevealLines'
import MusicEmbed from '../artist/MusicEmbed'
import { useMotionSafe } from '../../hooks/useMotionSafe'
import { staggerParent, SPRING } from '../../lib/motion'
import { LIVE_SESSIONS, YOUTUBE_CHANNEL, type LiveSession } from '../../lib/liveSessions'

interface LiveSessionsProps {
  /** teaser = homepage preview (2 cards, links to the full page). full = the /live-sessions page (all cards, links out to YouTube). */
  variant?: 'teaser' | 'full'
}

// Same spring-pop the Shows section uses on its date chip (Shows.tsx chipPop).
const chipPop: Variants = {
  hidden: { opacity: 0, scale: 0.72 },
  visible: { opacity: 1, scale: 1, transition: { ...SPRING, delay: 0.18 } },
}

// Same scale+opacity pop the Roster carousel uses for its active card (Roster.tsx:264-272).
const cardPop: Variants = {
  hidden: { opacity: 0.5, scale: 0.9 },
  visible: { opacity: 1, scale: 1, transition: { ...SPRING } },
}

function SessionCard({ session, reduce }: { session: LiveSession; reduce: boolean }) {
  const guestLabel = (
    <span className="font-display text-2xl text-ink md:text-3xl">{session.guest}</span>
  )

  return (
    <motion.div variants={reduce ? undefined : cardPop} className="flex flex-col gap-3">
      <MusicEmbed link={{ type: 'youtube', url: session.url, title: session.guest }} />
      <div className="flex items-center gap-3 px-1">
        <motion.span
          variants={reduce ? undefined : chipPop}
          className="whitespace-nowrap rounded-md bg-accent px-3 py-1 font-grotesk text-xs font-semibold text-ink"
        >
          EP {String(session.ep).padStart(2, '0')}
        </motion.span>
        {session.artistSlug ? (
          <Link to={`/artist/${session.artistSlug}`} className="transition-colors duration-150 hover:text-accent">
            {guestLabel}
          </Link>
        ) : session.instagramUrl ? (
          <a
            href={session.instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors duration-150 hover:text-accent"
          >
            {guestLabel}
          </a>
        ) : (
          guestLabel
        )}
      </div>
    </motion.div>
  )
}

export default function LiveSessions({ variant = 'teaser' }: LiveSessionsProps) {
  const { reduce } = useMotionSafe()
  if (!LIVE_SESSIONS.length) return null

  const sessions = variant === 'teaser' ? LIVE_SESSIONS.slice(0, 2) : LIVE_SESSIONS

  return (
    <section id="live-sessions" className="relative bg-base py-10 md:py-20">
      <div className="max-w-[1400px] mx-auto px-6 md:px-10">
        <div className="mb-12 flex flex-wrap items-end justify-between gap-6 md:mb-16">
          <div>
            <p className="font-grotesk uppercase tracking-[0.25em] text-[13px] text-accent-ink">
              The podcast
            </p>
            <EyebrowRule />
            <RevealLines
              lines={['FLOST8 LIVE SESSIONS']}
              className={`mt-3 font-display text-ink leading-[0.9] ${
                variant === 'full' ? 'text-6xl md:text-8xl' : 'text-5xl md:text-7xl'
              }`}
            />
          </div>

          {variant === 'full' && (
            <a
              href={YOUTUBE_CHANNEL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-accent text-ink rounded-full px-6 py-3.5 accent-press edge-refract font-grotesk font-semibold"
            >
              Watch all on YouTube
              <ArrowUpRight size={20} weight="bold" />
            </a>
          )}
        </div>

        <motion.div
          className="grid grid-cols-1 gap-6 md:grid-cols-2"
          variants={reduce ? undefined : staggerParent}
          initial={reduce ? undefined : 'hidden'}
          whileInView={reduce ? undefined : 'visible'}
          viewport={{ once: true, margin: '0px 0px -64px 0px' }}
        >
          {sessions.map((session) => (
            <SessionCard key={session.ep} session={session} reduce={reduce} />
          ))}
        </motion.div>

        {variant === 'teaser' && (
          <div className="mt-10 md:mt-12">
            <Link
              to="/live-sessions"
              className="inline-flex items-center gap-2 bg-accent text-ink rounded-full px-6 py-3.5 accent-press edge-refract font-grotesk font-semibold"
            >
              All sessions
              <ArrowUpRight size={20} weight="bold" />
            </Link>
          </div>
        )}
      </div>
    </section>
  )
}
