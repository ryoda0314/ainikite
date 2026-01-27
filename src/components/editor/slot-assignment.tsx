"use client";

import { useState, useMemo } from "react";
import type { Block, Assignment } from "@/lib/types";
import { SLOT_THEME, BLOCK_COLORS, BLOCK_GLOW } from "@/lib/constants";
import { expandBlocksWithKeys } from "@/lib/slots";
import { loadSlotCandidates } from "@/lib/settings-store";

const BLOCK_LABELS: Record<string, string> = {
  A123: "A1 A2 A3",
  A23: "A2 A3",
  B123: "B1 B2 B3",
  B23: "B2 B3",
};

interface Props {
  blocks: Block[];
  assignment: Assignment;
  onAssign: (key: string, name: string) => void;
  onClear: (key: string) => void;
  onReset: () => void;
  onApplyRandom: () => void;
}

export function SlotAssignment({ blocks, assignment, onAssign, onClear, onReset, onApplyRandom }: Props) {
  const expanded = expandBlocksWithKeys(blocks);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const slotCandidates = useMemo(() => loadSlotCandidates(), []);

  const handleSelect = (key: string, name: string) => {
    onAssign(key, name);
    setEditingKey(null);
  };

  // Group expanded slots by blockIndex
  const blockGroups: { blockIndex: number; block: Block; items: typeof expanded }[] = [];
  for (const info of expanded) {
    let group = blockGroups.find((g) => g.blockIndex === info.blockIndex);
    if (!group) {
      group = { blockIndex: info.blockIndex, block: blocks[info.blockIndex], items: [] };
      blockGroups.push(group);
    }
    group.items.push(info);
  }

  return (
    <div className="space-y-5 animate-fade-up" style={{ animationDelay: "100ms" }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-1 h-5 rounded-full bg-[#ffb830]" />
          <h3 className="font-[family-name:var(--font-display)] text-base font-semibold tracking-wider uppercase text-[#ffcc66]">
            Slot Assignment
          </h3>
        </div>
        <div className="flex gap-2">
          <button onClick={onApplyRandom} className="text-[11px] text-[#8b87a0] hover:text-[#ffb830] transition-colors duration-200 tracking-wide uppercase px-2 py-1 rounded hover:bg-[rgba(255,184,48,0.06)]">
            ランダム
          </button>
          <button onClick={onReset} className="text-[11px] text-[#8b87a0] hover:text-[#ff3b7f] transition-colors duration-200 tracking-wide uppercase px-2 py-1 rounded hover:bg-[rgba(255,59,127,0.06)]">
            リセット
          </button>
        </div>
      </div>

      {expanded.length === 0 && (
        <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-6 text-center">
          <p className="text-sm text-[#8b87a0]">ブロックを追加すると、使用される枠が表示されます</p>
        </div>
      )}

      <div className="space-y-5">
        {blockGroups.map((group) => (
          <div key={group.blockIndex} className="space-y-3">
            {/* Block header */}
            <div className="flex items-center gap-2">
              <div className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] font-[family-name:var(--font-display)] font-semibold tracking-wider ${BLOCK_COLORS[group.block]} ${BLOCK_GLOW[group.block]}`}>
                <span className="opacity-50">#{group.blockIndex + 1}</span>
                <span>{BLOCK_LABELS[group.block]}</span>
              </div>
            </div>

            {/* Slot cards for this block */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {group.items.map((info) => {
                const theme = SLOT_THEME[info.slot];
                const isEditing = editingKey === info.key;
                const hasValue = !!assignment[info.key];

                return (
                  <div
                    key={info.key}
                    className={`relative rounded-xl border p-3.5 space-y-2.5 transition-all duration-300 animate-fade-up ${isEditing ? theme.glowStrong : hasValue ? theme.glow : ""}`}
                    style={{ backgroundColor: theme.bg, borderColor: isEditing ? theme.color : theme.border }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-[family-name:var(--font-display)] text-xs font-bold tracking-widest uppercase" style={{ color: theme.color }}>{info.slot}</span>
                      {hasValue && (
                        <button onClick={() => onClear(info.key)} className="w-4 h-4 rounded flex items-center justify-center text-[9px] opacity-40 hover:opacity-100 transition-opacity" style={{ color: theme.color }} title="クリア">✕</button>
                      )}
                    </div>

                    <div className="text-sm font-semibold min-h-[1.75rem] flex items-center" style={{ color: hasValue ? "#e8e6f0" : "rgba(139,135,160,0.5)" }}>
                      {hasValue ? assignment[info.key] : "未設定"}
                    </div>

                    {isEditing ? (
                      <div className="space-y-2">
                        <div className="flex flex-wrap gap-1">
                          {slotCandidates[info.slot].map((name) => (
                            <button
                              key={name}
                              onClick={() => handleSelect(info.key, name)}
                              className="text-[11px] px-2 py-1 rounded-md transition-all duration-200 border bg-[rgba(255,255,255,0.04)] border-[rgba(255,255,255,0.08)] text-[#c4c1d0] hover:bg-[rgba(255,255,255,0.08)]"
                            >
                              {name}
                            </button>
                          ))}
                        </div>
                        <button onClick={() => setEditingKey(null)} className="w-full h-6 text-[10px] text-[#8b87a0] hover:text-[#c4c1d0] transition-colors tracking-wide uppercase">
                          閉じる
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setEditingKey(info.key)}
                        className="w-full h-8 rounded-lg text-xs font-medium tracking-wide transition-all duration-300 border bg-[rgba(255,255,255,0.03)] border-[rgba(255,255,255,0.08)] text-[#8b87a0] hover:border-[rgba(255,255,255,0.15)] hover:text-[#c4c1d0]"
                      >
                        選択
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
