"use client";

import { useState } from "react";
import { extractYouTubeId } from "@/lib/slots";
import { Input } from "@/components/ui/input";

interface Props {
  videoId: string;
  startSec: number;
  onChange: (youtube: { videoId: string; startSec: number }) => void;
}

export function YouTubeEmbed({ videoId, startSec, onChange }: Props) {
  const [urlInput, setUrlInput] = useState(videoId);
  const [secInput, setSecInput] = useState(String(startSec || ""));

  const handleApply = () => {
    const id = extractYouTubeId(urlInput) || urlInput.trim();
    const sec = Math.max(0, parseInt(secInput, 10) || 0);
    onChange({ videoId: id, startSec: sec });
  };

  const embedSrc = videoId
    ? `https://www.youtube.com/embed/${videoId}${startSec ? `?start=${startSec}` : ""}`
    : null;

  return (
    <div className="space-y-4 animate-fade-up" style={{ animationDelay: "300ms" }}>
      <div className="flex items-center gap-3">
        <div className="w-1 h-5 rounded-full bg-[#00d4ff]" />
        <h3 className="font-[family-name:var(--font-display)] text-base font-semibold tracking-wider uppercase text-[#40dfff]">YouTube</h3>
      </div>

      <div className="space-y-2.5 rounded-xl border border-[rgba(0,212,255,0.12)] bg-[rgba(0,212,255,0.03)] p-3.5">
        <div className="space-y-1">
          <label className="text-[11px] text-[#8b87a0] tracking-wide">動画URL / ID</label>
          <Input value={urlInput} onChange={(e) => setUrlInput(e.target.value)} placeholder="https://youtu.be/... または動画ID" className="text-sm bg-[rgba(255,255,255,0.04)] border-[rgba(255,255,255,0.1)] text-[#e8e6f0] placeholder:text-[#5a5770]" />
        </div>
        <div className="flex gap-2 items-end">
          <div className="space-y-1 flex-shrink-0">
            <label className="text-[11px] text-[#8b87a0] tracking-wide">開始秒</label>
            <Input type="number" value={secInput} onChange={(e) => setSecInput(e.target.value)} placeholder="0" min={0} className="text-sm w-20 bg-[rgba(255,255,255,0.04)] border-[rgba(255,255,255,0.1)] text-[#e8e6f0] placeholder:text-[#5a5770]" />
          </div>
          <button onClick={handleApply} className="h-9 px-4 rounded-lg text-xs font-medium tracking-wide border border-[rgba(0,212,255,0.25)] bg-[rgba(0,212,255,0.06)] text-[#40dfff] transition-all duration-300 hover:border-[rgba(0,212,255,0.5)] hover:bg-[rgba(0,212,255,0.12)] hover:shadow-[0_0_15px_rgba(0,212,255,0.15)]">
            反映
          </button>
        </div>
      </div>

      {embedSrc ? (
        <div className="relative rounded-xl overflow-hidden border border-[rgba(0,212,255,0.15)] glow-b1">
          <div className="aspect-video bg-black">
            <iframe src={embedSrc} title="YouTube player" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen className="w-full h-full" />
          </div>
        </div>
      ) : (
        <div className="aspect-video rounded-xl border border-dashed border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.01)] flex flex-col items-center justify-center gap-2">
          <svg className="w-8 h-8 text-[#3a3650]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-xs text-[#5a5770]">動画未設定</span>
        </div>
      )}
    </div>
  );
}
