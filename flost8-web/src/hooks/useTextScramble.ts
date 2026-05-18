import { useState, useEffect } from 'react'

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&'

export function useTextScramble(finalText: string, duration = 1500): string {
  const [display, setDisplay] = useState<string>(() =>
    finalText
      .split('')
      .map((c) => (c === ' ' ? ' ' : CHARS[Math.floor(Math.random() * CHARS.length)]))
      .join('')
  )

  useEffect(() => {
    const nonSpaceIndices = finalText
      .split('')
      .reduce<number[]>((acc, c, i) => (c !== ' ' ? [...acc, i] : acc), [])

    const stepCount = nonSpaceIndices.length
    const stepInterval = duration / stepCount

    let revealed = 0
    const chars = finalText
      .split('')
      .map((c) => (c === ' ' ? ' ' : CHARS[Math.floor(Math.random() * CHARS.length)]))

    const interval = setInterval(() => {
      if (revealed >= stepCount) {
        clearInterval(interval)
        setDisplay(finalText)
        return
      }

      // Reveal next character
      const idx = nonSpaceIndices[revealed]
      chars[idx] = finalText[idx]
      revealed++

      // Randomise remaining unrevealed chars
      for (let i = revealed; i < stepCount; i++) {
        const charIdx = nonSpaceIndices[i]
        chars[charIdx] = CHARS[Math.floor(Math.random() * CHARS.length)]
      }

      setDisplay(chars.join(''))
    }, stepInterval)

    return () => clearInterval(interval)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finalText, duration])

  // Reset when totalChars changes (re-mount)
  useEffect(() => {
    setDisplay(
      finalText
        .split('')
        .map((c) => (c === ' ' ? ' ' : CHARS[Math.floor(Math.random() * CHARS.length)]))
        .join('')
    )
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return display
}
