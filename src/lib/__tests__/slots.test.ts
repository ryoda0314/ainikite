import {
  expandBlocks,
  expandBlocksWithKeys,
  isSequenceComplete,
  isSequenceLocked,
  validateBlockSequence,
  generateSimpleOutput,
  applyTemplate,
  extractYouTubeId,
} from "../slots";
import type { Block, Assignment } from "../types";

describe("expandBlocks", () => {
  it("expands A123 to [A1, A2, A3]", () => {
    expect(expandBlocks(["A123"])).toEqual(["A1", "A2", "A3"]);
  });

  it("expands A23 to [A2, A3]", () => {
    expect(expandBlocks(["A23"])).toEqual(["A2", "A3"]);
  });

  it("expands B123 to [B1, B2, B3]", () => {
    expect(expandBlocks(["B123"])).toEqual(["B1", "B2", "B3"]);
  });

  it("expands B23 to [B2, B3]", () => {
    expect(expandBlocks(["B23"])).toEqual(["B2", "B3"]);
  });

  it("expands a full sequence", () => {
    expect(expandBlocks(["A123", "A23", "B23"])).toEqual([
      "A1", "A2", "A3", "A2", "A3", "B2", "B3",
    ]);
  });

  it("handles empty blocks", () => {
    expect(expandBlocks([])).toEqual([]);
  });

  it("expands multi-A + B123 sequence", () => {
    expect(expandBlocks(["A123", "A123", "B123"])).toEqual([
      "A1", "A2", "A3", "A1", "A2", "A3", "B1", "B2", "B3",
    ]);
  });
});

describe("expandBlocksWithKeys", () => {
  it("produces positional keys", () => {
    const result = expandBlocksWithKeys(["A123", "B23"]);
    expect(result).toEqual([
      { key: "0:0", slot: "A1", blockIndex: 0, slotIndex: 0 },
      { key: "0:1", slot: "A2", blockIndex: 0, slotIndex: 1 },
      { key: "0:2", slot: "A3", blockIndex: 0, slotIndex: 2 },
      { key: "1:0", slot: "B2", blockIndex: 1, slotIndex: 0 },
      { key: "1:1", slot: "B3", blockIndex: 1, slotIndex: 1 },
    ]);
  });

  it("handles duplicate blocks independently", () => {
    const result = expandBlocksWithKeys(["A123", "A123"]);
    expect(result[0].key).toBe("0:0");
    expect(result[3].key).toBe("1:0");
    expect(result[0].slot).toBe("A1");
    expect(result[3].slot).toBe("A1");
  });
});

describe("isSequenceComplete", () => {
  it("returns false for empty", () => {
    expect(isSequenceComplete([])).toBe(false);
  });

  it("returns false when last is A block", () => {
    expect(isSequenceComplete(["A123"])).toBe(false);
    expect(isSequenceComplete(["A123", "A23"])).toBe(false);
  });

  it("returns true when last is B123", () => {
    expect(isSequenceComplete(["A123", "B123"])).toBe(true);
  });

  it("returns true when last is B23", () => {
    expect(isSequenceComplete(["B23"])).toBe(true);
  });
});

describe("isSequenceLocked", () => {
  it("returns false for no B blocks", () => {
    expect(isSequenceLocked([])).toBe(false);
    expect(isSequenceLocked(["A123", "A23"])).toBe(false);
  });

  it("returns true if any B block exists", () => {
    expect(isSequenceLocked(["A123", "B23"])).toBe(true);
    expect(isSequenceLocked(["B123"])).toBe(true);
  });
});

describe("validateBlockSequence", () => {
  it("valid for empty", () => {
    expect(validateBlockSequence([]).valid).toBe(true);
  });

  it("valid for A-only", () => {
    expect(validateBlockSequence(["A123", "A23"]).valid).toBe(true);
  });

  it("valid for A + terminal B", () => {
    expect(validateBlockSequence(["A123", "A23", "B23"]).valid).toBe(true);
  });

  it("valid for B-only at end", () => {
    expect(validateBlockSequence(["B123"]).valid).toBe(true);
  });

  it("invalid if B not at end", () => {
    const result = validateBlockSequence(["B123", "A23"]);
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });
});

describe("generateSimpleOutput", () => {
  it("generates correct output for 7-person preset", () => {
    // blocks: A123(0) → A23(1) → B23(2)
    // expanded: 0:0(A1) 0:1(A2) 0:2(A3) 1:0(A2) 1:1(A3) 2:0(B2) 2:1(B3)
    const blocks: Block[] = ["A123", "A23", "B23"];
    const assignment: Assignment = {
      "0:0": "Alice",
      "0:1": "Bob",
      "0:2": "Carol",
      "1:0": "Bob",
      "1:1": "Carol",
      "2:0": "Dave",
      "2:1": "Eve",
    };
    const result = generateSimpleOutput(blocks, assignment);
    expect(result).toBe("Alice! Bob! Carol! Bob! Carol! Dave! Eve!");
  });

  it("allows independent assignment of same slot type", () => {
    // Two A123 blocks — same slot types but independent names
    const blocks: Block[] = ["A123", "A123"];
    const assignment: Assignment = {
      "0:0": "Alice",  // first A1
      "0:1": "Bob",    // first A2
      "0:2": "Carol",  // first A3
      "1:0": "Xander", // second A1 (different!)
      "1:1": "Yuki",   // second A2 (different!)
      "1:2": "Zara",   // second A3 (different!)
    };
    const result = generateSimpleOutput(blocks, assignment);
    expect(result).toBe("Alice! Bob! Carol! Xander! Yuki! Zara!");
  });

  it("shows placeholder for unassigned slots", () => {
    const blocks: Block[] = ["A123", "B123"];
    const assignment: Assignment = { "0:0": "Alice" };
    const result = generateSimpleOutput(blocks, assignment);
    expect(result).toContain("Alice!");
    expect(result).toContain("[A2未設定]!");
    expect(result).toContain("[A3未設定]!");
    expect(result).toContain("[B1未設定]!");
  });

  it("handles empty blocks", () => {
    expect(generateSimpleOutput([], {})).toBe("");
  });
});

describe("applyTemplate", () => {
  it("replaces {SEQ} with expanded output", () => {
    // blocks: A23(0) → B23(1)
    // expanded: 0:0(A2) 0:1(A3) 1:0(B2) 1:1(B3)
    const blocks: Block[] = ["A23", "B23"];
    const assignment: Assignment = {
      "0:0": "Bob",   // A2
      "1:1": "Eve",   // B3
    };
    const result = applyTemplate("{SEQ}", blocks, assignment);
    expect(result).toBe("Bob! [A3未設定]! [B2未設定]! Eve!");
  });

  it("replaces individual slot references", () => {
    // blocks: A123(0) → B23(1) — includes A1 slot
    const blocks: Block[] = ["A123", "B23"];
    const assignment: Assignment = {
      "0:0": "Alice", // A1
      "0:1": "Bob",   // A2
      "0:2": "Carol", // A3
      "1:1": "Eve",   // B3
    };
    const result = applyTemplate("Leader: {A1}, Last: {B3}", blocks, assignment);
    expect(result).toBe("Leader: Alice, Last: Eve");
  });

  it("replaces positional key references", () => {
    const blocks: Block[] = ["A123", "B23"];
    const assignment: Assignment = {
      "0:0": "Alice",
      "1:1": "Eve",
    };
    const result = applyTemplate("First: {0:0}, Last: {1:1}", blocks, assignment);
    expect(result).toBe("First: Alice, Last: Eve");
  });

  it("combines {SEQ} with surrounding text", () => {
    const blocks: Block[] = ["A23", "B23"];
    const assignment: Assignment = {
      "0:0": "Bob",
      "1:1": "Eve",
    };
    const result = applyTemplate("Let's go! {SEQ} Yeah!", blocks, assignment);
    expect(result).toContain("Let's go!");
    expect(result).toContain("Yeah!");
    expect(result).toContain("Bob!");
  });
});

describe("extractYouTubeId", () => {
  it("extracts from full URL", () => {
    expect(extractYouTubeId("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("extracts from short URL", () => {
    expect(extractYouTubeId("https://youtu.be/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("extracts from embed URL", () => {
    expect(extractYouTubeId("https://www.youtube.com/embed/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("returns raw ID if 11 chars", () => {
    expect(extractYouTubeId("dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("returns null for invalid input", () => {
    expect(extractYouTubeId("")).toBeNull();
    expect(extractYouTubeId("not-a-url")).toBeNull();
  });
});
