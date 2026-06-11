// Pure DOM helpers for the Hero motion layer. No React, no anime.js — just
// turns text into animatable spans and scrambles a node's text content.

// Letters + a few symbols. Calm enough for the brand, with a little grit.
export const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ#%&/·'

export interface CharNode {
  /** Outer span — owns scatter transforms (translate/rotate/opacity). */
  char: HTMLSpanElement
  /** Inner span — owns hover transforms (scale/translate). */
  glyph: HTMLSpanElement
  /** The final character this node represents (for scramble restore). */
  final: string
}

/**
 * Replaces `el`'s text with one wrapper per character:
 *   <span class="char"><span class="glyph">X</span></span>
 * Spaces are preserved as non-breaking glyphs. The outer/inner split lets
 * scatter (outer) and hover (inner) animate transforms without fighting.
 * Returns the created char nodes (visual only — keep an aria-label on a parent).
 */
export function splitGraphemes(el: HTMLElement): CharNode[] {
  const text = el.textContent ?? ''
  el.textContent = ''
  const nodes: CharNode[] = []
  for (const ch of [...text]) {
    const char = document.createElement('span')
    char.className = 'char'
    char.setAttribute('aria-hidden', 'true')
    const glyph = document.createElement('span')
    glyph.className = 'glyph'
    glyph.textContent = ch === ' ' ? ' ' : ch
    char.appendChild(glyph)
    el.appendChild(char)
    nodes.push({ char, glyph, final: ch })
  }
  return nodes
}

export interface ScrambleOptions {
  frames?: number
  speedMs?: number
  onDone?: () => void
}

/**
 * Scrambles `el`'s textContent toward `finalText` with a left-to-right reveal,
 * then sets the exact final text. Returns a stop() that clears the timer.
 * Uses textContent only (never innerHTML) — zero injection surface.
 */
export function runScramble(
  el: HTMLElement,
  finalText: string,
  { frames = 22, speedMs = 42, onDone }: ScrambleOptions = {},
): () => void {
  let frame = 0
  const id = window.setInterval(() => {
    const revealCount = Math.floor((frame / frames) * finalText.length)
    let out = ''
    for (let i = 0; i < finalText.length; i++) {
      const fc = finalText[i]
      out += fc === ' '
        ? ' '
        : i < revealCount
          ? fc
          : GLYPHS[Math.floor(Math.random() * GLYPHS.length)]
    }
    el.textContent = out
    if (frame++ >= frames) {
      window.clearInterval(id)
      el.textContent = finalText
      onDone?.()
    }
  }, speedMs)
  return () => window.clearInterval(id)
}
