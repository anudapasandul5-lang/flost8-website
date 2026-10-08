import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CheckCircle } from '@phosphor-icons/react'
import { useMotionSafe } from '../hooks/useMotionSafe'
import { BOOKING_API_URL, CONTACT_EMAIL, TURNSTILE_SITE_KEY } from '../lib/config'
import { fadeUp, staggerParent } from '../lib/motion'
import { errorsFromApi } from '../lib/bookingContract'
import Turnstile from './Turnstile'

/** Superset field shape covering both the intake and booking contracts. */
export interface FormFieldDef {
  id: string
  label: string
  type: 'text' | 'email' | 'tel' | 'date' | 'number' | 'select' | 'textarea'
  required: boolean
  placeholder?: string
  options?: Array<{ value: string; label: string }>
  fullWidth?: boolean
  min?: string
  max?: string
  step?: string
  /** Field is only rendered when this returns true (the contract mirrors it in validation). */
  showIf?: (data: Record<string, string>) => boolean
}

const INPUT_CLS =
  'w-full bg-raise border border-[var(--bg-line)] text-ink font-grotesk text-[16px] md:text-sm rounded-xl px-4 py-3.5 focus:outline-none focus:border-[var(--accent-line)] focus:shadow-[inset_0_1px_0_rgba(255,255,255,0.10),inset_0_0_0_1px_var(--accent-line)] transition-colors placeholder:text-[var(--ink-32)]'

export interface FormRendererProps {
  fields: FormFieldDef[]
  /** Initial (and reset) field values. */
  initialData: Record<string, string>
  validate: (data: Record<string, string>) => Record<string, string>
  buildPayload: (data: Record<string, string>, token: string) => object
  /** Remap server-side error field ids to form field ids (e.g. email -> organizer_email). */
  fieldAlias?: Record<string, string>
  title: string
  intro?: string
  successTitle: string
  successMsg: string
  submitLabel?: string
  sendAnotherLabel?: string
  contactEmail?: string
}

export default function FormRenderer({
  fields,
  initialData,
  validate,
  buildPayload,
  fieldAlias,
  title,
  intro,
  successTitle,
  successMsg,
  submitLabel = 'Submit',
  sendAnotherLabel = 'Send another',
  contactEmail = CONTACT_EMAIL,
}: FormRendererProps) {
  const [formData, setFormData] = useState<Record<string, string>>(() => ({ ...initialData }))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState('')
  const { reduce } = useMotionSafe()
  const successRef = useRef<HTMLDivElement>(null)

  // §1: site key baked at build time. Missing in production = widget can't render and
  // the server will 403 every token. Hard-block + surface it instead of failing silently.
  const siteKeyMissing = !TURNSTILE_SITE_KEY
  const blockForMissingKey = siteKeyMissing && import.meta.env.PROD
  useEffect(() => {
    if (siteKeyMissing) {
      console.warn('[forms] VITE_TURNSTILE_SITE_KEY is not set — Turnstile disabled. Forms are blocked in production builds.')
    }
  }, [siteKeyMissing])

  // Move focus to the success confirmation when it appears.
  useEffect(() => {
    if (submitted) successRef.current?.focus()
  }, [submitted])

  function handleChange(id: string, value: string) {
    setFormData(prev => ({ ...prev, [id]: value }))
    if (errors[id]) {
      setErrors(prev => { const next = { ...prev }; delete next[id]; return next })
    }
  }

  function focusFirstError(errs: Record<string, string>) {
    const first = fields.find(f => errs[f.id])?.id
    if (first) document.getElementById(first)?.focus()
  }

  function handleSendAnother() {
    setSubmitted(false)
    setFormData({ ...initialData })
    setErrors({})
    setTurnstileToken('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (submitting) return // §7: guard against double-submit replaying the one-time token
    setSubmitError(false)

    const newErrors = validate(formData)
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      focusFirstError(newErrors)
      return
    }

    setSubmitting(true)
    try {
      if (!BOOKING_API_URL) throw new Error('missing Apps Script URL')

      const res = await fetch(BOOKING_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(buildPayload(formData, turnstileToken)),
      })
      const data: unknown = await res.json().catch(() => null)
      const rawErrors = data && typeof data === 'object' && 'errors' in data
        ? errorsFromApi((data as { errors: unknown }).errors)
        : {}
      // §3: server may return a field id (e.g. `email`) that differs from the form's (`organizer_email`).
      const apiErrors = fieldAlias
        ? Object.fromEntries(Object.entries(rawErrors).map(([k, v]) => [fieldAlias[k] ?? k, v]))
        : rawErrors

      if (Object.keys(apiErrors).length > 0) {
        setErrors(apiErrors)
        focusFirstError(apiErrors)
      }
      if (!res.ok || !data || typeof data !== 'object' || !('ok' in data) || data.ok !== true) {
        throw new Error('form submit rejected')
      }

      setSubmitted(true)
    } catch (err) {
      console.error('form submit failed', err)
      setSubmitError(true)
      window.turnstile?.reset?.()
      setTurnstileToken('')
    } finally {
      setSubmitting(false)
    }
  }

  const isSubmitDisabled =
    submitting || blockForMissingKey || (!!TURNSTILE_SITE_KEY && !turnstileToken)

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.75 }}
      className="pb-24"
    >
      <h1 className="font-display text-6xl md:text-8xl text-ink leading-[0.92] uppercase tracking-tight mb-2">
        {title}
      </h1>
      <div className="h-px w-24 bg-[var(--accent-line)] mb-12" />
      {intro && <p className="font-body text-white/60 max-w-2xl mb-12">{intro}</p>}

      {submitted ? (
        <motion.div
          ref={successRef}
          tabIndex={-1}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-20 outline-none"
          role="status"
        >
          <CheckCircle size={64} weight="fill" className="text-accent-ink mx-auto mb-6" />
          <h2 className="font-display text-4xl text-white mb-4">{successTitle}</h2>
          <p className="font-body text-white/60 max-w-md mx-auto">{successMsg}</p>
          <div className="flex flex-wrap gap-4 justify-center mt-8">
            <button
              type="button"
              onClick={handleSendAnother}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-[var(--accent-line)] px-7 py-4 font-grotesk text-ink hover:bg-[var(--accent-soft)] transition-colors"
            >
              {sendAnotherLabel}
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
            {fields.filter(field => !field.showIf || field.showIf(formData)).map(field => {
              const errId = `${field.id}-error`
              const describedBy = errors[field.id] ? errId : undefined
              const shared = {
                id: field.id,
                value: formData[field.id] ?? '',
                'aria-invalid': !!errors[field.id],
                'aria-describedby': describedBy,
                'aria-required': field.required || undefined,
                required: field.required,
              }
              // Conditional (showIf) fields mount after the parent's staggered
              // reveal has already fired, so they can't ride its orchestration —
              // give them a self-contained entrance instead.
              const motionProps = field.showIf
                ? {
                    initial: reduce ? false : { opacity: 0, y: 8 },
                    animate: reduce ? undefined : { opacity: 1, y: 0 },
                  }
                : { variants: reduce ? undefined : fadeUp }
              return (
                <motion.div
                  key={field.id}
                  className={field.fullWidth ? 'md:col-span-2' : ''}
                  {...motionProps}
                >
                  <label
                    htmlFor={field.id}
                    className="font-grotesk text-sm text-[var(--ink-72)] mb-1 block"
                  >
                    {field.label}
                    {field.required && <span className="text-accent2 ml-1" aria-hidden="true">*</span>}
                  </label>

                  {field.type === 'select' ? (
                    <select
                      {...shared}
                      onChange={e => handleChange(field.id, e.target.value)}
                      className={`${INPUT_CLS} appearance-none`}
                      style={{ colorScheme: 'dark' }}
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
                      {...shared}
                      rows={4}
                      placeholder={field.placeholder}
                      onChange={e => handleChange(field.id, e.target.value)}
                      className={`${INPUT_CLS} resize-none h-32`}
                    />
                  ) : (
                    <input
                      {...shared}
                      type={field.type}
                      min={field.min}
                      max={field.max}
                      step={field.step}
                      placeholder={field.placeholder}
                      onChange={e => handleChange(field.id, e.target.value)}
                      className={INPUT_CLS}
                      style={field.type === 'date' ? { colorScheme: 'dark' } : undefined}
                    />
                  )}

                  {errors[field.id] && (
                    <p id={errId} role="alert" className="font-body text-xs text-[var(--error)] mt-1">
                      {errors[field.id]}
                    </p>
                  )}
                </motion.div>
              )
            })}

            <div className="md:col-span-2">
              {TURNSTILE_SITE_KEY ? (
                <Turnstile siteKey={TURNSTILE_SITE_KEY} onToken={setTurnstileToken} />
              ) : blockForMissingKey ? (
                <p role="alert" className="bg-raise border border-[var(--error)] rounded-xl px-4 py-3 text-[var(--error)] text-sm font-grotesk">
                  This form is temporarily unavailable. Please email{' '}
                  <a href={`mailto:${contactEmail}`} className="underline">{contactEmail}</a>.
                </p>
              ) : (
                <div className="bg-raise border border-[var(--bg-line)] rounded-xl px-4 py-3 text-[var(--ink-32)] text-sm font-grotesk">
                  Turnstile widget loads here in production
                </div>
              )}
            </div>

            {submitError && (
              <p role="alert" className="font-body text-sm text-[var(--error)] text-center md:col-span-2">
                Something went wrong. Please try again or email{' '}
                <a href={`mailto:${contactEmail}`} className="underline">{contactEmail}</a>
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitDisabled}
              className="md:col-span-2 w-full inline-flex items-center justify-center bg-accent text-ink font-grotesk font-medium py-4 rounded-full text-[1rem] accent-press edge-refract disabled:opacity-50 disabled:cursor-not-allowed transition-opacity hover:opacity-90"
            >
              {submitting ? 'Sending...' : submitLabel}
            </button>
          </motion.div>
        </form>
      )}
    </motion.div>
  )
}
