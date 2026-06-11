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
    glyph.textContent = ch === ' ' ? ' ' : ch
    char.appendChild(glyph)
    el.appendChild(char)
    nodes.push({ char, glyph, final: ch })
  }
  return nodes
}
