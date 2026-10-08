import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import type { Release } from '../lib/releases'

// One track at a time, no visible widget. Beatport = the track's 2-minute preview MP3 in
// ONE shared <audio>. SoundCloud = a 1px hidden iframe driven by its Widget API. Both
// outlive track changes: the elements are created once and only their source changes,
// so selecting a track never remounts anything.

interface SCWidget {
  bind(event: string, fn: (e: { currentPosition: number }) => void): void
  load(url: string, opts: Record<string, unknown>): void
  play(): void
  pause(): void
  getDuration(cb: (ms: number) => void): void
}
type SCGlobal = { Widget: ((iframe: HTMLIFrameElement) => SCWidget) & { Events: Record<string, string> } }
declare global {
  interface Window {
    SC?: SCGlobal
  }
}

const SC_API = 'https://w.soundcloud.com/player/api.js'
export const scEmbed = (url: string) =>
  `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&auto_play=false&hide_related=true&show_comments=false&visual=false`
// If a hidden widget has not started this long after play(), the browser blocked it
// (iOS needs the tap on the widget itself). The page then shows the widget instead.
const SC_START_TIMEOUT_MS = 6000

let scApi: Promise<SCGlobal> | null = null
function loadScApi(): Promise<SCGlobal> {
  scApi ??= new Promise((resolve, reject) => {
    if (window.SC) return resolve(window.SC)
    const s = document.createElement('script')
    s.src = SC_API
    s.async = true
    s.onload = () => (window.SC ? resolve(window.SC) : reject(new Error('SC missing')))
    s.onerror = () => {
      scApi = null
      reject(new Error('SC api failed'))
    }
    document.head.appendChild(s)
  })
  return scApi
}

// Playback position changes ~4x a second; keeping it out of React state means the stage
// does not re-render for it. Only <Progress> subscribes.
type Progress = { pos: number; dur: number }
type ProgressStore = ReturnType<typeof createProgressStore>
function createProgressStore() {
  let snap: Progress = { pos: 0, dur: 0 }
  const subs = new Set<() => void>()
  return {
    set(pos: number, dur: number) {
      snap = { pos, dur }
      subs.forEach((fn) => fn())
    },
    subscribe(fn: () => void) {
      subs.add(fn)
      return () => subs.delete(fn)
    },
    get: () => snap,
  }
}

export interface ReleasePlayer {
  /** The track loaded in the player (playing or paused); null before anything is chosen. */
  release: Release | null
  playing: boolean
  /** True when a SoundCloud track could not autoplay hidden, so the page should show the widget. */
  blocked: boolean
  toggle: (r: Release) => void
  stop: () => void
  /** Playback position store; read it with useTrackPosition(). */
  progress: ProgressStore
}

export function useReleasePlayer(): ReleasePlayer {
  const [release, setRelease] = useState<Release | null>(null)
  const [playing, setPlaying] = useState(false)
  const [blocked, setBlocked] = useState(false)

  const [store] = useState(createProgressStore)
  const audio = useRef<HTMLAudioElement | null>(null)
  const widget = useRef<SCWidget | null>(null)
  const frame = useRef<HTMLIFrameElement | null>(null)
  const loadedId = useRef<string | null>(null)
  // Bumped on every start/stop so late async callbacks from an older track are ignored.
  const token = useRef(0)
  const scStarted = useRef(false)

  const getAudio = useCallback(() => {
    if (audio.current) return audio.current
    const a = new Audio()
    a.preload = 'none'
    // loadedId is null after stop(); a timeupdate still queued from the old track must not
    // overwrite the reset position.
    a.ontimeupdate = () => {
      if (loadedId.current) store.set(a.currentTime, a.duration || 0)
    }
    a.onended = () => setPlaying(false)
    a.onerror = () => setPlaying(false)
    audio.current = a
    return a
  }, [store])

  const getWidget = useCallback(async () => {
    if (widget.current) return widget.current
    const SC = await loadScApi()
    if (widget.current) return widget.current
    const f = document.createElement('iframe')
    f.title = 'SoundCloud audio'
    f.allow = 'autoplay'
    f.setAttribute('aria-hidden', 'true')
    f.tabIndex = -1
    f.style.cssText = 'position:fixed;bottom:0;left:0;width:1px;height:1px;opacity:0;pointer-events:none;border:0'
    f.src = scEmbed('https://soundcloud.com/deejanush')
    document.body.appendChild(f)
    frame.current = f
    const w = SC.Widget(f)
    w.bind(SC.Widget.Events.PLAY, () => {
      scStarted.current = true
      setBlocked(false) // a slow first load can outlast the timeout; self-correct
      setPlaying(true)
    })
    w.bind(SC.Widget.Events.PAUSE, () => setPlaying(false))
    w.bind(SC.Widget.Events.FINISH, () => setPlaying(false))
    w.bind(SC.Widget.Events.PLAY_PROGRESS, (e) =>
      w.getDuration((d) => store.set(e.currentPosition / 1000, d / 1000)),
    )
    widget.current = w
    return w
  }, [store])

  const pauseAll = useCallback(() => {
    audio.current?.pause()
    widget.current?.pause()
  }, [])

  const start = useCallback(
    async (r: Release) => {
      const mine = ++token.current
      pauseAll()
      setRelease(r)
      setBlocked(false)
      store.set(0, 0)
      if (r.audio.kind === 'mp3') {
        const a = getAudio()
        if (loadedId.current !== r.id) a.src = r.audio.url
        loadedId.current = r.id
        setPlaying(true)
        a.play().catch(() => setPlaying(false))
        return
      }
      setPlaying(true)
      scStarted.current = false
      try {
        const w = await getWidget()
        if (mine !== token.current) return
        if (loadedId.current !== r.id) {
          loadedId.current = r.id
          w.load(r.audio.url, { auto_play: true, visual: false, callback: () => w.play() })
        } else w.play()
        window.setTimeout(() => {
          if (mine === token.current && !scStarted.current) {
            setPlaying(false)
            setBlocked(true)
          }
        }, SC_START_TIMEOUT_MS)
      } catch {
        if (mine === token.current) setPlaying(false)
      }
    },
    [getAudio, getWidget, pauseAll, store],
  )

  const toggle = useCallback(
    (r: Release) => {
      if (release?.id === r.id && loadedId.current === r.id) {
        if (playing) {
          pauseAll()
          setPlaying(false)
        } else if (r.audio.kind === 'mp3') {
          setPlaying(true)
          getAudio().play().catch(() => setPlaying(false))
        } else {
          widget.current?.play()
          setPlaying(true)
        }
        return
      }
      void start(r)
    },
    [release, playing, pauseAll, getAudio, start],
  )

  const stop = useCallback(() => {
    token.current++
    pauseAll()
    loadedId.current = null
    setRelease(null)
    setPlaying(false)
    setBlocked(false)
    store.set(0, 0)
  }, [pauseAll, store])

  useEffect(
    () => () => {
      token.current++
      audio.current?.pause()
      audio.current = null
      widget.current?.pause()
      frame.current?.remove()
      widget.current = null
      frame.current = null
    },
    [],
  )

  return { release, playing, blocked, toggle, stop, progress: store }
}

export const useTrackPosition = (store: ProgressStore): Progress =>
  useSyncExternalStore(store.subscribe, store.get)
