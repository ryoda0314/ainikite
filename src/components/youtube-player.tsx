"use client";

import { useEffect, useRef, useCallback } from "react";
import { ensureYouTubeAPI } from "@/lib/youtube-api";

interface Props {
  videoId: string;
  startSec?: number;
  endSec?: number;
  autoPlay?: boolean;
  className?: string;
}

/**
 * Renders a YouTube player via the IFrame Player API.
 * Supports decimal-second seekTo and auto-pause at endSec.
 */
export function YouTubePlayer({
  videoId,
  startSec = 0,
  endSec = 0,
  autoPlay = false,
  className,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YT.Player | null>(null);
  const readyRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Keep latest endSec in a ref so the polling closure always reads current value
  const endSecRef = useRef(endSec);
  endSecRef.current = endSec;

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Start polling to auto-pause at endSec (or just before natural end to prevent end-screen)
  const startEndTimer = useCallback(
    (target: YT.Player) => {
      clearTimer();
      timerRef.current = setInterval(() => {
        try {
          const current = target.getCurrentTime();
          const end = endSecRef.current;
          if (end > 0) {
            if (current >= end) {
              target.pauseVideo();
              clearTimer();
            }
          } else {
            // Pause just before the natural end to suppress "その他の動画" overlay
            const duration = target.getDuration();
            if (duration > 0 && current >= duration - 0.5) {
              target.pauseVideo();
              clearTimer();
            }
          }
        } catch {
          clearTimer();
        }
      }, 100);
    },
    [clearTimer],
  );

  // Create / recreate player when videoId changes
  useEffect(() => {
    if (!videoId) return;
    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;

    // Clean up previous player
    clearTimer();
    readyRef.current = false;
    try {
      playerRef.current?.destroy();
    } catch {
      /* ignore */
    }
    playerRef.current = null;
    container.innerHTML = "";

    const el = document.createElement("div");
    container.appendChild(el);

    ensureYouTubeAPI().then(() => {
      if (cancelled || !container.isConnected) return;

      const player = new window.YT.Player(el, {
        videoId,
        width: "100%",
        height: "100%",
        playerVars: {
          autoplay: autoPlay ? 1 : 0,
          // Integer floor as fallback; onReady does decimal seekTo
          start: Math.floor(startSec),
          rel: 0,
          modestbranding: 1,
        },
        events: {
          onReady(e) {
            if (cancelled) return;
            readyRef.current = true;
            // Decimal-precision seek
            if (startSec > 0) {
              e.target.seekTo(startSec, true);
            }
          },
          onStateChange(e) {
            if (cancelled) return;
            if (e.data === window.YT.PlayerState.PLAYING) {
              startEndTimer(e.target);
            } else if (
              e.data === window.YT.PlayerState.PAUSED ||
              e.data === window.YT.PlayerState.ENDED
            ) {
              clearTimer();
            }
          },
        },
      });

      playerRef.current = player;
    });

    return () => {
      cancelled = true;
      clearTimer();
      readyRef.current = false;
      try {
        playerRef.current?.destroy();
      } catch {
        /* ignore */
      }
      playerRef.current = null;
    };
    // Recreate only when videoId changes; startSec/endSec handled separately
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  // Seek when startSec changes without recreating the player
  useEffect(() => {
    if (!readyRef.current || !playerRef.current) return;
    try {
      playerRef.current.seekTo(startSec, true);
    } catch {
      /* player may not be ready */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startSec]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ width: "100%", height: "100%" }}
    />
  );
}
