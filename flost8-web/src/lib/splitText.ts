// Pure DOM helpers for the Hero motion layer. No React, no anime.js — just
// turns text into animatable spans (outer .char for scatter, inner .glyph for hover).

export interface CharNode {
  /** Outer span — owns scatter transforms (translate/rotate/opacity). */
  char: HTMLSpanElement
  /** Inner span — owns hover transforms (scale/translate). */
  glyph: HTMLSpanElement
  /** The final character this node represents (for scramble restore). */
  final: string
}

/**
 * Replaces `el`'s text with per-character wrappers, grouped by word:
 *   <span class="word"><span class="char"><span class="glyph">X</span></span>…</span>
 * Each word is an inline-block (`white-space: nowrap`) so letters never break
 * mid-word; real breaking spaces sit between words so the line still wraps at
 * word boundaries. The outer/inner char split lets scatter (outer .char) and
 * hover (inner .glyph) animate transforms without fighting.
 * Returns a flat list of char nodes (visual only — keep an aria-label on a parent).
 */
export function splitGraphemes(el: HTMLElement): CharNode[] {
  const text = el.textContent ?? ''
  el.textContent = ''
  const nodes: CharNode[] = []
  const words = text.split(' ')
  words.forEach((word, wi) => {
    // Real breaking space between words (allows wrapping at word boundaries).
    if (wi > 0) el.appendChild(document.createTextNode(' '))
    if (word === '') return
    const wordSpan = document.createElement('span')
    wordSpan.className = 'word'
    for (const ch of [...word]) {
      const char = document.createElement('span')
      char.className = 'char'
      char.setAttribute('aria-hidden', 'true')
      const glyph = document.createElement('span')
      glyph.className = 'glyph'
      glyph.textContent = ch
      char.appendChild(glyph)
      wordSpan.appendChild(char)
      nodes.push({ char, glyph, final: ch })
    }
    el.appendChild(wordSpan)
  })
  return nodes
}
