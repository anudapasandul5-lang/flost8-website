import { motion } from 'framer-motion'
import { ArrowUpRight } from '@phosphor-icons/react'

const services = [
  { title: 'ARTIST\nDEVELOPMENT', photo: '/photos/maalin.png' },
  { title: 'CONTENT\nENGINE', photo: '/photos/anush.png' },
  { title: 'BOOKING\nSYSTEM', photo: '/ui2/live-photo.jpeg' },
] as const

const cardVariant = {
  hidden: { opacity: 0, y: 40, scale: 0.95 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring' as const, stiffness: 80, damping: 20 } },
}

function ServiceCard({ title, photo }: { title: string; photo: string }) {
  return (
    <motion.article
      variants={cardVariant}
      whileHover={{ scale: 1.02, transition: { type: 'spring', stiffness: 200, damping: 20 } }}
      className="relative aspect-[0.82] cursor-pointer overflow-hidden rounded-[28px] bg-black shadow-[0_10px_16px_rgba(0,0,0,0.4)]"
    >
      <img src={photo} alt="" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-[#150E28]/55" />
      <div className="absolute right-6 top-6 flex h-14 w-14 items-center justify-center rounded-full border-[3px] border-white text-white">
        <ArrowUpRight size={30} weight="bold" />
      </div>
      <h3 className="absolute bottom-6 left-6 whitespace-pre-line font-display text-[32px] leading-[0.95] text-white sm:bottom-8 sm:left-8 sm:text-[42px]">
        {title}
      </h3>
    </motion.article>
  )
}

const containerVariant = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12, delayChildren: 0.2 } },
}

export default function WhatWeDo() {
  return (
    <section className="relative overflow-hidden bg-navy px-4 py-16 sm:px-8 lg:px-10 lg:py-24">
      <img
        src="/ui2/hero-bg.jpeg"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-purple/65" />

      <div className="relative z-10 mx-auto grid max-w-[1280px] items-center gap-10 lg:grid-cols-[300px_1fr]">
        <motion.div
          initial={{ opacity: 0, x: -40 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ type: 'spring', stiffness: 70, damping: 18 }}
        >
          <p className="font-body text-[25px] uppercase leading-[1.15] text-white">
            WE OPERATE
            <br />
            ACROSS 3 CORE AREAS
          </p>
          <h2 className="mt-4 font-display text-[52px] uppercase leading-[0.98] text-white sm:text-[64px] lg:text-[88px]">
            WHAT
            <br />
            WE
            <br />
            ACTUALLY
            <br />
            DO
          </h2>
        </motion.div>

        <motion.div
          className="grid grid-cols-1 gap-7 md:grid-cols-3"
          variants={containerVariant}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
        >
          {services.map(service => (
            <ServiceCard key={service.title} {...service} />
          ))}
        </motion.div>
      </div>
    </section>
  )
}
