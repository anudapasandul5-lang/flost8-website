import { motion } from 'framer-motion'

export default function LivePhoto() {
  return (
    <section className="bg-navy px-4 pb-16 sm:px-8 lg:px-10 lg:pb-24">
      <div className="mx-auto max-w-[1280px]">
        <motion.img
          src="/ui2/live-photo.jpeg"
          alt="A packed FLOST8 event with stage lighting and crowd"
          className="h-[220px] w-full object-cover object-[50%_68%] sm:h-[300px] lg:h-[360px]"
          initial={{ opacity: 0, scale: 0.98 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ type: 'spring', stiffness: 60, damping: 18 }}
        />
      </div>
    </section>
  )
}
