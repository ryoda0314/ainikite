export type Slot = "A1" | "A2" | "A3" | "B1" | "B2" | "B3";

export type Block = "A123" | "A23" | "B123" | "B23";

/** Position-based assignment: key is "blockIndex:slotIndex" (e.g. "0:0", "1:2") */
export type Assignment = Record<string, string>;

/** Expanded slot with positional key */
export interface ExpandedSlotInfo {
  key: string;        // "blockIndex:slotIndex"
  slot: Slot;
  blockIndex: number;
  slotIndex: number;
}

/** Per-member YouTube video configuration */
export interface MemberVideo {
  videoId: string;
  startSec: number;
  endSec: number;
}

/** Map from member name to their YouTube video settings */
export type MemberVideos = Record<string, MemberVideo>;

export interface ProjectData {
  blocks: Block[];
  assignment: Assignment;
  template: string;
  youtube: {
    videoId: string;
    startSec: number;
  };
  memberVideos: MemberVideos;
}

export interface SavedProject extends ProjectData {
  id: string;
  created_at: string;
}

export type TemplateMode = "simple" | "advanced";
