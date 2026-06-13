import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CheckCircle } from '@phosphor-icons/react'
import { useUpcomingShows } from '../hooks/useUpcomingShows'
import { useMotionSafe } from '../hooks/useMotionSafe'
import { BOOKING_API_URL, CONTACT_EMAIL, TURNSTILE_SITE_KEY } from '../lib/config'
import { fadeUp, staggerParent } from '../lib/motion'
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
    turnstile?: { reset?: () => void }
  }
}

const INPUT_CLS =
  'w-full bg-raise border border-[var(--bg-line)] text-ink font-grotesk text-sm rounded-xl px-4 py-3.5 focus:outline-none focus:border-[var(--accent-line)] focus:shadow-[inset_0_1px_0_rgba(255,255,255,0.10),inset_0_0_0_1px_var(--accent-line)] transition-colors placeholder:text-[var(--ink-32)]'

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
        <div key={i} className="animate-pulse bg-raise h-16 rounded my-2" />
      ))}
    </>
  )
}

function ShowRow({ show }: { show: UpcomingShow }) {
  return (
    <div className="border-b border-[var(--bg-line)] py-6">
      {/* Desktop grid */}
      <div className="hidden md:grid grid-cols-[140px_1fr_1fr] gap-4 items-center">
        <span className="font-display text-2xl text-accent-ink">{show.date}</span>
        <span className="font-body text-lg font-medium text-white">{show.artist}</span>
        <span className="font-body text-sm text-white/50">{show.venue}, {show.city}</span>
      </div>
      {/* Mobile stack */}
      <div className="flex flex-col gap-1 md:hidden">
        <span className="font-display text-xl text-accent-ink">{show.date}</span>
        <span className="font-body text-lg font-medium text-white">{show.artist}</span>
        <span className="font-body text-sm text-white/50">{show.venue}, {show.city}</span>
      </div>
    </div>
  )
}

export default function BookingsPage() {
  const { shows, loading: showsLoading } = useUpcomingShows()
  const [formData, setFormData] = useState<BookingFormData>(getInitialBookingForm)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState('')
  const { reduce } = useMotionSafe()

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

  function handleBookAnother() {
    setSubmitted(false)
    setFormData(EMPTY_BOOKING_FORM)
    setErrors({})
    setTurnstileToken('')
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
    } catch (err) {
      console.error('booking submit failed', err)
      setSubmitError(true)
      window.turnstile?.reset?.()
      setTurnstileToken('')
    } finally {
      setSubmitting(false)
    }
  }

  const isSubmitDisabled = submitting || (!!TURNSTILE_SITE_KEY && !turnstileToken)

  return (
    <div className="bg-base min-h-[100dvh] pt-32">
      <div className="max-w-6xl mx-auto px-4 md:px-8">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.75 }}
          className="pb-24"
        >
          <h1 className="font-display text-6xl md:text-8xl text-ink leading-[0.92] uppercase tracking-tight mb-2">
            MAKE A BOOKING
          </h1>
          <div className="h-px w-24 bg-[var(--accent-line)] mb-12" />

          {submitted ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-20"
              role="status"
            >
              <CheckCircle size={64} weight="fill" className="text-accent-ink mx-auto mb-6" />
              <h3 className="font-display text-4xl text-white mb-4">ENQUIRY SENT</h3>
              <p className="font-body text-white/60 max-w-md mx-auto">
                We'll be in touch within 24 hours.
              </p>
              <div className="flex flex-wrap gap-4 justify-center mt-8">
                <button
                  type="button"
                  onClick={handleBookAnother}
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-[var(--accent-line)] px-7 py-4 font-grotesk text-ink hover:bg-[var(--accent-soft)] transition-colors"
                >
                  Book another
                </button>
                <Link
                  to="/"
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-accent px-7 py-4 font-grotesk text-ink accent-press edge-refract"
                >
                  Back home
                </Link>
              </div>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} noValidate>
              <motion.div
                className="grid grid-cols-1 md:grid-cols-2 gap-6"
                variants={reduce ? undefined : staggerParent}
                initial={reduce ? undefined : 'hidden'}
                whileInView={reduce ? undefined : 'visible'}
                viewport={reduce ? undefined : { once: true }}
              >
                {BOOKING_FIELDS.map(field => (
                  <motion.div
                    key={field.id}
                    className={field.fullWidth ? 'md:col-span-2' : ''}
                    variants={reduce ? undefined : fadeUp}
                  >
                    <label
                      htmlFor={field.id}
                      className="font-grotesk text-sm text-[var(--ink-72)] mb-1 block"
                    >
                      {field.label}
                      {field.required && <span className="text-accent2 ml-1">*</span>}
                    </label>

                    {field.type === 'select' ? (
                      <select
                        id={field.id}
                        value={formData[field.id]}
                        onChange={e => handleChange(field.id, e.target.value)}
                        className={`${INPUT_CLS} appearance-none`}
                        style={{ colorScheme: 'dark' }}
                        aria-invalid={!!errors[field.id]}
                        aria-describedby={errors[field.id] ? `${field.id}-error` : undefined}
                      >
                        <option value="" disabled>Select...</option>
                        {field.options?.map(opt => (
                          <option key={opt.value} value={opt.value} className="bg-base text-white">
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
                        aria-invalid={!!errors[field.id]}
                        aria-describedby={errors[field.id] ? `${field.id}-error` : undefined}
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
                        aria-invalid={!!errors[field.id]}
                        aria-describedby={errors[field.id] ? `${field.id}-error` : undefined}
                      />
                    )}

                    {errors[field.id] && (
                      <p id={`${field.id}-error`} className="font-body text-xs text-[var(--error)] mt-1">
                        {errors[field.id]}
                      </p>
                    )}
                  </motion.div>
                ))}

                <div className="md:col-span-2">
                  {TURNSTILE_SITE_KEY ? (
                    <div
                      className="cf-turnstile"
                      data-sitekey={TURNSTILE_SITE_KEY}
                      data-callback="onTurnstileSuccess"
                    />
                  ) : (
                    <div className="bg-raise border border-[var(--bg-line)] rounded-xl px-4 py-3 text-[var(--ink-32)] text-sm font-grotesk">
                      Turnstile widget loads here in production
                    </div>
                  )}
                </div>

                {submitError && (
                  <p role="alert" className="font-body text-sm text-[var(--error)] text-center md:col-span-2">
                    Something went wrong. Please try again or email{' '}
                    <a href={`mailto:${CONTACT_EMAIL}`} className="underline">{CONTACT_EMAIL}</a>
                  </p>
                )}

                <button
                  type="submit"
                  disabled={isSubmitDisabled}
                  className="md:col-span-2 w-full inline-flex items-center justify-center bg-accent text-ink font-grotesk font-medium py-4 rounded-full text-[1rem] accent-press edge-refract disabled:opacity-50 disabled:cursor-not-allowed transition-opacity hover:opacity-90"
                >
                  {submitting ? 'Sending...' : 'Submit Booking Enquiry'}
                </button>
              </motion.div>
            </form>
          )}
        </motion.div>

        <motion.div
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
        </motion.div>
      </div>
    </div>
  )
}
