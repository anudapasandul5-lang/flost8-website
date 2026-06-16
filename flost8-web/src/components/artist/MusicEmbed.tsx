import { useState } from 'react'
import { Play } from '@phosphor-icons/react'
import {
  getYouTubeId,
  getYouTubeStart,
  getYouTubeThumb,
  buildYouTubeEmbed,
  buildSoundCloudEmbed,
} from '../../lib/embeds'
import type { MusicLink } from '../../lib/artistRoster'

interface MusicEmbedProps {
  link: MusicLink
}

export default function MusicEmbed({ link }: MusicEmbedProps) {
  const [loaded, setLoaded] = useState(false)
  const [thumbError, setThumbError] = useState(false)

  if (link.type === 'youtube') {
    const id = getYouTubeId(link.url)
    if (!id) return null

    if (!loaded) {
      return (
        <button
          type="button"
          aria-label={`Play ${link.title ?? 'track'}`}
          onClick={() => setLoaded(true)}
          className="group relative aspect-video w-full overflow-hidden rounded-2xl edge-refract accent-press"
        >
          {/* Thumbnail or fallback fill */}
          {!thumbError ? (
            <img
              src={getYouTubeThumb(id)}
              alt=""
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover"
              onError={() => setThumbError(true)}
            />
          ) : (
            <div className="absolute inset-0 bg-raise" />
          )}

          {/* Dark scrim */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

          {/* Centered play circle */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent edge-refract transition-transform duration-200 group-hover:scale-110">
              <Play size={28} weight="fill" className="text-ink translate-x-0.5" />
            </div>
          </div>

          {/* Title bottom-left */}
          {link.title && (
            <span className="absolute bottom-3 left-4 font-grotesk text-sm text-[var(--ink-72)] line-clamp-1">
              {link.title}
            </span>
          )}
        </button>
      )
    }

    return (
      <div className="relative aspect-video w-full overflow-hidden rounded-2xl">
        <iframe
          title={link.title ?? 'YouTube player'}
          src={buildYouTubeEmbed(id, getYouTubeStart(link.url))}
          className="absolute inset-0 h-full w-full"
          loading="lazy"
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
        />
      </div>
    )
  }

  // SoundCloud branch
  if (!loaded) {
    return (
      <button
        type="button"
        aria-label={`Play ${link.title ?? 'SoundCloud set'}`}
        onClick={() => setLoaded(true)}
        className="group flex aspect-video w-full flex-col items-center justify-center gap-3 overflow-hidden rounded-2xl edge-refract bg-raise accent-press"
      >
        {/* Play circle */}
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent edge-refract transition-transform duration-200 group-hover:scale-110">
          <Play size={28} weight="fill" className="text-ink translate-x-0.5" />
        </div>

        {/* SoundCloud label */}
        <span className="font-grotesk text-sm uppercase tracking-wide text-[var(--ink-72)]">
          SoundCloud
        </span>

        {/* Optional title */}
        {link.title && (
          <span className="font-grotesk text-xs text-[var(--ink-50)] line-clamp-1 px-4">
            {link.title}
          </span>
        )}
      </button>
    )
  }

  return (
    <div className="h-[166px] w-full overflow-hidden rounded-2xl">
      <iframe
        title={link.title ?? 'SoundCloud player'}
        src={buildSoundCloudEmbed(link.url)}
        className="h-full w-full"
        loading="lazy"
        allow="autoplay"
      />
    </div>
  )
}
