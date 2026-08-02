// Rebuild every browser/OS icon from the one logo source, so a logo change is a
// single file swap plus a re-run. Reads public/logo-transparent.png, writes the
// favicon PNGs beside it — re-runnable, never reads its own output.
//
// Run: npm run icons:build
import path from 'node:path'
import sharp from 'sharp'

const SRC = 'public/logo-transparent.png'
const OUT_DIR = 'public'

// Transparent tile — the logo sits on whatever surface draws it. Owner's call: the
// solid #120917 tile read as a black box against light UI, which he did not want.
// Known tradeoff, measured: on the light chip Google/Bing results and light tab bars
// use, the cyan `st8` half lands at 1.43:1 — under the 3:1 floor, so the bottom of the
// lockup goes faint there. Set this to '#120917' to go back to the solid tile.
const BG = { r: 0, g: 0, b: 0, alpha: 0 }
// Fraction of the tile the logo occupies. The source has no transparent margin of its
// own (verified: trim() is a no-op on it), so this is the only breathing room there is.
// Full bleed is right for a transparent tile — there is no visible edge to read as
// clipped, and any inset is just dead space at 16px. Pair 0.82 with the solid tile.
const INSET = 1

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

  const bgLabel = typeof BG === 'string' ? BG : 'transparent'
  console.log(`${out.padEnd(28)} ${size}x${size}  logo ${inner}px on ${bgLabel}`)
}

const meta = await sharp(SRC).metadata()
console.log(`source ${SRC} ${meta.width}x${meta.height}\n`)
for (const out of OUTPUTS) await build(out)
