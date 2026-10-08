import LiveSessions from '../components/sections/LiveSessions'

export default function LiveSessionsPage() {
  // pt-20 clears the fixed nav pill; LiveSessions' own py-10/md:py-20 supplies the
  // rest of the top rhythm, so no double stacking.
  return (
    <main id="main-content" tabIndex={-1} className="bg-base min-h-[100dvh] pt-20 outline-none">
      <LiveSessions variant="full" />
    </main>
  )
}
