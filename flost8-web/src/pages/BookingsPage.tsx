import { motion } from 'framer-motion'
import { useUpcomingShows } from '../hooks/useUpcomingShows'
import FormRenderer from '../components/FormRenderer'
import {
  BOOKING_FIELDS,
  EMPTY_BOOKING_FORM,
  buildBookingPayload,
  validateBookingForm,
  type BookingFormData,
  type UpcomingShow,
} from '../lib/bookingContract'

function getInitialBookingForm(): BookingFormData {
  const requestedArtist = new URLSearchParams(window.location.search).get('artist')
  return requestedArtist
    ? { ...EMPTY_BOOKING_FORM, dj_1: requestedArtist }
    : { ...EMPTY_BOOKING_FORM }
}

function SkeletonRows() {
  return (
    <>
      {[0, 1, 2].map(i => (
        <div key={i} className="animate-pulse bg-raise h-16 rounded my-2" />
      ))}
    </>
  )
}

function ShowRow({ show }: { show: UpcomingShow }) {
  // §8: join non-empty parts so a blank city doesn't leave a dangling comma.
  const place = [show.venue, show.city].filter(Boolean).join(', ')
  return (
    <div className="border-b border-[var(--bg-line)] py-6">
      {/* Desktop grid */}
      <div className="hidden md:grid grid-cols-[140px_1fr_1fr] gap-4 items-center">
        <span className="font-display text-2xl text-accent-ink">{show.date}</span>
        <span className="font-body text-lg font-medium text-white">{show.artist}</span>
        <span className="font-body text-sm text-white/50">{place}</span>
      </div>
      {/* Mobile stack */}
      <div className="flex flex-col gap-1 md:hidden">
        <span className="font-display text-xl text-accent-ink">{show.date}</span>
        <span className="font-body text-lg font-medium text-white">{show.artist}</span>
        <span className="font-body text-sm text-white/50">{place}</span>
      </div>
    </div>
  )
}

export default function BookingsPage() {
  const { shows, loading: showsLoading } = useUpcomingShows()

  return (
    <main id="main-content" tabIndex={-1} className="bg-base min-h-[100dvh] pt-32 outline-none">
      <div className="max-w-6xl mx-auto px-4 md:px-8">
        <FormRenderer
          fields={BOOKING_FIELDS}
          initialData={getInitialBookingForm() as unknown as Record<string, string>}
          validate={data => validateBookingForm(data as unknown as BookingFormData)}
          buildPayload={(data, token) => buildBookingPayload(data as unknown as BookingFormData, token)}
          fieldAlias={{ email: 'organizer_email' }}
          title="MAKE A BOOKING"
          successTitle="ENQUIRY SENT"
          successMsg="We'll be in touch within 24 hours."
          submitLabel="Submit Booking Enquiry"
          sendAnotherLabel="Book another"
        />

        <motion.section
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.75 }}
          className="pb-24"
        >
          <h2 className="font-display text-6xl md:text-8xl text-ink leading-[0.92] uppercase tracking-tight mb-2 mt-20">
            UPCOMING SHOWS
          </h2>
          <div className="h-px w-24 bg-[var(--accent-line)] mb-12" />

          {showsLoading && <SkeletonRows />}

          {!showsLoading && shows.length === 0 && (
            <div className="text-center py-12">
              <p className="font-body text-white/50">No upcoming shows scheduled. Check back soon.</p>
            </div>
          )}

          {!showsLoading && shows.map((show, i) => (
            <ShowRow key={`${show.artist}-${i}`} show={show} />
          ))}
        </motion.section>
      </div>
    </main>
  )
}
