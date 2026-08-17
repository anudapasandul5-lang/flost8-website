import { useState } from 'react'
import { Play } from '@phosphor-icons/react'
import {
  getYouTubeId,
  getYouTubeStart,
  getYouTubeThumb,
  getYouTubeThumbFallback,
  buildYouTubeEmbed,
  buildSoundCloudEmbed,
} from '../../lib/embeds'
import type { MusicLink } from '../../lib/artistRoster'

interface MusicEmbedProps {
  link: MusicLink
}

export default function MusicEmbed({ link }: MusicEmbedProps) {
  const [loaded, setLoaded] = useState(false)
  const [iframeReady, setIframeReady] = useState(false)
  // 'max' = maxresdefault (1280x720, not always rendered by YouTube), 'hq' = the
  // guaranteed-to-exist fallback (480x360), 'none' = both 404'd.
  const [thumbStage, setThumbStage] = useState<'max' | 'hq' | 'none'>('max')

  if (link.type === 'youtube') {
    const id = getYouTubeId(link.url)
    if (!id) return null

    return (
      <div className="relative aspect-video w-full overflow-hidden rounded-2xl edge-refract">
        {/* Thumbnail stays mounted underneath so the iframe's load gap never shows as a blank flash */}
        {thumbStage !== 'none' ? (
          <img
            src={thumbStage === 'max' ? getYouTubeThumb(id) : getYouTubeThumbFallback(id)}
            alt=""
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover"
            onError={() => setThumbStage((stage) => (stage === 'max' ? 'hq' : 'none'))}
            onLoad={(e) => {
              // Missing maxresdefault renders don't 404 - YouTube serves a 200 OK
              // 120x90 gray placeholder instead, so onError never fires. Catch it here.
              if (thumbStage === 'max' && e.currentTarget.naturalWidth <= 120) {
                setThumbStage('hq')
              }
            }}
          />
        ) : (
          <div className="absolute inset-0 bg-raise" />
        )}

        {!loaded && (
          <button
            type="button"
            aria-label={`Play ${link.title ?? 'track'}`}
            onClick={() => setLoaded(true)}
            className="group absolute inset-0 accent-press"
          >
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
        )}

        {loaded && (
          <iframe
            title={link.title ?? 'YouTube player'}
            src={buildYouTubeEmbed(id, getYouTubeStart(link.url))}
            className="absolute inset-0 h-full w-full transition-opacity duration-300"
            style={{ opacity: iframeReady ? 1 : 0 }}
            onLoad={() => setIframeReady(true)}
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
          />
        )}
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
