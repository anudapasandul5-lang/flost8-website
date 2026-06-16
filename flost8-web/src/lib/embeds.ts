/**
 * Extract the 11-character video ID from a YouTube watch URL.
 * Returns null if no valid v= parameter is found.
 */
export function getYouTubeId(url: string): string | null {
  const match = url.match(/[?&]v=([\w-]{11})/);
  return match ? match[1] : null;
}

/**
 * Parse the t= timestamp parameter from a YouTube URL into seconds.
 * Supports formats: t=789s, t=1m30s, t=2h3m4s
 * Returns undefined if no t= parameter or if unparseable.
 */
export function getYouTubeStart(url: string): number | undefined {
  const match = url.match(/[?&]t=([^&]+)/);
  if (!match) return undefined;

  const timeStr = match[1];

  // Handle plain seconds with 's' suffix (e.g., "789s", "12s")
  if (/^\d+s$/.test(timeStr)) {
    return parseInt(timeStr, 10);
  }

  // Handle combined format like "1m30s", "2h3m4s"
  let totalSeconds = 0;
  const hourMatch = timeStr.match(/(\d+)h/);
  const minMatch = timeStr.match(/(\d+)m/);
  const secMatch = timeStr.match(/(\d+)s/);

  if (hourMatch) {
    totalSeconds += parseInt(hourMatch[1], 10) * 3600;
  }
  if (minMatch) {
    totalSeconds += parseInt(minMatch[1], 10) * 60;
  }
  if (secMatch) {
    totalSeconds += parseInt(secMatch[1], 10);
  }

  // If we matched any component, return the result; otherwise undefined
  return hourMatch || minMatch || secMatch ? totalSeconds : undefined;
}

/**
 * Get the high-quality thumbnail URL for a YouTube video.
 */
export function getYouTubeThumb(id: string): string {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}

/**
 * Build the embed iframe src URL for a YouTube video.
 * Includes autoplay=1 and rel=0; optionally appends start time.
 */
export function buildYouTubeEmbed(id: string, start?: number): string {
  let url = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`;
  if (start && start > 0) {
    url += `&start=${start}`;
  }
  return url;
}

/**
 * Build the embed iframe src URL for a SoundCloud track.
 * Takes the full SoundCloud track URL and returns the player embed URL.
 */
export function buildSoundCloudEmbed(url: string): string {
  return `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&color=%239D14FF&auto_play=true&hide_related=true&visual=true`;
}
