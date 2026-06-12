import { renderHook } from '@testing-library/react'
import { useMotionSafe } from './useMotionSafe'

describe('useMotionSafe', () => {
  it('returns reduce=true when source is true', () => {
    const { result } = renderHook(() => useMotionSafe(true))
    expect(result.current.reduce).toBe(true)
  })

  it('returns reduce=false when source is false', () => {
    const { result } = renderHook(() => useMotionSafe(false))
    expect(result.current.reduce).toBe(false)
  })

  it('returns reduce=true when source is null', () => {
    const { result } = renderHook(() => useMotionSafe(null))
    expect(result.current.reduce).toBe(true)
  })

  it('guard does not call run when reduce=true and returns a no-op cleanup', () => {
    const { result } = renderHook(() => useMotionSafe(true))
    const run = vi.fn()

    const cleanup = result.current.guard(run)

    expect(run).not.toHaveBeenCalled()
    expect(() => cleanup()).not.toThrow()
  })

  it('guard calls run when reduce=false and returns run\'s cleanup', () => {
    const { result } = renderHook(() => useMotionSafe(false))
    const innerCleanup = vi.fn()
    const run = vi.fn(() => innerCleanup)

    const cleanup = result.current.guard(run)

    expect(run).toHaveBeenCalledTimes(1)
    expect(cleanup).toBe(innerCleanup)
  })

  it('variant returns the motion variants unchanged when reduce=false', () => {
    const { result } = renderHook(() => useMotionSafe(false))
    const motion = { hidden: { opacity: 0 }, visible: { opacity: 1 } }

    expect(result.current.variant(motion)).toBe(motion)
  })

  it('variant returns the default static variants when reduce=true and no staticV given', () => {
    const { result } = renderHook(() => useMotionSafe(true))
    const motion = { hidden: { opacity: 0 }, visible: { opacity: 1 } }

    expect(result.current.variant(motion)).toEqual({
      hidden: { opacity: 1, y: 0 },
      visible: { opacity: 1, y: 0 },
    })
  })

  it('variant returns the provided staticV when reduce=true', () => {
    const { result } = renderHook(() => useMotionSafe(true))
    const motion = { hidden: { opacity: 0 }, visible: { opacity: 1 } }
    const staticV = { hidden: { opacity: 0.5 }, visible: { opacity: 0.5 } }

    expect(result.current.variant(motion, staticV)).toBe(staticV)
  })

  it('reads reduce synchronously from window.matchMedia when source is undefined', () => {
    const matches = true
    const listeners: Array<(e: { matches: boolean }) => void> = []

    vi.stubGlobal('matchMedia', (_query: string) => ({
      matches,
      media: _query,
      addEventListener: (_: string, cb: (e: { matches: boolean }) => void) => {
        listeners.push(cb)
      },
      removeEventListener: (_: string, cb: (e: { matches: boolean }) => void) => {
        const i = listeners.indexOf(cb)
        if (i >= 0) listeners.splice(i, 1)
      },
    }))

    try {
      const { result } = renderHook(() => useMotionSafe())
      expect(result.current.reduce).toBe(matches)
    } finally {
      vi.unstubAllGlobals()
    }
  })
})
