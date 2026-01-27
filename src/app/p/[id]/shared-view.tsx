"use client";

import { useEffect, useState } from "react";
import type { ProjectData } from "@/lib/types";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { expandBlocksWithKeys, generateSimpleOutput, applyTemplate, isSequenceComplete } from "@/lib/slots";
import { BLOCK_COLORS, BLOCK_GLOW, SLOT_COLORS } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { isTerminalBlock } from "@/lib/constants";
import Link from "next/link";
import { SequencePlayer } from "@/components/editor/sequence-player";
import { DEFAULT_MEMBER_VIDEOS } from "@/lib/constants";

const BLOCK_LABELS: Record<string, string> = {
  A123: "A1 A2 A3",
  A23: "A2 A3",
  B123: "B1 B2 B3",
  B23: "B2 B3",
};

interface Props {
  id: string;
}

export function SharedProjectView({ id }: Props) {
  const [data, setData] = useState<ProjectData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function load() {
      if (!isSupabaseConfigured()) {
        setError("Supabaseが未設定です。");
        setLoading(false);
        return;
      }
      try {
        const { data: row, error: dbError } = await supabase
          .from("projects").select("*").eq("id", id).single();
        if (dbError) throw dbError;
        if (!row) throw new Error("プロジェクトが見つかりません");
        setData({
          blocks: row.blocks,
          assignment: row.assignment,
          template: row.template,
          youtube: { videoId: row.youtube_video_id || "", startSec: row.youtube_start_sec || 0 },
          memberVideos: (row.member_videos && Object.keys(row.member_videos).length > 0) ? row.member_videos : DEFAULT_MEMBER_VIDEOS,
        });
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "読み込みに失敗しました");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3">
        <div className="w-6 h-6 border-2 border-[#ff3b7f]/30 border-t-[#ff3b7f] rounded-full animate-spin" />
        <p className="text-[#8b87a0] text-sm">読み込み中...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-red-400">{error || "データが見つかりません"}</p>
        <Link href="/" className="text-sm text-[#9d85ff] hover:text-[#c77dff] transition-colors underline underline-offset-4">
          トップへ戻る
        </Link>
      </div>
    );
  }

  const complete = isSequenceComplete(data.blocks);
  const expanded = expandBlocksWithKeys(data.blocks);
  const output =
    data.template === "{SEQ}" || !data.template
      ? generateSimpleOutput(data.blocks, data.assignment)
      : applyTemplate(data.template, data.blocks, data.assignment);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const editUrl = `/?load=${id}`;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="relative border-b border-[rgba(255,255,255,0.06)] stage-spotlight">
        <div className="absolute inset-0 bg-gradient-to-r from-[rgba(255,43,78,0.06)] via-[rgba(64,208,240,0.03)] to-[rgba(168,85,247,0.06)]" />
        <div className="relative mx-auto max-w-3xl px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-8 rounded-full" style={{ background: 'linear-gradient(to bottom, #ff2b4e, #ff8a30, #ffd230, #34d399, #40d0f0, #3b82f6, #a855f7, #e0dff0)' }} />
            <div>
              <h1 className="font-[family-name:var(--font-display)] text-lg font-bold tracking-wider text-[#e8e6f0]">
                MY<span style={{ background: 'linear-gradient(to right, #ff2b4e, #ffd230, #40d0f0, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>LiFE</span>!
              </h1>
              <p className="text-[11px] text-[#8b87a0] tracking-wide">共有ビュー</p>
            </div>
          </div>
          <Link
            href={editUrl}
            className="px-4 py-2 rounded-lg text-xs font-medium tracking-wide border border-[rgba(124,92,255,0.25)] bg-[rgba(124,92,255,0.06)] text-[#9d85ff] transition-all duration-300 hover:border-[rgba(124,92,255,0.5)] hover:bg-[rgba(124,92,255,0.12)] hover:shadow-[0_0_20px_rgba(124,92,255,0.15)]"
          >
            複製して編集
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10 space-y-10">
        {/* Block sequence */}
        <section className="glass-panel rounded-2xl p-6 space-y-4 animate-fade-up">
          <div className="flex items-center gap-3">
            <div className="w-1 h-5 rounded-full bg-[#ff3b7f]" />
            <h2 className="font-[family-name:var(--font-display)] text-sm font-semibold tracking-wider uppercase text-[#ff6b9d]">Block Sequence</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {data.blocks.map((block, i) => (
              <div key={i} className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium tracking-wide ${BLOCK_COLORS[block]} ${BLOCK_GLOW[block]}`}>
                <span className="font-[family-name:var(--font-display)] font-semibold">{BLOCK_LABELS[block]}</span>
                {isTerminalBlock(block) && (
                  <span className="text-[9px] font-bold tracking-widest opacity-60 uppercase bg-[rgba(255,255,255,0.06)] px-1.5 py-0.5 rounded">end</span>
                )}
              </div>
            ))}
          </div>
          {!complete && (
            <p className="flex items-center gap-1.5 text-[11px] text-amber-400">
              <span className="w-1 h-1 rounded-full bg-amber-400" />
              このブロック列は未完成です
            </p>
          )}
        </section>

        {/* Expanded slots */}
        <section className="glass-panel rounded-2xl p-6 space-y-4 animate-fade-up" style={{ animationDelay: "100ms" }}>
          <div className="flex items-center gap-3">
            <div className="w-1 h-5 rounded-full bg-[#ffb830]" />
            <h2 className="font-[family-name:var(--font-display)] text-sm font-semibold tracking-wider uppercase text-[#ffcc66]">Expanded Slots</h2>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {expanded.map((info) => (
              <Badge key={info.key} variant="outline" className={`text-[11px] font-[family-name:var(--font-display)] font-semibold tracking-wider ${SLOT_COLORS[info.slot]}`}>
                {info.slot}: {data.assignment[info.key] || "[未設定]"}
              </Badge>
            ))}
          </div>
        </section>

        {/* Generated output */}
        <section className="glass-panel rounded-2xl p-6 space-y-4 animate-fade-up" style={{ animationDelay: "200ms" }}>
          <div className="flex items-center gap-3">
            <div className="w-1 h-5 rounded-full bg-[#c77dff]" />
            <h2 className="font-[family-name:var(--font-display)] text-sm font-semibold tracking-wider uppercase text-[#d99eff]">Output</h2>
          </div>
          <div className="relative rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-5 overflow-hidden">
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[60%] h-full bg-[radial-gradient(ellipse_at_top,rgba(199,125,255,0.06),transparent_70%)]" />
            </div>
            <p className="relative text-sm leading-relaxed whitespace-pre-wrap break-all text-[#e8e6f0]">{output}</p>
          </div>
          <button
            onClick={handleCopy}
            className={`px-5 py-2 rounded-lg text-xs font-medium tracking-wide transition-all duration-300 border ${copied ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400" : "border-[rgba(199,125,255,0.2)] bg-[rgba(199,125,255,0.05)] text-[#c77dff] hover:border-[rgba(199,125,255,0.4)] hover:bg-[rgba(199,125,255,0.1)] hover:shadow-[0_0_20px_rgba(199,125,255,0.15)]"}`}
          >
            {copied ? "Copied!" : "コピー"}
          </button>
        </section>

        {/* Sequence Player */}
        <section className="glass-panel rounded-2xl p-6 animate-fade-up" style={{ animationDelay: "300ms" }}>
          <SequencePlayer
            blocks={data.blocks}
            assignment={data.assignment}
            memberVideos={data.memberVideos}
          />
        </section>
      </main>

      <footer className="mt-16 relative">
        <div className="h-px" style={{ background: 'linear-gradient(to right, #ff2b4e, #ff8a30, #ffd230, #34d399, #40d0f0, #3b82f6, #a855f7, #e0dff0)', opacity: 0.3 }} />
        <div className="mx-auto max-w-3xl px-6 py-5">
          <p className="text-[11px] text-[#5a5770]">
            本サイトは元楽曲の歌詞を表示・保存・配布しません。YouTube動画はiframe埋め込みによる再生のみです。
          </p>
        </div>
      </footer>
    </div>
  );
}
