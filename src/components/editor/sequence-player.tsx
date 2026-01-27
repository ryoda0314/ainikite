"use client";

import { useState, useRef, useMemo, useCallback, useEffect } from "react";
import type { Block, Assignment, MemberVideos, MemberVideo, Slot } from "@/lib/types";
import { expandBlocksWithKeys } from "@/lib/slots";
import { ensureYouTubeAPI } from "@/lib/youtube-api";

const NUM_SLOTS = 3;

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
  const [expanded, setExpanded] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeSlot, setActiveSlot] = useState(0);

  // Triple player containers & refs
  const containerARef = useRef<HTMLDivElement>(null);
  const containerBRef = useRef<HTMLDivElement>(null);
  const containerCRef = useRef<HTMLDivElement>(null);
  const playerARef = useRef<YT.Player | null>(null);
  const playerBRef = useRef<YT.Player | null>(null);
  const playerCRef = useRef<YT.Player | null>(null);

  // Which videoId is loaded in each slot
  const videoInSlotRef = useRef<(string | null)[]>([null, null, null]);
  const activeSlotRef = useRef(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentIndexRef = useRef(-1);
  const creatingRef = useRef<boolean[]>([false, false, false]);
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

  // ── Helpers ─────────────────────────────────────────────────

  const getPlayer = useCallback((slot: number): YT.Player | null => {
    if (slot === 0) return playerARef.current;
    if (slot === 1) return playerBRef.current;
    return playerCRef.current;
  }, []);

  const getPlayerRef = useCallback((slot: number) => {
    if (slot === 0) return playerARef;
    if (slot === 1) return playerBRef;
    return playerCRef;
  }, []);

  const getContainer = useCallback((slot: number): HTMLDivElement | null => {
    if (slot === 0) return containerARef.current;
    if (slot === 1) return containerBRef.current;
    return containerCRef.current;
  }, []);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const goToIndexRef = useRef<(idx: number) => void>(() => {});

  // Advance to next track or stop
  const advanceOrStop = useCallback(() => {
    const nextIdx = currentIndexRef.current + 1;
    if (nextIdx < playlistRef.current.length) {
      goToIndexRef.current(nextIdx);
    } else {
      clearTimer();
      try {
        getPlayer(activeSlotRef.current)?.pauseVideo();
      } catch {
        /* */
      }
      setIsPlaying(false);
      setCurrentIndex(-1);
      currentIndexRef.current = -1;
    }
  }, [clearTimer, getPlayer]);

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
          if (endSec > 0) {
            if (current >= endSec) {
              clearTimer();
              advanceOrStop();
            }
          } else {
            const duration = p.getDuration();
            if (duration > 0 && current >= duration - 0.3) {
              clearTimer();
              advanceOrStop();
            }
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

      // Collect up to 2 distinct upcoming videoIds different from active
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

          const pRef = getPlayerRef(targetSlot);
          const slotNum = targetSlot;

          const p = new window.YT.Player(el, {
            videoId,
            width: "100%",
            height: "100%",
            playerVars: { autoplay: 0, start: Math.floor(startSec), rel: 0, modestbranding: 1 },
            events: {
              onReady() {
                creatingRef.current[slotNum] = false;
                pRef.current = p;
                videoInSlotRef.current[slotNum] = videoId;
              },
              onStateChange(e) {
                if (
                  e.data === window.YT.PlayerState.ENDED &&
                  activeSlotRef.current === slotNum
                ) {
                  clearTimer();
                  goToIndexRef.current(currentIndexRef.current + 1);
                }
              },
              onError() {
                creatingRef.current[slotNum] = false;
              },
            },
          });
        }
      }
    },
    [getPlayer, getContainer, getPlayerRef, clearTimer],
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
          const pRef = getPlayerRef(i);
          if (pRef.current) {
            try { pRef.current.destroy(); } catch { /* */ }
            pRef.current = null;
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

        const pRef = getPlayerRef(i);
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
              pRef.current = p;
              videoInSlotRef.current[slotNum] = videoId;
            },
            onStateChange(e) {
              if (
                e.data === window.YT.PlayerState.ENDED &&
                activeSlotRef.current === slotNum
              ) {
                clearTimer();
                goToIndexRef.current(currentIndexRef.current + 1);
              }
            },
            onError() {
              creatingRef.current[slotNum] = false;
            },
          },
        });
      }
    },
    [getPlayer, getContainer, getPlayerRef, clearTimer],
  );

  // Trigger preload when panel expands
  useEffect(() => {
    if (expanded && playlist.length > 0) {
      preloadPlayers();
    }
  }, [expanded, playlist, preloadPlayers]);

  // ── Navigate to a specific playlist index ───────────────────

  const goToIndex = useCallback(
    (index: number) => {
      const items = playlistRef.current;
      if (index < 0 || index >= items.length) return;

      const item = items[index];
      const act = activeSlotRef.current;
      const activePlayer = getPlayer(act);
      if (!activePlayer) return;

      currentIndexRef.current = index;
      setCurrentIndex(index);
      setIsPlaying(true);
      clearTimer();

      const activeVideoId = videoInSlotRef.current[act];

      if (item.video.videoId === activeVideoId) {
        // Same video → smooth seek only
        activePlayer.seekTo(item.video.startSec, true);
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
          matchPlayer.seekTo(item.video.startSec, true);
          matchPlayer.playVideo();

          activeSlotRef.current = matchSlot;
          setActiveSlot(matchSlot);
        } else {
          // Fallback: load on active player
          activePlayer.loadVideoById(item.video.videoId, item.video.startSec);
          videoInSlotRef.current[act] = item.video.videoId;
        }
      }

      startEndPolling(item.video.endSec);
      preloadNextRef.current(index);
    },
    [clearTimer, startEndPolling, getPlayer],
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
      for (let i = 0; i < NUM_SLOTS; i++) {
        try {
          getPlayer(i)?.destroy();
        } catch {
          /* */
        }
      }
      playerARef.current = null;
      playerBRef.current = null;
      playerCRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clearTimer]);

  // Create the active player and start playback
  const initPlayer = useCallback(
    async (startIndex: number) => {
      if (creatingRef.current.some(Boolean)) return;
      const items = playlistRef.current;
      if (startIndex < 0 || startIndex >= items.length) return;
      const container = containerARef.current;
      if (!container) return;

      const slot = 0;
      creatingRef.current[slot] = true;
      activeSlotRef.current = slot;
      setActiveSlot(slot);

      // Clean all players
      clearTimer();
      for (let i = 0; i < NUM_SLOTS; i++) {
        try {
          getPlayer(i)?.destroy();
        } catch {
          /* */
        }
        const c = getContainer(i);
        if (c) c.innerHTML = "";
      }
      playerARef.current = null;
      playerBRef.current = null;
      playerCRef.current = null;
      videoInSlotRef.current = [null, null, null];

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
            playerARef.current = player;
            videoInSlotRef.current[slot] = item.video.videoId;
            if (item.video.startSec > 0) {
              player.seekTo(item.video.startSec, true);
            }
            currentIndexRef.current = startIndex;
            setCurrentIndex(startIndex);
            setIsPlaying(true);
            startEndPolling(item.video.endSec);
            preloadNextRef.current(startIndex);
          },
          onStateChange(e) {
            if (
              e.data === window.YT.PlayerState.ENDED &&
              activeSlotRef.current === slot
            ) {
              clearTimer();
              goToIndexRef.current(currentIndexRef.current + 1);
            }
          },
          onError() {
            creatingRef.current[slot] = false;
          },
        },
      });
    },
    [clearTimer, startEndPolling, getPlayer, getContainer],
  );

  // ── Controls ──────────────────────────────────────────────

  const handlePlay = useCallback(() => {
    if (playlist.length === 0) return;

    const activePlayer = getPlayer(activeSlotRef.current);
    if (activePlayer) {
      if (currentIndexRef.current >= 0 && !isPlaying) {
        activePlayer.playVideo();
        setIsPlaying(true);
        const item = playlistRef.current[currentIndexRef.current];
        if (item) startEndPolling(item.video.endSec);
      } else if (currentIndexRef.current < 0) {
        goToIndex(0);
      }
    } else {
      initPlayer(0);
    }
  }, [playlist, isPlaying, goToIndex, initPlayer, startEndPolling, getPlayer]);

  const handlePause = useCallback(() => {
    clearTimer();
    try {
      getPlayer(activeSlotRef.current)?.pauseVideo();
    } catch {
      /* */
    }
    setIsPlaying(false);
  }, [clearTimer, getPlayer]);

  const handleStop = useCallback(() => {
    clearTimer();
    try {
      getPlayer(activeSlotRef.current)?.pauseVideo();
    } catch {
      /* */
    }
    setIsPlaying(false);
    setCurrentIndex(-1);
    currentIndexRef.current = -1;
  }, [clearTimer, getPlayer]);

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

  // ── Render ────────────────────────────────────────────────

  const currentItem =
    currentIndex >= 0 && currentIndex < playlist.length
      ? playlist[currentIndex]
      : null;

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
          <div className="w-1 h-5 rounded-full bg-[#ff3b7f]" />
          <h3 className="font-[family-name:var(--font-display)] text-base font-semibold tracking-wider uppercase text-[#ff6b9d]">
            Sequence Player
          </h3>
          {playlist.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[rgba(255,59,127,0.1)] border border-[rgba(255,59,127,0.2)] text-[#ff6b9d] font-mono">
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
              {/* Player area — triple containers for instant swap */}
              <div className="rounded-lg overflow-hidden border border-[rgba(255,59,127,0.15)]">
                <div className="aspect-video bg-black relative">
                  <div
                    ref={containerARef}
                    className="absolute inset-0"
                    style={{ zIndex: activeSlot === 0 ? 3 : 1 }}
                  />
                  <div
                    ref={containerBRef}
                    className="absolute inset-0"
                    style={{ zIndex: activeSlot === 1 ? 3 : 1 }}
                  />
                  <div
                    ref={containerCRef}
                    className="absolute inset-0"
                    style={{ zIndex: activeSlot === 2 ? 3 : 1 }}
                  />
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
                  <span className="text-[#ff6b9d] font-medium">
                    {currentItem.slot} · {currentItem.memberName}
                  </span>
                  <span className="text-[#8b87a0] font-mono">
                    {currentIndex + 1} / {playlist.length}
                  </span>
                </div>
              )}

              {/* Controls */}
              <div className="flex items-center gap-1.5">
                {!isPlaying ? (
                  <button
                    onClick={handlePlay}
                    className="h-7 px-3 rounded text-[10px] font-semibold tracking-wider uppercase border border-[rgba(255,59,127,0.25)] bg-[rgba(255,59,127,0.06)] text-[#ff6b9d] transition-all duration-200 hover:border-[rgba(255,59,127,0.5)] hover:bg-[rgba(255,59,127,0.12)]"
                  >
                    {currentIndex >= 0 ? "再開" : "▶ 再生"}
                  </button>
                ) : (
                  <button
                    onClick={handlePause}
                    className="h-7 px-3 rounded text-[10px] font-semibold tracking-wider uppercase border border-[rgba(255,59,127,0.25)] bg-[rgba(255,59,127,0.06)] text-[#ff6b9d] transition-all duration-200 hover:border-[rgba(255,59,127,0.5)] hover:bg-[rgba(255,59,127,0.12)]"
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
                {playlist.map((item, i) => (
                  <button
                    key={`${item.key}-${i}`}
                    onClick={() => handleTrackClick(i)}
                    className={`w-full text-left flex items-center gap-2 px-2 py-1 rounded transition-all duration-150 ${
                      i === currentIndex
                        ? "bg-[rgba(255,59,127,0.1)] border border-[rgba(255,59,127,0.25)]"
                        : "border border-transparent hover:bg-[rgba(255,255,255,0.03)]"
                    }`}
                  >
                    <span
                      className={`text-[10px] font-mono w-5 text-right flex-shrink-0 ${
                        i === currentIndex
                          ? "text-[#ff6b9d]"
                          : "text-[#5a5770]"
                      }`}
                    >
                      {i === currentIndex && isPlaying ? "▸" : `${i + 1}`}
                    </span>
                    <span
                      className={`text-[10px] font-medium w-6 flex-shrink-0 ${
                        i === currentIndex
                          ? "text-[#ff6b9d]"
                          : "text-[#8b87a0]"
                      }`}
                    >
                      {item.slot}
                    </span>
                    <span
                      className={`text-[11px] truncate ${
                        i === currentIndex
                          ? "text-[#e8e6f0]"
                          : "text-[#c4c1d0]"
                      }`}
                    >
                      {item.memberName}
                    </span>
                    <span
                      className={`text-[9px] font-mono ml-auto flex-shrink-0 ${
                        i === currentIndex
                          ? "text-[#ff6b9d] opacity-70"
                          : "text-[#5a5770]"
                      }`}
                    >
                      {item.video.startSec}s–
                      {item.video.endSec > 0
                        ? `${item.video.endSec}s`
                        : "end"}
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
