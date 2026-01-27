import type { Slot, MemberVideos } from "./types";
import { SLOT_CANDIDATES as DEFAULT_SLOT_CANDIDATES, DEFAULT_MEMBER_VIDEOS } from "./constants";

export type SlotCandidates = Record<Slot, string[]>;

const KEY_SLOTS = "ilife-slot-candidates";
const KEY_VIDEOS = "ilife-member-videos";

export function loadSlotCandidates(): SlotCandidates {
  if (typeof window === "undefined") return structuredClone(DEFAULT_SLOT_CANDIDATES);
  try {
    const raw = localStorage.getItem(KEY_SLOTS);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return structuredClone(DEFAULT_SLOT_CANDIDATES);
}

export function saveSlotCandidates(candidates: SlotCandidates) {
  localStorage.setItem(KEY_SLOTS, JSON.stringify(candidates));
}

export function loadMemberVideos(): MemberVideos {
  if (typeof window === "undefined") return { ...DEFAULT_MEMBER_VIDEOS };
  try {
    const raw = localStorage.getItem(KEY_VIDEOS);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { ...DEFAULT_MEMBER_VIDEOS };
}

export function saveMemberVideos(videos: MemberVideos) {
  localStorage.setItem(KEY_VIDEOS, JSON.stringify(videos));
}

export function allCandidatesFromSlots(candidates: SlotCandidates): string[] {
  return Array.from(new Set(Object.values(candidates).flat()));
}
