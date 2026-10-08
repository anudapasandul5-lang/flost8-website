import Releases from '../components/sections/Releases'

export default function MusicPage() {
  // pt-20 clears the fixed nav pill; Releases supplies the rest of the top rhythm.
  return (
    <main id="main-content" tabIndex={-1} className="bg-base min-h-[100dvh] pt-20 outline-none">
      <Releases />
    </main>
  )
}
