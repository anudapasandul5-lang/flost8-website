import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle } from '@phosphor-icons/react'
import { useUpcomingShows } from '../hooks/useUpcomingShows'
import { BOOKING_API_URL, CONTACT_EMAIL, TURNSTILE_SITE_KEY } from '../lib/config'
import {
  BOOKING_FIELDS,
  EMPTY_BOOKING_FORM,
  buildBookingPayload,
  errorsFromApi,
  validateBookingForm,
  type BookingFormData,
  type UpcomingShow,
} from '../lib/bookingContract'

declare global {
  interface Window {
    onTurnstileSuccess?: (token: string) => void
  }
}

const INPUT_CLS =
  'w-full bg-white/5 border border-white/10 text-white font-body text-sm rounded-lg px-4 py-3 focus:outline-none focus:border-cyan transition-colors placeholder:text-white/30'

function getInitialBookingForm(): BookingFormData {
  const requestedArtist = new URLSearchParams(window.location.search).get('artist')
  return requestedArtist
    ? { ...EMPTY_BOOKING_FORM, artist: requestedArtist }
    : EMPTY_BOOKING_FORM
}

function SkeletonRows() {
  return (
    <>
      {[0, 1, 2].map(i => (
        <div key={i} className="animate-pulse bg-white/5 h-16 rounded my-2" />
      ))}
    </>
  )
}

function ShowRow({ show }: { show: UpcomingShow }) {
  return (
    <div className="border-b border-white/10 py-6">
      {/* Desktop grid */}
      <div className="hidden md:grid grid-cols-[140px_1fr_1fr] gap-4 items-center">
        <span className="font-display text-2xl text-cyan">{show.date}</span>
        <span className="font-body text-lg font-medium text-white">{show.artist}</span>
        <span className="font-body text-sm text-white/50">{show.venue}, {show.city}</span>
      </div>
      {/* Mobile stack */}
      <div className="flex flex-col gap-1 md:hidden">
        <span className="font-display text-xl text-cyan">{show.date}</span>
        <span className="font-body text-lg font-medium text-white">{show.artist}</span>
        <span className="font-body text-sm text-white/50">{show.venue}, {show.city}</span>
      </div>
    </div>
  )
}

export default function BookingsPage() {
  const { shows, loading: showsLoading, error: showsError } = useUpcomingShows()
  const [formData, setFormData] = useState<BookingFormData>(getInitialBookingForm)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState('')

  useEffect(() => {
    window.onTurnstileSuccess = setTurnstileToken
    return () => {
      delete window.onTurnstileSuccess
    }
  }, [])

  function handleChange(id: keyof BookingFormData, value: string) {
    setFormData(prev => ({ ...prev, [id]: value }))
    if (errors[id]) {
      setErrors(prev => { const next = { ...prev }; delete next[id]; return next })
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitError(false)

    const newErrors = validateBookingForm(formData)
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setSubmitting(true)
    try {
      if (!BOOKING_API_URL) throw new Error('missing Apps Script URL')

      const res = await fetch(BOOKING_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(buildBookingPayload(formData, turnstileToken)),
      })
      const data: unknown = await res.json().catch(() => null)
      const apiErrors = data && typeof data === 'object' && 'errors' in data
        ? errorsFromApi((data as { errors: unknown }).errors)
        : {}

      if (Object.keys(apiErrors).length > 0) {
        setErrors(apiErrors)
      }
      if (!res.ok || !data || typeof data !== 'object' || !('ok' in data) || data.ok !== true) {
        throw new Error('booking rejected')
      }

      setSubmitted(true)
    } catch {
      setSubmitError(true)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-navy min-h-screen pt-32">
      <div className="max-w-6xl mx-auto px-4 md:px-8">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="font-display text-5xl md:text-7xl text-white uppercase tracking-tight mb-2">
            UPCOMING SHOWS
          </h1>
          <div className="h-1 bg-red w-24 mb-12" />

          {showsLoading && <SkeletonRows />}

          {!showsLoading && showsError && (
            <div className="text-center py-12">
              <p className="font-body text-white/50">Could not load shows. Check back later.</p>
            </div>
          )}

          {!showsLoading && !showsError && shows.length === 0 && (
            <div className="text-center py-12">
              <p className="font-body text-white/50">No upcoming shows scheduled. Check back soon.</p>
            </div>
          )}

          {!showsLoading && !showsError && shows.map((show, i) => (
            <ShowRow key={`${show.artist}-${i}`} show={show} />
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="pb-24"
        >
          <h2 className="font-display text-5xl md:text-7xl text-white uppercase tracking-tight mb-2 mt-20">
            MAKE A BOOKING
          </h2>
          <div className="h-1 bg-red w-24 mb-12" />

          {submitted ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-20"
            >
              <CheckCircle size={64} weight="fill" className="text-[#CCFF00] mx-auto mb-6" />
              <h3 className="font-display text-4xl text-white mb-4">ENQUIRY SENT</h3>
              <p className="font-body text-white/60 max-w-md mx-auto">
                We'll get back to you within 24 hours. Check your email for confirmation.
              </p>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} noValidate>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {BOOKING_FIELDS.map(field => (
                  <div
                    key={field.id}
                    className={field.fullWidth ? 'md:col-span-2' : ''}
                  >
                    <label
                      htmlFor={field.id}
                      className="font-body text-sm text-white/70 mb-1 block"
                    >
                      {field.label}
                      {field.required && <span className="text-red ml-1">*</span>}
                    </label>

                    {field.type === 'select' ? (
                      <select
                        id={field.id}
                        value={formData[field.id]}
                        onChange={e => handleChange(field.id, e.target.value)}
                        className={`${INPUT_CLS} appearance-none`}
                        style={{ colorScheme: 'dark' }}
                      >
                        <option value="" disabled>Select...</option>
                        {field.options?.map(opt => (
                          <option key={opt.value} value={opt.value} className="bg-navy text-white">
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    ) : field.type === 'textarea' ? (
                      <textarea
                        id={field.id}
                        rows={4}
                        placeholder={field.placeholder}
                        value={formData[field.id]}
                        onChange={e => handleChange(field.id, e.target.value)}
                        className={`${INPUT_CLS} resize-none h-32`}
                      />
                    ) : (
                      <input
                        id={field.id}
                        type={field.type}
                        min={field.min}
                        max={field.max}
                        step={field.step}
                        placeholder={field.placeholder}
                        value={formData[field.id]}
                        onChange={e => handleChange(field.id, e.target.value)}
                        className={INPUT_CLS}
                        style={field.type === 'date' ? { colorScheme: 'dark' } : undefined}
                      />
                    )}

                    {errors[field.id] && (
                      <p className="font-body text-xs text-red mt-1">{errors[field.id]}</p>
                    )}
                  </div>
                ))}

                <div className="md:col-span-2">
                  {TURNSTILE_SITE_KEY ? (
                    <div
                      className="cf-turnstile"
                      data-sitekey={TURNSTILE_SITE_KEY}
                      data-callback="onTurnstileSuccess"
                    />
                  ) : (
                    <div className="bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white/30 text-sm font-body">
                      Turnstile widget loads here in production
                    </div>
                  )}
                </div>

                {submitError && (
                  <p className="font-body text-sm text-red text-center md:col-span-2">
                    Something went wrong. Please try again or email{' '}
                    <a href={`mailto:${CONTACT_EMAIL}`} className="underline">{CONTACT_EMAIL}</a>
                  </p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="md:col-span-2 w-full bg-red text-white font-body font-medium py-4 rounded-full text-base hover:bg-red/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {submitting ? 'Sending...' : 'Submit Booking Enquiry'}
                </button>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </div>
  )
}
