export default function LivePhoto() {
  return (
    <section className="relative min-h-[50vh] md:min-h-[60vh] overflow-hidden">
      {/* Placeholder — replace with real photo when available */}
      <div
        className="absolute inset-0 bg-gradient-to-b from-[#2D1B69] via-[#1A0A3D] to-[#0D0520]"
        role="img"
        aria-label="Live DJ performance with crowd"
      />
      {/* Subtle radial glow overlay for texture */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage:
            'radial-gradient(circle at 50% 50%, rgba(120,244,245,0.3) 0%, transparent 70%)',
        }}
      />
      {/* Content overlay */}
      <div className="relative z-10 flex items-center justify-center min-h-[50vh] md:min-h-[60vh]">
        <div className="text-center">
          <p className="font-body text-white/30 text-sm uppercase tracking-widest">
            [ Live photo coming soon ]
          </p>
        </div>
      </div>
    </section>
  )
}
