import type { Block, Slot, Assignment, ExpandedSlotInfo } from "./types";
import { BLOCK_EXPANSION, isTerminalBlock } from "./constants";

/** Expand a block sequence into a flat slot array */
export function expandBlocks(blocks: Block[]): Slot[] {
  return blocks.flatMap((b) => BLOCK_EXPANSION[b]);
}

/** Expand blocks with positional keys for independent assignment */
export function expandBlocksWithKeys(blocks: Block[]): ExpandedSlotInfo[] {
  return blocks.flatMap((block, blockIndex) =>
    BLOCK_EXPANSION[block].map((slot, slotIndex) => ({
      key: `${blockIndex}:${slotIndex}`,
      slot,
      blockIndex,
      slotIndex,
    }))
  );
}

/** Check if the sequence is "complete" (ends with a B block) */
export function isSequenceComplete(blocks: Block[]): boolean {
  if (blocks.length === 0) return false;
  return isTerminalBlock(blocks[blocks.length - 1]);
}

/** Check if the sequence is locked (already has a terminal B block) */
export function isSequenceLocked(blocks: Block[]): boolean {
  return blocks.some(isTerminalBlock);
}

/** Validate block sequence: B blocks can only appear at the very end, and at most once */
export function validateBlockSequence(blocks: Block[]): {
  valid: boolean;
  error?: string;
} {
  const terminalIndex = blocks.findIndex(isTerminalBlock);
  if (terminalIndex === -1) {
    return { valid: true };
  }
  if (terminalIndex !== blocks.length - 1) {
    return {
      valid: false,
      error: "Bブロックは最後にのみ配置できます",
    };
  }
  return { valid: true };
}

/** Get the set of slots actually used in the current block sequence */
export function usedSlots(blocks: Block[]): Set<Slot> {
  return new Set(expandBlocks(blocks));
}

/** Generate the output text from position-based assignment + blocks */
export function generateSimpleOutput(
  blocks: Block[],
  assignment: Assignment
): string {
  const expanded = expandBlocksWithKeys(blocks);
  return expanded
    .map((info) => {
      const name = assignment[info.key];
      return name ? `${name}!` : `[${info.slot}未設定]!`;
    })
    .join(" ");
}

/** Generate the SEQ string (for template substitution) */
export function generateSeq(
  blocks: Block[],
  assignment: Assignment
): string {
  return generateSimpleOutput(blocks, assignment);
}

/** Apply template: replace {SEQ} and individual {0:0} style keys */
export function applyTemplate(
  template: string,
  blocks: Block[],
  assignment: Assignment
): string {
  const seq = generateSeq(blocks, assignment);
  let result = template.replace(/\{SEQ\}/g, seq);

  // Replace positional references like {0:0}, {1:2}
  const expanded = expandBlocksWithKeys(blocks);
  for (const info of expanded) {
    const name = assignment[info.key] || `[${info.slot}未設定]`;
    result = result.replace(
      new RegExp(`\\{${info.key.replace(":", "\\:")}\\}`, "g"),
      name
    );
  }

  // Also allow slot-type references {A1}, {A2} etc. — uses first occurrence
  const allSlots: Slot[] = ["A1", "A2", "A3", "B1", "B2", "B3"];
  for (const slot of allSlots) {
    const first = expanded.find((e) => e.slot === slot);
    const name = first ? (assignment[first.key] || `[${slot}未設定]`) : `[${slot}未使用]`;
    result = result.replace(new RegExp(`\\{${slot}\\}`, "g"), name);
  }

  return result;
}

/** Extract YouTube video ID from URL or raw ID */
export function extractYouTubeId(input: string): string | null {
  if (!input) return null;
  if (/^[a-zA-Z0-9_-]{11}$/.test(input.trim())) {
    return input.trim();
  }
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = input.match(p);
    if (m) return m[1];
  }
  return null;
}
