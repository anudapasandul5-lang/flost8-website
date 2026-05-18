import { motion } from 'framer-motion'

const partners = ['CocaCola', 'IBM', 'NIKE', 'adidas', 'HARVARD']

export default function Partners() {
  return (
    <section className="relative overflow-hidden bg-[#5E79A6] px-4 pb-20 sm:px-8 lg:px-10 lg:pb-24">
      <div className="mx-auto max-w-[1280px] text-center">
        <motion.p
          className="font-body text-[20px] italic leading-snug text-white sm:text-[26px] lg:text-[30px]"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ type: 'spring', stiffness: 80, damping: 20 }}
        >
          Partnerships with brands, venues, festivals, and lifestyle platforms across 14 cities.
        </motion.p>

        <motion.div
          className="relative mt-10 rounded-[24px] border-[5px] border-[#EA4323] bg-[#F4F3F6] px-6 py-10 shadow-[0_12px_18px_rgba(0,0,0,0.35)] sm:rounded-[34px] sm:px-16 sm:py-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ type: 'spring', stiffness: 70, damping: 18, delay: 0.15 }}
        >
          <div className="grid grid-cols-2 items-center gap-12 md:grid-cols-5">
            {partners.map((partner, index) => (
              <span
                key={partner}
                className={[
                  'font-body text-[24px] font-bold leading-none text-black sm:text-[36px]',
                  index === 0 ? 'font-script text-red' : '',
                  index === 1 ? 'font-serif text-[#2D7DB9]' : '',
                  index === 3 ? 'font-display lowercase' : '',
                  index === 4 ? 'text-[26px]' : '',
                ].join(' ')}
              >
                {partner}
              </span>
            ))}
          </div>
          <svg
            viewBox="0 0 1280 180"
            className="pointer-events-none absolute -bottom-24 left-0 w-full"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path
              d="M0 80 C 220 15 350 190 520 95 S 820 75 980 80 S 1190 105 1280 10"
              fill="none"
              stroke="#70F0F2"
              strokeWidth="4"
            />
          </svg>
        </motion.div>
      </div>
    </section>
  )
}
