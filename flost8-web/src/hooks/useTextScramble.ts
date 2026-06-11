import { useState, useEffect } from 'react'

// Letters only — calmer than symbols/digits, reads as a clean decode.
const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
// How many characters scramble at the leading edge. Small window = a tidy
// sweep left-to-right instead of the whole line jittering at once.
const WINDOW = 2

function isReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

/**
 * Resolves `finalText` with a clean left-to-right scramble sweep.
 * - First paint is the real text (no gibberish flash on reload).
 * - Only a 2-char window cycles as the reveal passes; settled and
 *   not-yet-reached characters stay put, so nothing bounces around.
 */
export function useTextScramble(finalText: string, duration = 1500): string {
  // Start settled — avoids the random-gibberish flash on mount/reload.
  const [display, setDisplay] = useState<string>(finalText)

  useEffect(() => {
    if (isReducedMotion()) {
      setDisplay(finalText)
      return
    }

    const nonSpaceIndices = finalText
      .split('')
      .reduce<number[]>((acc, c, i) => (c !== ' ' ? [...acc, i] : acc), [])

    const stepCount = nonSpaceIndices.length
    if (stepCount === 0) return
    const stepInterval = duration / stepCount

    let revealed = 0
    const interval = setInterval(() => {
      if (revealed >= stepCount) {
        clearInterval(interval)
        setDisplay(finalText)
        return
      }

      const chars = finalText.split('')
      // Only the small leading window scrambles; everything else is final.
      for (let k = revealed; k < Math.min(revealed + WINDOW, stepCount); k++) {
        const idx = nonSpaceIndices[k]
        chars[idx] = CHARS[Math.floor(Math.random() * CHARS.length)]
      }
      revealed++

      setDisplay(chars.join(''))
    }, stepInterval)

    return () => clearInterval(interval)
  }, [finalText, duration])

  return display
}
