import { describe, expect, it } from 'vitest'
import { getConsent, isPrivatePath, setConsent, track } from './analytics'

describe('analytics', () => {
  it('never tracks the staff tools', () => {
    expect(isPrivatePath('/admin')).toBe(true)
    expect(isPrivatePath('/manage/contacts')).toBe(true)
    expect(isPrivatePath('/')).toBe(false)
    expect(isPrivatePath('/artist/admin-x')).toBe(false)
    expect(isPrivatePath('/administer')).toBe(false)
  })

  it('remembers the visitor choice, and is silent with no key', () => {
    expect(getConsent()).toBeNull()
    setConsent('denied')
    expect(getConsent()).toBe('denied')
    expect(() => track('anything')).not.toThrow()
  })
})
