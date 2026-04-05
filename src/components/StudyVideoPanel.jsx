import { useEffect, useRef } from 'react';
import { useYouTubeAPI } from '../hooks/useYouTubeAPI';

export default function StudyVideoPanel({
  videoId,
  watchUrl,
  playerContainerId,
  playerRef,
  onPlayStateChange,
  videoPlaying,
}) {
  const apiReady = useYouTubeAPI();
  const playerInstanceRef = useRef(null);

  useEffect(() => {
    if (!apiReady || !videoId || !playerContainerId) return undefined;

    const YT = window.YT;
    if (!YT?.Player) return undefined;

    const syncPlaying = (player) => {
      try {
        const playing = player.getPlayerState() === YT.PlayerState.PLAYING;
        onPlayStateChange?.(playing);
      } catch {
        onPlayStateChange?.(false);
      }
    };

    new YT.Player(playerContainerId, {
      videoId,
      playerVars: {
        autoplay: 0,
        controls: 1,
        rel: 0,
        modestbranding: 1,
      },
      events: {
        onReady: (e) => {
          const player = e.target;
          playerInstanceRef.current = player;
          if (playerRef) playerRef.current = player;
          syncPlaying(player);
        },
        onStateChange: (e) => {
          const playing = e.data === YT.PlayerState.PLAYING;
          onPlayStateChange?.(playing);
        },
      },
    });

    return () => {
      try {
        playerInstanceRef.current?.destroy?.();
      } catch {
        /* ignore */
      }
      playerInstanceRef.current = null;
      if (playerRef) playerRef.current = null;
    };
  }, [apiReady, videoId, playerContainerId, onPlayStateChange, playerRef]);

  return (
    <div className="border-b border-[#2e2b25] bg-[#1a1510]">
      <div className="w-full bg-black" style={{ aspectRatio: '16 / 9' }}>
        <div id={playerContainerId} className="h-full w-full" />
      </div>

      <div
        className="flex items-center gap-2"
        style={{
          background: '#2a2210',
          borderTop: '0.5px solid #5a4010',
          borderBottom: '0.5px solid #5a4010',
          padding: '8px 16px',
          gap: 8,
        }}
      >
        <span
          className={`h-[7px] w-[7px] shrink-0 rounded-full bg-[#EF9F27] ${
            videoPlaying ? 'study-pulse' : ''
          }`}
          style={{ width: 7, height: 7 }}
          aria-hidden
        />
        <p
          className="min-w-0 flex-1 text-[11px] font-medium transition-colors duration-200"
          style={{
            color: videoPlaying ? '#c8901f' : '#888780',
          }}
        >
          {videoPlaying
            ? 'Study mode — read-only while playing'
            : 'Paused — you can edit your notes'}
        </p>
        {videoPlaying && (
          <span className="shrink-0 text-[11px] font-medium text-[#6b6560]">
            Pause to edit
          </span>
        )}
      </div>

      {watchUrl && (
        <div className="px-4 py-2 text-center">
          <a
            href={watchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-brand-amber hover:underline"
          >
            ▶ Open on YouTube
          </a>
        </div>
      )}
    </div>
  );
}
