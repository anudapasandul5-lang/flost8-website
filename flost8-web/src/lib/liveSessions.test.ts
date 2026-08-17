import { describe, it, expect } from 'vitest'
import { LIVE_SESSIONS } from './liveSessions'
import { getYouTubeId } from './embeds'

describe('LIVE_SESSIONS', () => {
  it('every url resolves to a valid YouTube video id', () => {
    for (const session of LIVE_SESSIONS) {
      expect(getYouTubeId(session.url), `${session.guest} (EP ${session.ep})`).not.toBeNull()
    }
  })

  it('episode numbers are unique', () => {
    const eps = LIVE_SESSIONS.map((s) => s.ep)
    expect(new Set(eps).size).toBe(eps.length)
  })
})
