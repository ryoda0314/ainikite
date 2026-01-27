import type { Block, Slot, Assignment, MemberVideos } from "./types";

/** Block → Slot expansion map */
export const BLOCK_EXPANSION: Record<Block, Slot[]> = {
  A123: ["A1", "A2", "A3"],
  A23: ["A2", "A3"],
  B123: ["B1", "B2", "B3"],
  B23: ["B2", "B3"],
};

/** Whether a block is a terminal (B-type) */
export function isTerminalBlock(b: Block): boolean {
  return b === "B123" || b === "B23";
}

/** Recommended candidates per slot */
export const SLOT_CANDIDATES: Record<Slot, string[]> = {
  A1: ["心花りり", "虹羽みに"],
  A2: ["深月らむ", "向日えな", "福丸うさ", "涼芽なの", "那蘭のどか"],
  A3: ["天羽しおり", "若葉のあ", "日日にこり", "空詩かれん", "甘音ゆあ"],
  B1: ["純嶺みき"],
  B2: ["有栖るな", "小熊まむ"],
  B3: ["あいす"],
};

/** All unique candidate names */
export const ALL_CANDIDATES: string[] = Array.from(
  new Set(Object.values(SLOT_CANDIDATES).flat())
);

/** Slot display labels */
export const SLOT_LABELS: Record<Slot, string> = {
  A1: "A1",
  A2: "A2",
  A3: "A3",
  B1: "B1",
  B2: "B2",
  B3: "B3",
};

/** Slot neon color config for dark stage theme */
export const SLOT_THEME: Record<
  Slot,
  { color: string; bg: string; border: string; glow: string; glowStrong: string }
> = {
  A1: {
    color: "#ff3b7f",
    bg: "rgba(255, 59, 127, 0.12)",
    border: "rgba(255, 59, 127, 0.3)",
    glow: "glow-a1",
    glowStrong: "glow-a1-strong",
  },
  A2: {
    color: "#ff6b4a",
    bg: "rgba(255, 107, 74, 0.12)",
    border: "rgba(255, 107, 74, 0.3)",
    glow: "glow-a2",
    glowStrong: "glow-a2-strong",
  },
  A3: {
    color: "#ffb830",
    bg: "rgba(255, 184, 48, 0.12)",
    border: "rgba(255, 184, 48, 0.3)",
    glow: "glow-a3",
    glowStrong: "glow-a3-strong",
  },
  B1: {
    color: "#00d4ff",
    bg: "rgba(0, 212, 255, 0.12)",
    border: "rgba(0, 212, 255, 0.3)",
    glow: "glow-b1",
    glowStrong: "glow-b1-strong",
  },
  B2: {
    color: "#7c5cff",
    bg: "rgba(124, 92, 255, 0.12)",
    border: "rgba(124, 92, 255, 0.3)",
    glow: "glow-b2",
    glowStrong: "glow-b2-strong",
  },
  B3: {
    color: "#c77dff",
    bg: "rgba(199, 125, 255, 0.12)",
    border: "rgba(199, 125, 255, 0.3)",
    glow: "glow-b3",
    glowStrong: "glow-b3-strong",
  },
};

/** Slot color classes for badges */
export const SLOT_COLORS: Record<Slot, string> = {
  A1: "border-[rgba(255,59,127,0.4)] text-[#ff3b7f] bg-[rgba(255,59,127,0.1)]",
  A2: "border-[rgba(255,107,74,0.4)] text-[#ff6b4a] bg-[rgba(255,107,74,0.1)]",
  A3: "border-[rgba(255,184,48,0.4)] text-[#ffb830] bg-[rgba(255,184,48,0.1)]",
  B1: "border-[rgba(0,212,255,0.4)] text-[#00d4ff] bg-[rgba(0,212,255,0.1)]",
  B2: "border-[rgba(124,92,255,0.4)] text-[#7c5cff] bg-[rgba(124,92,255,0.1)]",
  B3: "border-[rgba(199,125,255,0.4)] text-[#c77dff] bg-[rgba(199,125,255,0.1)]",
};

export const BLOCK_COLORS: Record<Block, string> = {
  A123: "border-[rgba(255,59,127,0.3)] text-[#ff6b9d] bg-[rgba(255,59,127,0.08)]",
  A23: "border-[rgba(255,107,74,0.3)] text-[#ff8a6a] bg-[rgba(255,107,74,0.08)]",
  B123: "border-[rgba(0,212,255,0.3)] text-[#40dfff] bg-[rgba(0,212,255,0.08)]",
  B23: "border-[rgba(124,92,255,0.3)] text-[#9d85ff] bg-[rgba(124,92,255,0.08)]",
};

export const BLOCK_GLOW: Record<Block, string> = {
  A123: "glow-a1",
  A23: "glow-a2",
  B123: "glow-b1",
  B23: "glow-b2",
};

export interface Preset {
  name: string;
  description: string;
  blocks: Block[];
  assignment: Assignment;
}

export const PRESETS: Preset[] = [
  {
    name: "空",
    description: "カスタム用の空テンプレート",
    blocks: [],
    assignment: {},
  },
];

export const DEFAULT_MEMBER_VIDEOS: MemberVideos = {
  "心花りり": { videoId: "-oYvgtgFz94", startSec: 31.5, endSec: 42.35 },
  "虹羽みに": { videoId: "-oYvgtgFz94", startSec: 103.5, endSec: 114.22 },
  "若葉のあ": { videoId: "-oYvgtgFz94", startSec: 53.1, endSec: 103.4 },
  "那蘭のどか": { videoId: "-oYvgtgFz94", startSec: 114.29, endSec: 124.91 },
  "空詩かれん": { videoId: "-oYvgtgFz94", startSec: 125.1, endSec: 165.4 },
  "純嶺みき": { videoId: "-oYvgtgFz94", startSec: 165.8, endSec: 176.1 },
  "小熊まむ": { videoId: "-oYvgtgFz94", startSec: 176.2, endSec: 186.9 },
  "あいす": { videoId: "-oYvgtgFz94", startSec: 187, endSec: 0 },
  "福丸うさ": { videoId: "-oYvgtgFz94", startSec: 42.38, endSec: 53 },
  "深月らむ": { videoId: "rhb0CsHfmLo", startSec: 48.02, endSec: 58.53 },
  "天羽しおり": { videoId: "rhb0CsHfmLo", startSec: 58.61, endSec: 109.1 },
  "向日えな": { videoId: "rhb0CsHfmLo", startSec: 109.2, endSec: 119.7 },
  "甘音ゆあ": { videoId: "rhb0CsHfmLo", startSec: 120.08, endSec: 160 },
  "有栖るな": { videoId: "rhb0CsHfmLo", startSec: 160.42, endSec: 171.1 },
  "涼芽なの": { videoId: "6Spe-x03YfU", startSec: 115.8, endSec: 126.2 },
  "日日にこり": { videoId: "6Spe-x03YfU", startSec: 126.59, endSec: 166.5 },
};

export const DEFAULT_TEMPLATE = "{SEQ}";
