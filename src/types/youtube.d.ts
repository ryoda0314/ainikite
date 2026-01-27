/* YouTube IFrame Player API type declarations */
declare namespace YT {
  class Player {
    constructor(element: HTMLElement | string, options: PlayerOptions);
    destroy(): void;
    playVideo(): void;
    pauseVideo(): void;
    stopVideo(): void;
    seekTo(seconds: number, allowSeekAhead: boolean): void;
    loadVideoById(videoId: string, startSeconds?: number): void;
    cueVideoById(videoId: string, startSeconds?: number): void;
    mute(): void;
    unMute(): void;
    isMuted(): boolean;
    getCurrentTime(): number;
    getDuration(): number;
    getPlayerState(): number;
  }

  interface PlayerOptions {
    videoId?: string;
    width?: string | number;
    height?: string | number;
    playerVars?: Record<string, number | string>;
    events?: {
      onReady?: (event: { target: Player }) => void;
      onStateChange?: (event: { target: Player; data: number }) => void;
      onError?: (event: { target: Player; data: number }) => void;
    };
  }

  const PlayerState: {
    UNSTARTED: -1;
    ENDED: 0;
    PLAYING: 1;
    PAUSED: 2;
    BUFFERING: 3;
    CUED: 5;
  };
}

interface Window {
  YT: typeof YT;
  onYouTubeIframeAPIReady?: () => void;
}
