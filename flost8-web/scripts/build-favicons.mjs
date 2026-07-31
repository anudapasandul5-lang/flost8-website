// Rebuild every browser/OS icon from the one logo source, so a logo change is a
// single file swap plus a re-run. Reads public/logo-transparent.png, writes the
// favicon PNGs beside it — re-runnable, never reads its own output.
//
// Run: npm run icons:build
import path from 'node:path'
import sharp from 'sharp'

const SRC = 'public/logo-transparent.png'
const OUT_DIR = 'public'

// Solid tile in the site's own base colour. Transparent was tried first and reverted:
// measured against the light chip that Google/Bing results and light tab bars draw the
// icon on, the cyan `st8` half lands at 1.43:1 contrast — under the 3:1 floor, so the
// bottom of the lockup all but disappears. On this tile both halves clear 4.5:1.
// Set this to { r: 0, g: 0, b: 0, alpha: 0 } to go back to a transparent tile.
const BG = '#120917'
// Fraction of the tile the logo occupies. The source has no transparent margin of its
// own (verified: trim() is a no-op on it), so this is the only breathing room there is.
// A mark flush to the edge of a *solid* tile reads as clipped once a surface rounds the
// corners — on a transparent tile there is no visible edge, which is why that variant
// used full bleed instead.
const INSET = 0.82

// ponytail: no rounded corners. iOS masks apple-touch-icon itself, and a radius
// is sub-pixel at 48px. Add one only if a surface turns up that draws the tile square.
const OUTPUTS = [
  { size: 48, file: 'favicon-48.png' },
  { size: 192, file: 'favicon-192.png' },
  { size: 512, file: 'favicon-512.png' },
  { size: 180, file: 'apple-touch-icon.png' },
]

async function build({ size, file }) {
  const inner = Math.round(size * INSET)

  // 'contain' keeps the logo's 514x555 aspect, so the shorter axis pads out to
  // inner and the composite below centres what it's actually given.
  const logo = await sharp(SRC)
    .resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer()

  const out = path.join(OUT_DIR, file)
  await sharp({ create: { width: size, height: size, channels: 4, background: BG } })
    .composite([{ input: logo, gravity: 'centre' }])
    .png()
    .toFile(out)

  console.log(`${out.padEnd(28)} ${size}x${size}  logo ${inner}px on ${BG}`)
}

const meta = await sharp(SRC).metadata()
console.log(`source ${SRC} ${meta.width}x${meta.height}\n`)
for (const out of OUTPUTS) await build(out)
