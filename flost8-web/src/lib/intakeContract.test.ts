import {
  PARTNER_FIELDS,
  COLLAB_FIELDS,
  JOIN_FIELDS,
  emptyIntakeForm,
  validateIntake,
  buildIntakePayload,
} from './intakeContract'

describe('emptyIntakeForm', () => {
  it('returns all field ids mapped to empty strings', () => {
    const form = emptyIntakeForm(PARTNER_FIELDS)
    PARTNER_FIELDS.forEach(field => {
      expect(form[field.id]).toBe('')
    })
    expect(Object.keys(form)).toHaveLength(PARTNER_FIELDS.length)
  })
})

describe('validateIntake', () => {
  it('flags missing required fields', () => {
    const data = emptyIntakeForm(PARTNER_FIELDS)
    const errors = validateIntake(PARTNER_FIELDS, data)

    expect(errors.org_name).toBe('This field is required')
    expect(errors.contact_name).toBe('This field is required')
    expect(errors.email).toBe('This field is required')
    expect(errors.partnership_type).toBe('This field is required')
    expect(errors.message).toBe('This field is required')
    // optional field should not be flagged
    expect(errors.phone).toBeUndefined()
  })

  it('passes validation when all required fields are filled', () => {
    const data = {
      ...emptyIntakeForm(PARTNER_FIELDS),
      org_name: 'Acme',
      contact_name: 'Jane Doe',
      email: 'jane@example.com',
      partnership_type: 'Sponsorship',
      message: 'We would love to partner.',
    }

    const errors = validateIntake(PARTNER_FIELDS, data)
    expect(errors).toEqual({})
  })

  it('flags an invalid email on email-type fields', () => {
    const data = {
      ...emptyIntakeForm(PARTNER_FIELDS),
      org_name: 'Acme',
      contact_name: 'Jane Doe',
      email: 'not-an-email',
      partnership_type: 'Sponsorship',
      message: 'We would love to partner.',
    }

    const errors = validateIntake(PARTNER_FIELDS, data)
    expect(errors.email).toBe('Enter a valid email')
  })

  it('does not flag optional empty fields', () => {
    const data = {
      ...emptyIntakeForm(COLLAB_FIELDS),
      name: 'Sam',
      role: 'Brand',
      email: 'sam@example.com',
      campaign_brief: 'A great idea.',
      // budget and timeline left empty (optional)
    }

    const errors = validateIntake(COLLAB_FIELDS, data)
    expect(errors).toEqual({})
  })

  it('validates JOIN_FIELDS required fields including phone', () => {
    const data = emptyIntakeForm(JOIN_FIELDS)
    const errors = validateIntake(JOIN_FIELDS, data)

    expect(errors.act_name).toBe('This field is required')
    expect(errors.email).toBe('This field is required')
    expect(errors.phone).toBe('This field is required')
    expect(errors.genre).toBe('This field is required')
    expect(errors.why).toBe('This field is required')
    // links is not required
    expect(errors.links).toBeUndefined()
  })
})

describe('buildIntakePayload', () => {
  it('includes type, token, and all data keys', () => {
    const data = {
      ...emptyIntakeForm(JOIN_FIELDS),
      act_name: 'DJ Test',
      email: 'dj@example.com',
      phone: '+94 77 000 0000',
      genre: 'House',
      links: 'https://instagram.com/djtest',
      why: 'Because we are the right fit.',
    }

    const payload = buildIntakePayload('join', data, 'token-123')

    expect(payload.type).toBe('join')
    expect(payload.token).toBe('token-123')
    Object.entries(data).forEach(([key, value]) => {
      expect(payload[key]).toBe(value)
    })
  })
})
