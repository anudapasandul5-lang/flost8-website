// Rebuild every roster portrait onto one canonical canvas so the eye line and the
// head size match across all artists. Reads pristine inputs from photos-src/,
// writes to public/photos/ — re-runnable, never reads its own output.
//
// Run: npm run photos:normalize
import { copyFile, mkdir, readdir } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const SRC_DIR = 'photos-src'
const OUT_DIR = 'public/photos'
// The artist page wants the photographer's original framing (full figure), not the
// head-matched roster crop, so the untouched source is published alongside it.
const FULL_DIR = 'public/photos/full'

// Square canonical canvas. The desktop roster card is square, and a square source
// into the 3:4 artist-page box crops the sides — which portraits have to spare.
// A 3:4 canvas instead would need 300-500px of invented background under the two
// chest-cropped photos; square keeps it to ~200px.
const W = 1100
const H = 1100
// Eye line, at 36% of canvas height.
const EYE_Y = 396
// Target head width (ear-to-ear incl. hair). Set near dr-green's native size so
// four of the six need no invented background at all.
const HEAD_W = 242
// Generous pad applied before the final extract, so placement offsets can be
// negative (crop) or positive (pad) without special-casing either.
const PAD = 1200
// A bottom pad deeper than this can't be edge-replicated — the subject is what
// sits on that edge, and copying it downward smears into vertical streaks. Those
// get a gradient dissolve into padColor instead.
const MAX_COPY_PAD = 40
const FADE = 260
// Every backdrop in the set bottoms out near black, so the fade resolves to this.
const PAD_COLOR = '#050505'

// Hand-measured off each source image, in that image's own pixel coordinates.
// eyeY = pupil/sunglasses height. headLeft/headRight = widest point of the head.
// cropBottom trims rows before scaling, to keep the subject off the bottom edge.
const FRAMES = {
  'dr-green': { eyeY: 424, headLeft: 440, headRight: 685 },
  maalin: { eyeY: 554, headLeft: 463, headRight: 652 },
  sonal: { eyeY: 550, headLeft: 414, headRight: 621 },
  anush: { eyeY: 320, headLeft: 280, headRight: 462, cropBottom: 790 },
  imthxd: { eyeY: 511, headLeft: 350, headRight: 650 },
  'the-professor': { eyeY: 440, headLeft: 265, headRight: 500, cropBottom: 820 },
}

async function normalize(slug, frame) {
  const src = path.join(SRC_DIR, `${slug}.webp`)
  const meta = await sharp(src).metadata()
  const srcH = frame.cropBottom ?? meta.height

  const base = sharp(src)
  if (frame.cropBottom) base.extract({ left: 0, top: 0, width: meta.width, height: srcH })

  const scale = HEAD_W / (frame.headRight - frame.headLeft)
  const scaledW = Math.round(meta.width * scale)
  const scaledH = Math.round(srcH * scale)

  // Where the scaled image's top-left must sit for the head to be centred and the
  // eyes to land on EYE_Y. Either offset can be negative (crop) or positive (pad).
  const left = Math.round(W / 2 - ((frame.headLeft + frame.headRight) / 2) * scale)
  const top = Math.round(EYE_Y - frame.eyeY * scale)
  const padBottom = Math.max(0, H - (top + scaledH))

  // extendWith 'copy' replicates the edge pixels — exact for the smooth studio
  // backdrops these photos sit on, as long as no subject touches that edge.
  const padded = await base
    .resize(scaledW, scaledH)
    .extend({ top: PAD, bottom: PAD, left: PAD, right: PAD, extendWith: 'copy' })
    .png()
    .toBuffer()

  const canvas = sharp(padded).extract({ left: PAD - left, top: PAD - top, width: W, height: H })

  // Deep bottom pad: dissolve the streaked copy into flat darkness instead.
  if (padBottom > MAX_COPY_PAD) {
    const bandY = H - padBottom - FADE
    const band = Buffer.from(
      `<svg width="${W}" height="${H}"><defs><linearGradient id="g" x1="0" y1="${bandY}" x2="0" y2="${H - padBottom}" gradientUnits="userSpaceOnUse">` +
        `<stop offset="0" stop-color="${PAD_COLOR}" stop-opacity="0"/>` +
        `<stop offset="1" stop-color="${PAD_COLOR}" stop-opacity="1"/></linearGradient></defs>` +
        `<rect x="0" y="${bandY}" width="${W}" height="${H - bandY}" fill="url(#g)"/></svg>`,
    )
    canvas.composite([{ input: band, top: 0, left: 0 }])
  }

  await canvas.webp({ quality: 82 }).toFile(path.join(OUT_DIR, `${slug}.webp`))

  console.log(
    `${slug.padEnd(14)} ${meta.width}x${meta.height} scale ${scale.toFixed(3)}` +
      `  pads L${Math.max(0, left)} T${Math.max(0, top)} R${Math.max(0, W - left - scaledW)} B${padBottom}`,
  )
}

const found = (await readdir(SRC_DIR)).filter((f) => f.endsWith('.webp')).map((f) => f.slice(0, -5))
const missing = found.filter((slug) => !FRAMES[slug])
if (missing.length) throw new Error(`No FRAMES entry for: ${missing.join(', ')}`)

await mkdir(FULL_DIR, { recursive: true })
for (const slug of found) {
  await normalize(slug, FRAMES[slug])
  await copyFile(path.join(SRC_DIR, `${slug}.webp`), path.join(FULL_DIR, `${slug}.webp`))
}
