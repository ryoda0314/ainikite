"use client";

import { useState, useRef, useMemo, useCallback, useEffect } from "react";
import type { Block, Assignment, MemberVideos, MemberVideo, Slot } from "@/lib/types";
import { expandBlocksWithKeys } from "@/lib/slots";
import { ensureYouTubeAPI } from "@/lib/youtube-api";
import { SLOT_THEME, MEMBER_COLORS } from "@/lib/constants";

const NUM_SLOTS = 6;

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

interface PlaylistItem {
  key: string;
  slot: Slot;
  blockIndex: number;
  slotIndex: number;
  memberName: string;
  video: MemberVideo;
}

interface Props {
  blocks: Block[];
  assignment: Assignment;
  memberVideos: MemberVideos;
}

export function SequencePlayer({ blocks, assignment, memberVideos }: Props) {
  const [expanded, setExpanded] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeSlot, setActiveSlot] = useState(0);
  const [progressTime, setProgressTime] = useState(0);

  // Array-based container & player refs
  const containersRef = useRef<(HTMLDivElement | null)[]>(new Array(NUM_SLOTS).fill(null));
  const playersRef = useRef<(YT.Player | null)[]>(new Array(NUM_SLOTS).fill(null));

  // Which videoId is loaded in each slot
  const videoInSlotRef = useRef<(string | null)[]>(new Array(NUM_SLOTS).fill(null));
  const activeSlotRef = useRef(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentIndexRef = useRef(-1);
  const creatingRef = useRef<boolean[]>(new Array(NUM_SLOTS).fill(false));
  const pauseOnPlayRef = useRef<boolean[]>(new Array(NUM_SLOTS).fill(false));
  const trackListRef = useRef<HTMLDivElement>(null);

  // Build playlist
  const playlist = useMemo(() => {
    const slots = expandBlocksWithKeys(blocks);
    const items: PlaylistItem[] = [];
    for (const info of slots) {
      const memberName = assignment[info.key];
      if (!memberName) continue;
      const video = memberVideos[memberName];
      if (!video?.videoId) continue;
      items.push({ ...info, memberName, video });
    }
    return items;
  }, [blocks, assignment, memberVideos]);

  const playlistRef = useRef(playlist);
  playlistRef.current = playlist;

  // Track durations for progress bar
  const trackDurations = useMemo(() => {
    return playlist.map(item => {
      if (item.video.endSec > 0) return item.video.endSec - item.video.startSec;
      return 30; // fallback for unknown end
    });
  }, [playlist]);

  const totalDuration = useMemo(
    () => trackDurations.reduce((sum, d) => sum + d, 0),
    [trackDurations],
  );

  // ── Helpers ─────────────────────────────────────────────────

  const getPlayer = useCallback((slot: number): YT.Player | null => {
    return playersRef.current[slot] ?? null;
  }, []);

  const getContainer = useCallback((slot: number): HTMLDivElement | null => {
    return containersRef.current[slot] ?? null;
  }, []);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const clearProgressTimer = useCallback(() => {
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
  }, []);

  const startProgressPolling = useCallback(() => {
    clearProgressTimer();
    progressTimerRef.current = setInterval(() => {
      try {
        const p = playersRef.current[activeSlotRef.current];
        if (!p) return;
        const state = p.getPlayerState();
        if (state !== window.YT.PlayerState.PLAYING) return;
        const t = p.getCurrentTime();
        const idx = currentIndexRef.current;
        if (idx < 0 || idx >= playlistRef.current.length) return;
        const item = playlistRef.current[idx];
        setProgressTime(Math.max(0, t - item.video.startSec));
      } catch {
        /* */
      }
    }, 50);
  }, [clearProgressTimer]);

  const goToIndexRef = useRef<(idx: number, seekSec?: number) => void>(() => {});

  // Advance to next track or stop
  const advanceOrStop = useCallback(() => {
    const nextIdx = currentIndexRef.current + 1;
    if (nextIdx < playlistRef.current.length) {
      goToIndexRef.current(nextIdx);
    } else {
      clearTimer();
      clearProgressTimer();
      try {
        getPlayer(activeSlotRef.current)?.stopVideo();
      } catch {
        /* */
      }
      setIsPlaying(false);
      setCurrentIndex(-1);
      currentIndexRef.current = -1;
      setProgressTime(0);
    }
  }, [clearTimer, clearProgressTimer, getPlayer]);

  // Poll for endSec auto-advance
  const startEndPolling = useCallback(
    (endSec: number) => {
      clearTimer();
      timerRef.current = setInterval(() => {
        try {
          const p = getPlayer(activeSlotRef.current);
          if (!p) {
            clearTimer();
            return;
          }
          if (p.getPlayerState() !== window.YT.PlayerState.PLAYING) return;

          const current = p.getCurrentTime();
          const effectiveEnd = endSec > 0
            ? endSec
            : (p.getDuration() > 0 ? p.getDuration() - 1.5 : 0);
          if (effectiveEnd > 0 && current >= effectiveEnd) {
            clearTimer();
            advanceOrStop();
          }
        } catch {
          clearTimer();
        }
      }, 100);
    },
    [clearTimer, advanceOrStop, getPlayer],
  );

  // ── Pre-load upcoming videos on standby players ─────────────

  const preloadNextRef = useRef<(fromIndex: number) => void>(() => {});

  const preloadNext = useCallback(
    async (fromIndex: number) => {
      const items = playlistRef.current;
      const act = activeSlotRef.current;
      const activeVideoId = videoInSlotRef.current[act];

      // Collect up to NUM_SLOTS-1 distinct upcoming videoIds different from active
      const needed: { videoId: string; startSec: number }[] = [];
      const seen = new Set<string>();
      if (activeVideoId) seen.add(activeVideoId);

      for (let i = fromIndex + 1; i < items.length && needed.length < NUM_SLOTS - 1; i++) {
        const vid = items[i].video.videoId;
        if (!seen.has(vid)) {
          seen.add(vid);
          needed.push({ videoId: vid, startSec: items[i].video.startSec });
        }
      }

      const standbySlots = Array.from({ length: NUM_SLOTS }, (_, i) => i).filter(s => s !== act);
      const neededIds = new Set(needed.map(n => n.videoId));

      for (const { videoId, startSec } of needed) {
        // Already on some slot?
        if (videoInSlotRef.current.some(v => v === videoId)) continue;

        // Pick a standby slot (prefer one without another needed video)
        const targetSlot = standbySlots.find(s => {
          const sv = videoInSlotRef.current[s];
          return !sv || !neededIds.has(sv);
        }) ?? standbySlots[0];

        const player = getPlayer(targetSlot);

        if (player) {
          player.cueVideoById(videoId, startSec);
          videoInSlotRef.current[targetSlot] = videoId;
          // Force buffer by muted play
          pauseOnPlayRef.current[targetSlot] = true;
          player.mute();
          player.playVideo();
        } else {
          // Create new standby player
          const container = getContainer(targetSlot);
          if (!container || creatingRef.current[targetSlot]) continue;

          creatingRef.current[targetSlot] = true;
          container.innerHTML = "";
          const el = document.createElement("div");
          container.appendChild(el);

          await ensureYouTubeAPI();
          if (!container.isConnected) {
            creatingRef.current[targetSlot] = false;
            continue;
          }

          const slotNum = targetSlot;

          const p = new window.YT.Player(el, {
            videoId,
            width: "100%",
            height: "100%",
            playerVars: { autoplay: 0, start: Math.floor(startSec), rel: 0, modestbranding: 1 },
            events: {
              onReady() {
                creatingRef.current[slotNum] = false;
                playersRef.current[slotNum] = p;
                videoInSlotRef.current[slotNum] = videoId;
                // Force buffer by muted play
                pauseOnPlayRef.current[slotNum] = true;
                p.mute();
                p.seekTo(startSec, true);
                p.playVideo();
              },
              onStateChange(e) {
                if (pauseOnPlayRef.current[slotNum] && e.data === window.YT.PlayerState.PLAYING) {
                  pauseOnPlayRef.current[slotNum] = false;
                  p.pauseVideo();
                  return;
                }
                if (
                  e.data === window.YT.PlayerState.ENDED &&
                  activeSlotRef.current === slotNum
                ) {
                  clearTimer();
                  try { p.stopVideo(); } catch { /* */ }
                  goToIndexRef.current(currentIndexRef.current + 1);
                }
              },
              onError() {
                creatingRef.current[slotNum] = false;
                pauseOnPlayRef.current[slotNum] = false;
              },
            },
          });
        }
      }
    },
    [getPlayer, getContainer, clearTimer],
  );

  preloadNextRef.current = preloadNext;

  // ── Preload players when section is expanded ────────────────

  const preloadPlayers = useCallback(
    async () => {
      const items = playlistRef.current;
      if (items.length === 0) return;
      if (creatingRef.current.some(Boolean)) return;

      // Clean up stale player refs (containers remounted after collapse/re-expand)
      for (let i = 0; i < NUM_SLOTS; i++) {
        const container = getContainer(i);
        if (container && container.children.length === 0) {
          const existing = playersRef.current[i];
          if (existing) {
            try { existing.destroy(); } catch { /* */ }
            playersRef.current[i] = null;
          }
          videoInSlotRef.current[i] = null;
        }
      }

      // Collect unique videoIds from playlist (up to NUM_SLOTS)
      const unique: { videoId: string; startSec: number }[] = [];
      const seen = new Set<string>();
      for (const item of items) {
        if (!seen.has(item.video.videoId)) {
          seen.add(item.video.videoId);
          unique.push({ videoId: item.video.videoId, startSec: item.video.startSec });
          if (unique.length >= NUM_SLOTS) break;
        }
      }

      await ensureYouTubeAPI();

      activeSlotRef.current = 0;
      setActiveSlot(0);

      for (let i = 0; i < unique.length; i++) {
        const container = getContainer(i);
        if (!container || creatingRef.current[i]) continue;
        if (getPlayer(i)) continue;

        creatingRef.current[i] = true;
        container.innerHTML = "";
        const el = document.createElement("div");
        container.appendChild(el);

        if (!container.isConnected) {
          creatingRef.current[i] = false;
          continue;
        }

        const slotNum = i;
        const { videoId, startSec } = unique[i];

        const p = new window.YT.Player(el, {
          videoId,
          width: "100%",
          height: "100%",
          playerVars: { autoplay: 0, start: Math.floor(startSec), rel: 0, modestbranding: 1 },
          events: {
            onReady() {
              creatingRef.current[slotNum] = false;
              playersRef.current[slotNum] = p;
              videoInSlotRef.current[slotNum] = videoId;
              // Force actual video buffering by muted play
              pauseOnPlayRef.current[slotNum] = true;
              p.mute();
              p.seekTo(startSec, true);
              p.playVideo();
            },
            onStateChange(e) {
              if (pauseOnPlayRef.current[slotNum] && e.data === window.YT.PlayerState.PLAYING) {
                pauseOnPlayRef.current[slotNum] = false;
                p.pauseVideo();
                return;
              }
              if (
                e.data === window.YT.PlayerState.ENDED &&
                activeSlotRef.current === slotNum
              ) {
                clearTimer();
                try { p.stopVideo(); } catch { /* */ }
                goToIndexRef.current(currentIndexRef.current + 1);
              }
            },
            onError() {
              creatingRef.current[slotNum] = false;
              pauseOnPlayRef.current[slotNum] = false;
            },
          },
        });
      }
    },
    [getPlayer, getContainer, clearTimer],
  );

  // Trigger preload when panel expands
  useEffect(() => {
    if (expanded && playlist.length > 0) {
      preloadPlayers();
    }
  }, [expanded, playlist, preloadPlayers]);

  // ── Navigate to a specific playlist index ───────────────────

  const goToIndex = useCallback(
    (index: number, seekSec?: number) => {
      const items = playlistRef.current;
      if (index < 0 || index >= items.length) return;

      const item = items[index];
      const act = activeSlotRef.current;
      const activePlayer = getPlayer(act);
      if (!activePlayer) return;

      const seekPos = seekSec ?? item.video.startSec;

      currentIndexRef.current = index;
      setCurrentIndex(index);
      setIsPlaying(true);
      setProgressTime(seekPos - item.video.startSec);
      clearTimer();

      const activeVideoId = videoInSlotRef.current[act];

      if (item.video.videoId === activeVideoId) {
        // Same video → smooth seek only
        pauseOnPlayRef.current[act] = false;
        activePlayer.unMute();
        activePlayer.seekTo(seekPos, true);
        activePlayer.playVideo();
      } else {
        // Find a standby slot with this video
        const matchSlot = Array.from({ length: NUM_SLOTS }, (_, i) => i).find(
          s => s !== act && videoInSlotRef.current[s] === item.video.videoId && getPlayer(s),
        );

        if (matchSlot !== undefined) {
          // Instant swap
          try {
            activePlayer.pauseVideo();
          } catch {
            /* */
          }
          const matchPlayer = getPlayer(matchSlot)!;
          pauseOnPlayRef.current[matchSlot] = false;
          matchPlayer.unMute();
          matchPlayer.seekTo(seekPos, true);
          matchPlayer.playVideo();

          activeSlotRef.current = matchSlot;
          setActiveSlot(matchSlot);
        } else {
          // Fallback: load on active player
          pauseOnPlayRef.current[act] = false;
          activePlayer.unMute();
          activePlayer.loadVideoById(item.video.videoId, seekPos);
          videoInSlotRef.current[act] = item.video.videoId;
        }
      }

      startEndPolling(item.video.endSec);
      startProgressPolling();
      preloadNextRef.current(index);
    },
    [clearTimer, startEndPolling, startProgressPolling, getPlayer],
  );

  goToIndexRef.current = goToIndex;

  // Auto-scroll track list
  useEffect(() => {
    if (currentIndex < 0) return;
    const list = trackListRef.current;
    if (!list) return;
    const el = list.children[currentIndex] as HTMLElement | undefined;
    el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [currentIndex]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimer();
      clearProgressTimer();
      for (let i = 0; i < NUM_SLOTS; i++) {
        try {
          playersRef.current[i]?.destroy();
        } catch {
          /* */
        }
        playersRef.current[i] = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clearTimer, clearProgressTimer]);

  // Create the active player and start playback
  const initPlayer = useCallback(
    async (startIndex: number) => {
      if (creatingRef.current.some(Boolean)) return;
      const items = playlistRef.current;
      if (startIndex < 0 || startIndex >= items.length) return;
      const container = getContainer(0);
      if (!container) return;

      const slot = 0;
      creatingRef.current[slot] = true;
      activeSlotRef.current = slot;
      setActiveSlot(slot);

      // Clean all players
      clearTimer();
      clearProgressTimer();
      for (let i = 0; i < NUM_SLOTS; i++) {
        try {
          getPlayer(i)?.destroy();
        } catch {
          /* */
        }
        const c = getContainer(i);
        if (c) c.innerHTML = "";
        playersRef.current[i] = null;
      }
      videoInSlotRef.current = new Array(NUM_SLOTS).fill(null);
      pauseOnPlayRef.current = new Array(NUM_SLOTS).fill(false);

      const el = document.createElement("div");
      container.appendChild(el);

      await ensureYouTubeAPI();
      if (!container.isConnected) {
        creatingRef.current[slot] = false;
        return;
      }

      const item = items[startIndex];

      const player = new window.YT.Player(el, {
        videoId: item.video.videoId,
        width: "100%",
        height: "100%",
        playerVars: {
          autoplay: 1,
          start: Math.floor(item.video.startSec),
          rel: 0,
          modestbranding: 1,
        },
        events: {
          onReady() {
            creatingRef.current[slot] = false;
            playersRef.current[slot] = player;
            videoInSlotRef.current[slot] = item.video.videoId;
            if (item.video.startSec > 0) {
              player.seekTo(item.video.startSec, true);
            }
            currentIndexRef.current = startIndex;
            setCurrentIndex(startIndex);
            setIsPlaying(true);
            setProgressTime(0);
            startEndPolling(item.video.endSec);
            startProgressPolling();
            preloadNextRef.current(startIndex);
          },
          onStateChange(e) {
            if (
              e.data === window.YT.PlayerState.ENDED &&
              activeSlotRef.current === slot
            ) {
              clearTimer();
              try { player.stopVideo(); } catch { /* */ }
              goToIndexRef.current(currentIndexRef.current + 1);
            }
          },
          onError() {
            creatingRef.current[slot] = false;
          },
        },
      });
    },
    [clearTimer, clearProgressTimer, startEndPolling, startProgressPolling, getPlayer, getContainer],
  );

  // ── Controls ──────────────────────────────────────────────

  const handlePlay = useCallback(() => {
    if (playlist.length === 0) return;

    const activePlayer = getPlayer(activeSlotRef.current);
    if (activePlayer) {
      if (currentIndexRef.current >= 0 && !isPlaying) {
        pauseOnPlayRef.current[activeSlotRef.current] = false;
        activePlayer.unMute();
        activePlayer.playVideo();
        setIsPlaying(true);
        const item = playlistRef.current[currentIndexRef.current];
        if (item) startEndPolling(item.video.endSec);
        startProgressPolling();
      } else if (currentIndexRef.current < 0) {
        goToIndex(0);
      }
    } else {
      initPlayer(0);
    }
  }, [playlist, isPlaying, goToIndex, initPlayer, startEndPolling, startProgressPolling, getPlayer]);

  const handlePause = useCallback(() => {
    clearTimer();
    clearProgressTimer();
    try {
      getPlayer(activeSlotRef.current)?.pauseVideo();
    } catch {
      /* */
    }
    setIsPlaying(false);
  }, [clearTimer, clearProgressTimer, getPlayer]);

  const handleStop = useCallback(() => {
    clearTimer();
    clearProgressTimer();
    try {
      getPlayer(activeSlotRef.current)?.pauseVideo();
    } catch {
      /* */
    }
    setIsPlaying(false);
    setCurrentIndex(-1);
    currentIndexRef.current = -1;
    setProgressTime(0);
  }, [clearTimer, clearProgressTimer, getPlayer]);

  const handlePrev = useCallback(() => {
    if (currentIndexRef.current > 0) goToIndex(currentIndexRef.current - 1);
  }, [goToIndex]);

  const handleNext = useCallback(() => {
    if (currentIndexRef.current < playlistRef.current.length - 1)
      goToIndex(currentIndexRef.current + 1);
  }, [goToIndex]);

  const handleTrackClick = useCallback(
    (index: number) => {
      if (getPlayer(activeSlotRef.current)) {
        goToIndex(index);
      } else {
        initPlayer(index);
      }
    },
    [goToIndex, initPlayer, getPlayer],
  );

  // ── Progress bar click-to-seek ──────────────────────────────

  const handleProgressClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (totalDuration <= 0 || playlist.length === 0) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const targetTime = ratio * totalDuration;

      let accumulated = 0;
      for (let i = 0; i < playlist.length; i++) {
        const dur = trackDurations[i];
        if (accumulated + dur > targetTime || i === playlist.length - 1) {
          const offsetInTrack = Math.max(0, Math.min(targetTime - accumulated, dur));
          const seekTime = playlist[i].video.startSec + offsetInTrack;

          if (i === currentIndexRef.current) {
            // Same track — just seek
            const p = getPlayer(activeSlotRef.current);
            if (p) {
              p.seekTo(seekTime, true);
              setProgressTime(offsetInTrack);
            }
          } else if (getPlayer(activeSlotRef.current)) {
            goToIndex(i, seekTime);
          } else {
            initPlayer(i);
          }
          break;
        }
        accumulated += dur;
      }
    },
    [playlist, trackDurations, totalDuration, getPlayer, goToIndex, initPlayer],
  );

  // ── Render ────────────────────────────────────────────────

  const currentItem =
    currentIndex >= 0 && currentIndex < playlist.length
      ? playlist[currentIndex]
      : null;

  // Compute elapsed time for progress bar display
  const elapsedTotal = useMemo(() => {
    if (currentIndex < 0) return 0;
    const completedDur = trackDurations.slice(0, currentIndex).reduce((s, d) => s + d, 0);
    return completedDur + progressTime;
  }, [currentIndex, trackDurations, progressTime]);

  return (
    <div
      className="space-y-3 animate-fade-up"
      style={{ animationDelay: "400ms" }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between group"
      >
        <div className="flex items-center gap-3">
          <div className="w-1 h-5 rounded-full bg-[#3b82f6]" />
          <h3 className="font-[family-name:var(--font-display)] text-base font-semibold tracking-wider uppercase text-[#60a5fa]">
            Sequence Player
          </h3>
          {playlist.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[rgba(59,130,246,0.1)] border border-[rgba(59,130,246,0.2)] text-[#60a5fa] font-mono">
              {playlist.length}
            </span>
          )}
        </div>
        <svg
          className={`w-4 h-4 text-[#8b87a0] transition-transform duration-200 group-hover:text-[#ff6b9d] ${expanded ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {expanded && (
        <div className="space-y-3">
          {playlist.length === 0 ? (
            <p className="text-[11px] text-[#5a5770] text-center py-4">
              再生可能なトラックがありません。
              <br />
              メンバーを割り当て、動画を設定してください。
            </p>
          ) : (
            <>
              {/* Player area — containers for instant swap */}
              <div className="rounded-lg overflow-hidden border border-[rgba(59,130,246,0.15)]">
                <div className="aspect-video bg-black relative">
                  {/* Block interaction with YouTube iframes */}
                  <div className="absolute inset-0" style={{ zIndex: 10 }} />
                  {Array.from({ length: NUM_SLOTS }, (_, i) => (
                    <div
                      key={i}
                      ref={(el) => { containersRef.current[i] = el; }}
                      className="absolute inset-0"
                      style={{
                        zIndex: activeSlot === i ? 3 : 1,
                        visibility: activeSlot === i ? "visible" : "hidden",
                      }}
                    />
                  ))}
                  {currentIndex < 0 && !isPlaying && (
                    <div
                      className="absolute inset-0 flex items-center justify-center"
                      style={{ zIndex: 4 }}
                    >
                      <span className="text-[11px] text-[#5a5770]">
                        ▶ を押すと再生開始
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Now-playing info */}
              {currentItem && (
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-medium" style={{ color: MEMBER_COLORS[currentItem.memberName] ?? SLOT_THEME[currentItem.slot].color }}>
                    {currentItem.slot} · {currentItem.memberName}
                  </span>
                  <span className="text-[#8b87a0] font-mono">
                    {currentIndex + 1} / {playlist.length}
                  </span>
                </div>
              )}

              {/* Progress bar */}
              <div className="space-y-1">
                <div
                  className="relative h-2 rounded-full bg-[rgba(255,255,255,0.06)] cursor-pointer overflow-hidden group"
                  onClick={handleProgressClick}
                >
                  {/* Track segments */}
                  <div className="absolute inset-0 flex">
                    {playlist.map((item, i) => {
                      const width = totalDuration > 0 ? (trackDurations[i] / totalDuration) * 100 : 0;
                      const mc = MEMBER_COLORS[item.memberName] ?? SLOT_THEME[item.slot].color;
                      const isActive = i === currentIndex;
                      const isPast = currentIndex >= 0 && i < currentIndex;

                      return (
                        <div
                          key={`seg-${item.key}-${i}`}
                          className="h-full relative"
                          style={{
                            width: `${width}%`,
                            backgroundColor: isPast
                              ? mc
                              : isActive
                                ? `${mc}40`
                                : `${mc}15`,
                            borderRight: i < playlist.length - 1 ? "1px solid rgba(0,0,0,0.5)" : undefined,
                            transition: "background-color 0.15s",
                          }}
                        >
                          {/* Fill for current track */}
                          {isActive && trackDurations[i] > 0 && (
                            <div
                              className="absolute inset-y-0 left-0"
                              style={{
                                width: `${Math.min(100, (progressTime / trackDurations[i]) * 100)}%`,
                                backgroundColor: mc,
                                boxShadow: `1px 0 6px ${mc}`,
                                transition: "width 0.05s linear",
                              }}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {/* Hover highlight */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-[rgba(255,255,255,0.04)] rounded-full" />
                </div>
                {/* Time display */}
                <div className="flex justify-between text-[9px] font-mono text-[#5a5770]">
                  <span>{formatTime(elapsedTotal)}</span>
                  <span>{formatTime(totalDuration)}</span>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-1.5">
                {!isPlaying ? (
                  <button
                    onClick={handlePlay}
                    className="h-9 px-5 rounded-lg text-xs font-bold tracking-wider uppercase border border-[#ff2b4e] bg-[#ff2b4e] text-white shadow-[0_0_20px_rgba(255,43,78,0.4)] transition-all duration-200 hover:bg-[#ff4a66] hover:shadow-[0_0_30px_rgba(255,43,78,0.6)]"
                  >
                    {currentIndex >= 0 ? "再開" : "▶ 再生"}
                  </button>
                ) : (
                  <button
                    onClick={handlePause}
                    className="h-7 px-3 rounded text-[10px] font-semibold tracking-wider uppercase border border-[rgba(255,43,78,0.25)] bg-[rgba(255,43,78,0.06)] text-[#ff5a73] transition-all duration-200 hover:border-[rgba(255,43,78,0.5)] hover:bg-[rgba(255,43,78,0.12)]"
                  >
                    一時停止
                  </button>
                )}
                <button
                  onClick={handlePrev}
                  disabled={currentIndex <= 0}
                  className="h-7 px-2 rounded text-[10px] text-[#8b87a0] hover:text-[#ff6b9d] transition-colors disabled:opacity-30 disabled:pointer-events-none"
                >
                  ◀◀
                </button>
                <button
                  onClick={handleNext}
                  disabled={
                    currentIndex < 0 ||
                    currentIndex >= playlist.length - 1
                  }
                  className="h-7 px-2 rounded text-[10px] text-[#8b87a0] hover:text-[#ff6b9d] transition-colors disabled:opacity-30 disabled:pointer-events-none"
                >
                  ▶▶
                </button>
                {(isPlaying || currentIndex >= 0) && (
                  <button
                    onClick={handleStop}
                    className="h-7 px-2 rounded text-[10px] text-[#8b87a0] hover:text-[#ff3b7f] transition-colors"
                  >
                    ■ 停止
                  </button>
                )}
              </div>

              {/* Track list */}
              <div
                ref={trackListRef}
                className="space-y-0.5 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar"
              >
                {playlist.map((item, i) => {
                  const mc = MEMBER_COLORS[item.memberName] ?? SLOT_THEME[item.slot].color;
                  const active = i === currentIndex;
                  return (
                    <button
                      key={`${item.key}-${i}`}
                      onClick={() => handleTrackClick(i)}
                      className="w-full text-left flex items-center gap-2 px-2 py-1 rounded transition-all duration-150 border"
                      style={{
                        backgroundColor: active ? `${mc}18` : "transparent",
                        borderColor: active ? `${mc}40` : "transparent",
                      }}
                    >
                      <span
                        className="text-[10px] font-mono w-5 text-right flex-shrink-0"
                        style={{ color: active ? mc : "#5a5770" }}
                      >
                        {active && isPlaying ? "▸" : `${i + 1}`}
                      </span>
                      <span
                        className="text-[10px] font-medium w-6 flex-shrink-0"
                        style={{ color: mc }}
                      >
                        {item.slot}
                      </span>
                      <span
                        className={`text-[11px] truncate ${active ? "text-[#e8e6f0]" : "text-[#c4c1d0]"}`}
                      >
                        {item.memberName}
                      </span>
                      <span
                        className="text-[9px] font-mono ml-auto flex-shrink-0"
                        style={{ color: active ? mc : "#5a5770", opacity: active ? 0.7 : 1 }}
                      >
                        {item.video.startSec}s–
                        {item.video.endSec > 0
                          ? `${item.video.endSec}s`
                          : "end"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}