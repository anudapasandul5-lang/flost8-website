import { describe, it, expect } from 'vitest';
import {
  getYouTubeId,
  getYouTubeStart,
  getYouTubeThumb,
  buildYouTubeEmbed,
  buildSoundCloudEmbed,
} from './embeds';

describe('embeds', () => {
  describe('getYouTubeId', () => {
    it('extracts id from basic watch URL', () => {
      expect(getYouTubeId('https://www.youtube.com/watch?v=mIzxpKdVS7g')).toBe('mIzxpKdVS7g');
    });

    it('extracts id from URL with timestamp', () => {
      expect(getYouTubeId('https://www.youtube.com/watch?v=jPFlSMzOJEI&t=789s')).toBe(
        'jPFlSMzOJEI'
      );
    });

    it('extracts id from URL with multiple params', () => {
      expect(getYouTubeId('https://www.youtube.com/watch?v=ZP14TK60BIs&t=3297s')).toBe(
        'ZP14TK60BIs'
      );
    });

    it('returns null for SoundCloud URL', () => {
      expect(
        getYouTubeId('https://soundcloud.com/artist/track-name-123456789')
      ).toBeNull();
    });

    it('returns null for invalid/garbage string', () => {
      expect(getYouTubeId('not-a-url')).toBeNull();
    });
  });

  describe('getYouTubeStart', () => {
    it('parses plain seconds with s suffix', () => {
      expect(getYouTubeStart('https://www.youtube.com/watch?v=abc&t=12s')).toBe(12);
    });

    it('parses large seconds with s suffix', () => {
      expect(getYouTubeStart('https://www.youtube.com/watch?v=abc&t=3297s')).toBe(3297);
    });

    it('parses minutes and seconds format', () => {
      expect(getYouTubeStart('https://www.youtube.com/watch?v=abc&t=1m30s')).toBe(90);
    });

    it('returns undefined when no t param', () => {
      expect(getYouTubeStart('https://www.youtube.com/watch?v=abc')).toBeUndefined();
    });

    it('returns undefined for unparseable t param', () => {
      expect(getYouTubeStart('https://www.youtube.com/watch?v=abc&t=garbage')).toBeUndefined();
    });
  });

  describe('getYouTubeThumb', () => {
    it('returns hqdefault thumbnail URL', () => {
      expect(getYouTubeThumb('mIzxpKdVS7g')).toBe(
        'https://i.ytimg.com/vi/mIzxpKdVS7g/hqdefault.jpg'
      );
    });

    it('works with different video ids', () => {
      expect(getYouTubeThumb('jPFlSMzOJEI')).toBe(
        'https://i.ytimg.com/vi/jPFlSMzOJEI/hqdefault.jpg'
      );
    });
  });

  describe('buildYouTubeEmbed', () => {
    it('builds embed URL without start param', () => {
      const url = buildYouTubeEmbed('mIzxpKdVS7g');
      expect(url).toContain('https://www.youtube-nocookie.com/embed/mIzxpKdVS7g');
      expect(url).toContain('autoplay=1');
      expect(url).toContain('rel=0');
      expect(url).not.toContain('start=');
    });

    it('builds embed URL with start param', () => {
      const url = buildYouTubeEmbed('mIzxpKdVS7g', 90);
      expect(url).toContain('https://www.youtube-nocookie.com/embed/mIzxpKdVS7g');
      expect(url).toContain('&start=90');
    });

    it('omits start param when start is 0', () => {
      const url = buildYouTubeEmbed('mIzxpKdVS7g', 0);
      expect(url).not.toContain('start=');
    });

    it('uses youtube-nocookie domain', () => {
      expect(buildYouTubeEmbed('jPFlSMzOJEI')).toContain('youtube-nocookie.com');
    });
  });

  describe('buildSoundCloudEmbed', () => {
    it('builds embed player URL with encoded URL', () => {
      const url = 'https://soundcloud.com/artist/track-123456789';
      const embed = buildSoundCloudEmbed(url);
      expect(embed).toContain('https://w.soundcloud.com/player/');
      expect(embed).toContain('url=');
      expect(embed).toContain(encodeURIComponent(url));
    });

    it('includes correct color code', () => {
      const embed = buildSoundCloudEmbed('https://soundcloud.com/artist/track-123456789');
      expect(embed).toContain('color=%239D14FF');
    });

    it('includes autoplay and visibility settings', () => {
      const embed = buildSoundCloudEmbed('https://soundcloud.com/artist/track-123456789');
      expect(embed).toContain('auto_play=true');
      expect(embed).toContain('hide_related=true');
      expect(embed).toContain('visual=true');
    });

    it('handles URL with query params', () => {
      const url = 'https://soundcloud.com/artist/track-123456789?si=abc123&utm_source=x';
      const embed = buildSoundCloudEmbed(url);
      expect(embed).toContain(encodeURIComponent(url));
    });
  });
});
