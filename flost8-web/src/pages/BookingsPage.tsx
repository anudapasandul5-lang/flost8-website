import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle } from '@phosphor-icons/react'
import { APPS_SCRIPT_URL, TURNSTILE_SITE_KEY, CONTACT_EMAIL } from '../lib/config'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Show {
  title: string
  artist: string
  date: string
  venue: string
  city: string
}

// ─── Placeholder data ─────────────────────────────────────────────────────────

const PLACEHOLDER_SHOWS: Show[] = [
  { title: 'Neon Nights',     artist: 'DR. GREEN',     date: 'Jun 14 2026', venue: 'The Factory',      city: 'Colombo'    },
  { title: 'Sunday Sessions', artist: 'SONAL',         date: 'Jun 21 2026', venue: 'Arugam Bay Hotel', city: 'Arugam Bay' },
  { title: 'City Lights',     artist: 'MAALIN',        date: 'Jul 5 2026',  venue: 'Hilton Rooftop',   city: 'Colombo'    },
]

// ─── Form config ──────────────────────────────────────────────────────────────

interface FieldDef {
  id: string
  label: string
  type: 'text' | 'email' | 'tel' | 'date' | 'select' | 'textarea'
  required: boolean
  placeholder?: string
  options?: string[]
  fullWidth?: boolean
}

const FORM_FIELDS: FieldDef[] = [
  // Row 1
  { id: 'name',        label: 'Your Name',        type: 'text',     required: true,  placeholder: 'Full name' },
  { id: 'email',       label: 'Email Address',    type: 'email',    required: true,  placeholder: 'you@example.com' },
  // Row 2
  { id: 'phone',       label: 'Phone Number',     type: 'tel',      required: true,  placeholder: '+94 77 000 0000' },
  { id: 'company',     label: 'Company / Brand',  type: 'text',     required: false, placeholder: 'Optional' },
  // Row 3
  { id: 'artist',      label: 'Artist Requested', type: 'select',   required: true,
    options: ['Any Artist', 'DR. GREEN', 'SONAL', 'MAALIN', 'RAKHIL', 'THE PROFESSOR', 'ANUSH'] },
  { id: 'event_type',  label: 'Event Type',       type: 'select',   required: true,
    options: ['Corporate Event', 'Private Party', 'Club Night', 'Festival', 'Wedding', 'Other'] },
  // Row 4
  { id: 'event_date',  label: 'Event Date',       type: 'date',     required: true },
  { id: 'venue',       label: 'Venue / Location', type: 'text',     required: true,  placeholder: 'Venue name, City' },
  // Row 5
  { id: 'budget',      label: 'Budget (LKR)',     type: 'text',     required: false, placeholder: 'Approximate budget' },
  { id: 'audience',    label: 'Expected Audience',type: 'text',     required: false, placeholder: 'e.g. 200 people' },
  // Row 6 — full width
  { id: 'message',     label: 'Additional Notes', type: 'textarea', required: false, placeholder: 'Anything else we should know?', fullWidth: true },
]

// ─── Shared class strings ─────────────────────────────────────────────────────

const INPUT_CLS =
  'w-full bg-white/5 border border-white/10 text-white font-body text-sm rounded-lg px-4 py-3 focus:outline-none focus:border-cyan transition-colors placeholder:text-white/30'

// ─── Sub-components ───────────────────────────────────────────────────────────

function SkeletonRows() {
  return (
    <>
      {[0, 1, 2].map(i => (
        <div key={i} className="animate-pulse bg-white/5 h-16 rounded my-2" />
      ))}
    </>
  )
}

function ShowRow({ show }: { show: Show }) {
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

// ─── Main page ────────────────────────────────────────────────────────────────

export default function BookingsPage() {
  // Shows state
  const [shows, setShows] = useState<Show[]>([])
  const [showsLoading, setShowsLoading] = useState(true)
  const [showsError, setShowsError] = useState(false)

  // Form state
  const [formData, setFormData] = useState<Record<string, string>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState(false)

  // Fetch shows
  useEffect(() => {
    if (!APPS_SCRIPT_URL) {
      setShows(PLACEHOLDER_SHOWS)
      setShowsLoading(false)
      return
    }
    fetch(`${APPS_SCRIPT_URL}?action=upcoming`)
      .then(r => r.json())
      .then(data => {
        setShows(data.shows || data)
        setShowsLoading(false)
      })
      .catch(() => {
        setShowsError(true)
        setShowsLoading(false)
      })
  }, [])

  // Field change handler
  function handleChange(id: string, value: string) {
    setFormData(prev => ({ ...prev, [id]: value }))
    if (errors[id]) {
      setErrors(prev => { const next = { ...prev }; delete next[id]; return next })
    }
  }

  // Validate & submit
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitError(false)

    // Validate required fields
    const newErrors: Record<string, string> = {}
    FORM_FIELDS.forEach(f => {
      if (f.required && !formData[f.id]?.trim()) {
        newErrors[f.id] = 'This field is required'
      }
    })
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch(APPS_SCRIPT_URL || '#', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      if (!res.ok) throw new Error('non-200')
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

        {/* ── Section 1: Upcoming Shows ─────────────────────────── */}
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

        {/* ── Section 2: Inquiry Form ───────────────────────────── */}
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
                {FORM_FIELDS.map(field => (
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
                        value={formData[field.id] ?? ''}
                        onChange={e => handleChange(field.id, e.target.value)}
                        className={`${INPUT_CLS} appearance-none`}
                        style={{ colorScheme: 'dark' }}
                      >
                        <option value="" disabled>Select…</option>
                        {field.options?.map(opt => (
                          <option key={opt} value={opt} className="bg-navy text-white">
                            {opt}
                          </option>
                        ))}
                      </select>
                    ) : field.type === 'textarea' ? (
                      <textarea
                        id={field.id}
                        rows={4}
                        placeholder={field.placeholder}
                        value={formData[field.id] ?? ''}
                        onChange={e => handleChange(field.id, e.target.value)}
                        className={`${INPUT_CLS} resize-none h-32`}
                      />
                    ) : (
                      <input
                        id={field.id}
                        type={field.type}
                        placeholder={field.placeholder}
                        value={formData[field.id] ?? ''}
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

                {/* Turnstile */}
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

                {/* API error */}
                {submitError && (
                  <p className="font-body text-sm text-red text-center md:col-span-2">
                    Something went wrong. Please try again or email{' '}
                    <a href={`mailto:${CONTACT_EMAIL}`} className="underline">{CONTACT_EMAIL}</a>
                  </p>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="md:col-span-2 w-full bg-red text-white font-body font-medium py-4 rounded-full text-base hover:bg-red/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {submitting ? 'Sending…' : 'Submit Booking Enquiry'}
                </button>
              </div>
            </form>
          )}
        </motion.div>

      </div>
    </div>
  )
}
