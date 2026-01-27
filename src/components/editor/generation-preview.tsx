"use client";

import { useState } from "react";
import type { Block, Assignment, TemplateMode } from "@/lib/types";
import { generateSimpleOutput, applyTemplate, isSequenceComplete } from "@/lib/slots";
import { Input } from "@/components/ui/input";

interface Props {
  blocks: Block[];
  assignment: Assignment;
  template: string;
  onTemplateChange: (t: string) => void;
}

export function GenerationPreview({ blocks, assignment, template, onTemplateChange }: Props) {
  const [mode, setMode] = useState<TemplateMode>("simple");
  const [copied, setCopied] = useState(false);

  const complete = isSequenceComplete(blocks);

  const output =
    mode === "simple"
      ? generateSimpleOutput(blocks, assignment)
      : applyTemplate(template, blocks, assignment);

  const handleCopy = async () => {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = output;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-5 animate-fade-up" style={{ animationDelay: "200ms" }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-1 h-5 rounded-full bg-[#c77dff]" />
          <h3 className="font-[family-name:var(--font-display)] text-base font-semibold tracking-wider uppercase text-[#d99eff]">
            Preview
          </h3>
        </div>
        <div className="flex rounded-lg border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] p-0.5">
          <button className={`px-3 py-1 rounded-md text-[11px] font-medium tracking-wide transition-all duration-200 ${mode === "simple" ? "bg-[rgba(199,125,255,0.15)] text-[#c77dff]" : "text-[#8b87a0] hover:text-[#c4c1d0]"}`} onClick={() => setMode("simple")}>簡易</button>
          <button className={`px-3 py-1 rounded-md text-[11px] font-medium tracking-wide transition-all duration-200 ${mode === "advanced" ? "bg-[rgba(199,125,255,0.15)] text-[#c77dff]" : "text-[#8b87a0] hover:text-[#c4c1d0]"}`} onClick={() => setMode("advanced")}>テンプレ</button>
        </div>
      </div>

      {mode === "advanced" && (
        <div className="space-y-2 rounded-xl border border-[rgba(199,125,255,0.15)] bg-[rgba(199,125,255,0.03)] p-3.5">
          <label className="text-[11px] text-[#8b87a0] tracking-wide">テンプレート</label>
          <Input value={template} onChange={(e) => onTemplateChange(e.target.value)} placeholder='{SEQ}' className="text-sm font-mono bg-[rgba(255,255,255,0.04)] border-[rgba(255,255,255,0.1)] text-[#e8e6f0] placeholder:text-[#5a5770]" />
          <p className="text-[10px] text-[#6b6780] font-mono">{"{SEQ}"} {"{A1}"} {"{A2}"} {"{A3}"} {"{B1}"} {"{B2}"} {"{B3}"}</p>
        </div>
      )}

      <div className="relative rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-5 min-h-[5rem] overflow-hidden">
        {blocks.length > 0 && output && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[60%] h-full bg-[radial-gradient(ellipse_at_top,rgba(199,125,255,0.06),transparent_70%)]" />
          </div>
        )}
        {blocks.length === 0 ? (
          <p className="text-sm text-[#5a5770] text-center py-2">ブロックを追加すると結果が表示されます</p>
        ) : (
          <p className="relative text-sm leading-relaxed whitespace-pre-wrap break-all text-[#e8e6f0]">{output}</p>
        )}
      </div>

      {!complete && blocks.length > 0 && (
        <p className="flex items-center gap-1.5 text-[11px] text-amber-400">
          <span className="w-1 h-1 rounded-full bg-amber-400" />
          ブロック列が未完成です
        </p>
      )}

      <button
        onClick={handleCopy}
        disabled={blocks.length === 0}
        className={`w-full h-10 rounded-lg text-sm font-medium tracking-wide transition-all duration-300 border ${copied ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400" : "border-[rgba(199,125,255,0.2)] bg-[rgba(199,125,255,0.05)] text-[#c77dff] hover:border-[rgba(199,125,255,0.4)] hover:bg-[rgba(199,125,255,0.1)] hover:shadow-[0_0_20px_rgba(199,125,255,0.15)]"} disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:shadow-none`}
      >
        {copied ? "Copied!" : "コピー"}
      </button>
    </div>
  );
}
