export interface LiveSession {
  ep: number
  guest: string
  /** Roster slug when the guest is a FLOST8 artist — card links to /artist/<slug>. */
  artistSlug?: string
  /** Instagram profile for guests not on the roster — card links out there instead. */
  instagramUrl?: string
  url: string
}

// Newest first.
export const LIVE_SESSIONS: LiveSession[] = [
  { ep: 2, guest: 'ROCKKA', instagramUrl: 'https://www.instagram.com/rockka01/', url: 'https://youtu.be/RpTDu1OmLL8' },
  { ep: 1, guest: 'DR. GREEN', artistSlug: 'dr-green', url: 'https://youtu.be/HIHXR3YRYns' },
]

export const YOUTUBE_CHANNEL = 'https://www.youtube.com/channel/UCwLP7XXZ0NfbOfH2w4n8Urw'
