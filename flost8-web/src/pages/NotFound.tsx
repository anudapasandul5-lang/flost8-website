import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <main id="main-content" tabIndex={-1} className="bg-base min-h-[100dvh] pt-32 outline-none">
      <div className="max-w-6xl mx-auto px-4 md:px-8 pb-24 text-center">
        <h1 className="font-display text-6xl md:text-8xl text-ink uppercase tracking-tight mb-4">404</h1>
        <div className="h-px w-24 bg-[var(--accent-line)] mx-auto mb-8" />
        <p className="font-body text-white/60 mb-8">This page doesn't exist.</p>
        <Link
          to="/"
          className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-accent px-7 py-4 font-grotesk text-ink accent-press edge-refract"
        >
          Back home
        </Link>
      </div>
    </main>
  )
}
