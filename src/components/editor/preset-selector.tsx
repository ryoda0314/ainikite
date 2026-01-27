"use client";

import { PRESETS } from "@/lib/constants";

interface Props {
  onLoad: (index: number) => void;
}

export function PresetSelector({ onLoad }: Props) {
  return (
    <div className="space-y-3 animate-fade-up">
      <div className="flex items-center gap-3">
        <div className="w-1 h-5 rounded-full bg-[#7c5cff]" />
        <h3 className="font-[family-name:var(--font-display)] text-base font-semibold tracking-wider uppercase text-[#9d85ff]">
          Presets
        </h3>
      </div>

      <div className="flex flex-col gap-1.5">
        {PRESETS.map((preset, i) => (
          <button
            key={i}
            onClick={() => onLoad(i)}
            className="group w-full text-left rounded-lg border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] px-3 py-2.5 transition-all duration-300 hover:border-[rgba(124,92,255,0.3)] hover:bg-[rgba(124,92,255,0.05)] hover:shadow-[0_0_15px_rgba(124,92,255,0.1)]"
          >
            <div className="text-xs font-medium text-[#c4c1d0] group-hover:text-[#9d85ff] transition-colors">
              {preset.name}
            </div>
            <div className="text-[10px] text-[#6b6780] mt-0.5 font-mono">
              {preset.description}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
