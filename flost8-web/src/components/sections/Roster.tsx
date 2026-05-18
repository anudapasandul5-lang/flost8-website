import { motion } from 'framer-motion'
import { ARTISTS } from '../../lib/config'
import ArtistCard from '../ui/ArtistCard'

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08 },
  },
}

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 80, damping: 20 },
  },
}

// Row 1: first 4 artists; Row 2: last 2 + "MORE" tile
const row1 = ARTISTS.slice(0, 4)
const row2 = ARTISTS.slice(4, 6)

export default function Roster() {
  return (
    <section id="roster" className="bg-cream py-20 md:py-28">
      <div className="max-w-7xl mx-auto px-6 md:px-12">

        {/* Header */}
        <div className="flex flex-col items-center mb-10 gap-6">
          <h2 className="font-script text-5xl md:text-6xl text-red italic text-center">
            Meet the Roster
          </h2>

          {/* Filter bar — decorative */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="bg-red text-white rounded-full px-6 py-2 font-body text-sm"
            >
              All Roster
            </button>
            <button
              type="button"
              className="border border-off-black rounded-full px-6 py-2 font-body text-sm"
            >
              Filter
            </button>
          </div>
        </div>

        {/* Row 1 — 4 artists */}
        <motion.div
          className="grid grid-cols-2 md:grid-cols-4 gap-4"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
        >
          {row1.map((artist, i) => (
            <motion.div key={artist.slug} variants={cardVariants}>
              <ArtistCard artist={artist} index={i} />
            </motion.div>
          ))}
        </motion.div>

        {/* Row 2 — 2 artists + "MORE" tile */}
        <motion.div
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
        >
          {row2.map((artist, i) => (
            <motion.div key={artist.slug} variants={cardVariants}>
              <ArtistCard artist={artist} index={i + 4} />
            </motion.div>
          ))}

          {/* "MORE ARTISTS JOINING SOON" tile — spans 2 cols on desktop */}
          <motion.div
            variants={cardVariants}
            className="col-span-1 md:col-span-2 bg-navy flex items-center justify-center aspect-[4/5] md:aspect-auto"
          >
            <div className="text-center px-8">
              <p className="font-display text-4xl md:text-5xl text-white leading-tight">
                MORE<br />ARTISTS<br />JOINING<br />SOON
              </p>
            </div>
          </motion.div>
        </motion.div>

      </div>
    </section>
  )
}
