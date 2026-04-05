import { useState, useEffect } from 'react';

/**
 * Loads YouTube IFrame API once. Returns true when `YT.Player` is available.
 */
export function useYouTubeAPI() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    if (window.YT && window.YT.Player) {
      setReady(true);
      return undefined;
    }

    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof prev === 'function') prev();
      setReady(true);
    };

    const existing = document.querySelector(
      'script[src="https://www.youtube.com/iframe_api"]'
    );
    if (!existing) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const first = document.getElementsByTagName('script')[0];
      first.parentNode.insertBefore(tag, first);
    }

    return () => {
      if (window.onYouTubeIframeAPIReady && !window.YT?.Player) {
        window.onYouTubeIframeAPIReady = prev;
      }
    };
  }, []);

  return ready;
}
