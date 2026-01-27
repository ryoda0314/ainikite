"use client";

import type { Block } from "@/lib/types";
import { BLOCK_COLORS, BLOCK_GLOW, SLOT_COLORS, isTerminalBlock } from "@/lib/constants";
import { expandBlocks, isSequenceLocked, isSequenceComplete, validateBlockSequence } from "@/lib/slots";
import { Badge } from "@/components/ui/badge";

interface Props {
  blocks: Block[];
  onAdd: (block: Block) => void;
  onRemove: (index: number) => void;
  onMove: (from: number, to: number) => void;
  onClear: () => void;
}

const BLOCK_LABELS: Record<Block, string> = {
  A123: "A1 A2 A3",
  A23: "A2 A3",
  B123: "B1 B2 B3",
  B23: "B2 B3",
};

export function BlockSequenceEditor({ blocks, onAdd, onRemove, onMove, onClear }: Props) {
  const locked = isSequenceLocked(blocks);
  const complete = isSequenceComplete(blocks);
  const validation = validateBlockSequence(blocks);
  const expanded = expandBlocks(blocks);

  return (
    <div className="space-y-5 animate-fade-up">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-1 h-5 rounded-full bg-[#ff2b4e]" />
          <h3 className="font-[family-name:var(--font-display)] text-base font-semibold tracking-wider uppercase text-[#ff5a73]">
            Block Sequence
          </h3>
        </div>
        {blocks.length > 0 && (
          <button
            onClick={onClear}
            className="text-xs text-[#8b87a0] hover:text-[#ff3b7f] transition-colors duration-200 tracking-wide uppercase"
          >
            Clear
          </button>
        )}
      </div>

      {/* Current sequence — the "stage" */}
      <div className="min-h-[4.5rem] rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-4 flex flex-wrap items-center gap-3 relative overflow-hidden">
        {blocks.length > 0 && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[120%] bg-[radial-gradient(ellipse,rgba(255,59,127,0.04),transparent_70%)]" />
          </div>
        )}

        {blocks.length === 0 ? (
          <span className="text-sm text-[#8b87a0] mx-auto">
            ブロックを追加してステージを組み立てましょう
          </span>
        ) : (
          blocks.map((block, i) => (
            <div key={i} className="group relative flex items-center gap-1.5 animate-fade-up" style={{ animationDelay: `${i * 60}ms` }}>
              {i > 0 && (
                <div className="absolute -left-2.5 top-1/2 w-2 h-px bg-[rgba(255,255,255,0.12)]" />
              )}
              <div className={`relative inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium tracking-wide transition-all duration-300 hover:scale-105 cursor-default ${BLOCK_COLORS[block]} ${BLOCK_GLOW[block]}`}>
                <span className="font-[family-name:var(--font-display)] font-semibold">{BLOCK_LABELS[block]}</span>
                {isTerminalBlock(block) && (
                  <span className="text-[9px] font-bold tracking-widest opacity-60 uppercase bg-[rgba(255,255,255,0.06)] px-1.5 py-0.5 rounded">
                    end
                  </span>
                )}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 flex items-center gap-1 pb-1 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none group-hover:pointer-events-auto">
                  {i > 0 && (
                    <button onClick={() => onMove(i, i - 1)} className="w-5 h-5 rounded flex items-center justify-center text-[10px] bg-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.15)] text-[#c4c1d0] transition-colors" title="左へ">◀</button>
                  )}
                  <button onClick={() => onRemove(i)} className="w-5 h-5 rounded flex items-center justify-center text-[10px] bg-[rgba(255,59,127,0.15)] hover:bg-[rgba(255,59,127,0.3)] text-[#ff6b9d] transition-colors" title="削除">✕</button>
                  {i < blocks.length - 1 && (
                    <button onClick={() => onMove(i, i + 1)} className="w-5 h-5 rounded flex items-center justify-center text-[10px] bg-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.15)] text-[#c4c1d0] transition-colors" title="右へ">▶</button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Status indicators */}
      <div className="flex items-center gap-2 text-xs">
        {!validation.valid && (
          <span className="text-[#ff4444] flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#ff4444]" />
            {validation.error}
          </span>
        )}
        {complete && (
          <span className="flex items-center gap-1.5 text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-glow-pulse" />
            完成
          </span>
        )}
        {!complete && blocks.length > 0 && (
          <span className="flex items-center gap-1.5 text-amber-400">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            Bブロックで終了してください
          </span>
        )}
        {locked && (
          <span className="flex items-center gap-1.5 text-[#00d4ff] ml-auto">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
            ロック
          </span>
        )}
      </div>

      {/* Add block buttons */}
      <div className="grid grid-cols-2 gap-2.5">
        <button onClick={() => onAdd("A123")} disabled={locked} className="group relative h-11 rounded-lg border border-[rgba(255,59,127,0.2)] bg-[rgba(255,59,127,0.04)] text-[#ff6b9d] text-sm font-medium tracking-wide transition-all duration-300 hover:border-[rgba(255,59,127,0.4)] hover:bg-[rgba(255,59,127,0.08)] hover:shadow-[0_0_20px_rgba(255,59,127,0.15)] disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:shadow-none disabled:hover:bg-[rgba(255,59,127,0.04)]">
          <span className="font-[family-name:var(--font-display)]">+ A1 A2 A3</span>
        </button>
        <button onClick={() => onAdd("A23")} disabled={locked} className="group relative h-11 rounded-lg border border-[rgba(255,107,74,0.2)] bg-[rgba(255,107,74,0.04)] text-[#ff8a6a] text-sm font-medium tracking-wide transition-all duration-300 hover:border-[rgba(255,107,74,0.4)] hover:bg-[rgba(255,107,74,0.08)] hover:shadow-[0_0_20px_rgba(255,107,74,0.15)] disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:shadow-none disabled:hover:bg-[rgba(255,107,74,0.04)]">
          <span className="font-[family-name:var(--font-display)]">+ A2 A3</span>
        </button>
        <button onClick={() => onAdd("B123")} disabled={locked} className="group relative h-11 rounded-lg border border-[rgba(0,212,255,0.2)] bg-[rgba(0,212,255,0.04)] text-[#40dfff] text-sm font-medium tracking-wide transition-all duration-300 hover:border-[rgba(0,212,255,0.4)] hover:bg-[rgba(0,212,255,0.08)] hover:shadow-[0_0_20px_rgba(0,212,255,0.15)] disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:shadow-none disabled:hover:bg-[rgba(0,212,255,0.04)]">
          <span className="font-[family-name:var(--font-display)]">+ B1 B2 B3</span>
          <span className="ml-1.5 text-[9px] opacity-60 uppercase tracking-widest">end</span>
        </button>
        <button onClick={() => onAdd("B23")} disabled={locked} className="group relative h-11 rounded-lg border border-[rgba(124,92,255,0.2)] bg-[rgba(124,92,255,0.04)] text-[#9d85ff] text-sm font-medium tracking-wide transition-all duration-300 hover:border-[rgba(124,92,255,0.4)] hover:bg-[rgba(124,92,255,0.08)] hover:shadow-[0_0_20px_rgba(124,92,255,0.15)] disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:shadow-none disabled:hover:bg-[rgba(124,92,255,0.04)]">
          <span className="font-[family-name:var(--font-display)]">+ B2 B3</span>
          <span className="ml-1.5 text-[9px] opacity-60 uppercase tracking-widest">end</span>
        </button>
      </div>

      {/* Expanded slot preview */}
      {expanded.length > 0 && (
        <div className="space-y-2 pt-1">
          <p className="text-[11px] text-[#8b87a0] font-medium tracking-wide uppercase">Expanded Slots</p>
          <div className="flex flex-wrap gap-1.5 stagger-children">
            {expanded.map((slot, i) => (
              <Badge key={i} variant="outline" className={`text-[11px] font-[family-name:var(--font-display)] font-semibold tracking-wider animate-fade-up ${SLOT_COLORS[slot]}`}>
                {slot}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
