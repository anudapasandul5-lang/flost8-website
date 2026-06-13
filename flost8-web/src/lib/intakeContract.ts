export type IntakeType = 'partner' | 'collab' | 'join'

export interface IntakeFieldDef {
  id: string
  label: string
  type: 'text' | 'email' | 'tel' | 'select' | 'textarea'
  required: boolean
  placeholder?: string
  options?: Array<{ value: string; label: string }>
  fullWidth?: boolean
}

export type IntakeFormData = Record<string, string>

export interface IntakePayload extends IntakeFormData {
  type: IntakeType
  token: string
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const PARTNER_FIELDS: IntakeFieldDef[] = [
  { id: 'org_name', label: 'Brand / org name', type: 'text', required: true, placeholder: 'Brand / org name' },
  { id: 'contact_name', label: 'Your name', type: 'text', required: true, placeholder: 'Your name' },
  { id: 'email', label: 'Email', type: 'email', required: true, placeholder: 'you@example.com' },
  { id: 'phone', label: 'Phone', type: 'tel', required: false, placeholder: '+94 77 000 0000' },
  {
    id: 'partnership_type',
    label: 'Partnership Type',
    type: 'select',
    required: true,
    options: [
      { value: 'Content', label: 'Content' },
      { value: 'Sponsorship', label: 'Sponsorship' },
      { value: 'Long-term', label: 'Long-term' },
    ],
  },
  {
    id: 'message',
    label: 'Message',
    type: 'textarea',
    required: true,
    placeholder: 'What do you have in mind?',
    fullWidth: true,
  },
]

export const COLLAB_FIELDS: IntakeFieldDef[] = [
  { id: 'name', label: 'Name', type: 'text', required: true, placeholder: 'Your name' },
  {
    id: 'role',
    label: 'Role',
    type: 'select',
    required: true,
    options: [
      { value: 'Brand', label: 'Brand' },
      { value: 'Artist', label: 'Artist' },
      { value: 'Venue', label: 'Venue' },
      { value: 'Partner', label: 'Partner' },
    ],
  },
  { id: 'email', label: 'Email', type: 'email', required: true, placeholder: 'you@example.com' },
  {
    id: 'campaign_brief',
    label: 'Campaign Brief',
    type: 'textarea',
    required: true,
    placeholder: 'Campaign / idea brief',
    fullWidth: true,
  },
  { id: 'budget', label: 'Budget', type: 'text', required: false, placeholder: 'Budget range (optional)' },
  { id: 'timeline', label: 'Timeline', type: 'text', required: false, placeholder: 'Timeline (optional)' },
]

export const JOIN_FIELDS: IntakeFieldDef[] = [
  { id: 'act_name', label: 'Artist / act name', type: 'text', required: true, placeholder: 'Artist / act name' },
  { id: 'email', label: 'Email', type: 'email', required: true, placeholder: 'you@example.com' },
  { id: 'phone', label: 'Phone', type: 'tel', required: true, placeholder: '+94 77 000 0000' },
  { id: 'genre', label: 'Genre', type: 'text', required: true, placeholder: 'Genre' },
  {
    id: 'links',
    label: 'Links',
    type: 'text',
    required: false,
    placeholder: 'Links - IG / SoundCloud / YouTube',
    fullWidth: true,
  },
  {
    id: 'why',
    label: 'Why FLOST8?',
    type: 'textarea',
    required: true,
    placeholder: 'Why FLOST8?',
    fullWidth: true,
  },
]

export function emptyIntakeForm(fields: IntakeFieldDef[]): IntakeFormData {
  return fields.reduce<IntakeFormData>((acc, field) => {
    acc[field.id] = ''
    return acc
  }, {})
}

export function validateIntake(fields: IntakeFieldDef[], data: IntakeFormData): Record<string, string> {
  return fields.reduce<Record<string, string>>((errors, field) => {
    const value = String(data[field.id] ?? '').trim()

    if (field.required && !value) {
      errors[field.id] = 'This field is required'
      return errors
    }

    if (!value) return errors

    if (field.id === 'email' && !EMAIL_RE.test(value)) {
      errors[field.id] = 'Enter a valid email'
    }

    return errors
  }, {})
}

export function buildIntakePayload(type: IntakeType, data: IntakeFormData, token: string): IntakePayload {
  return {
    type,
    ...data,
    token,
  }
}
