"use client";

import { useState } from "react";
import type { ProjectData } from "@/lib/types";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { SaveRequestSchema } from "@/lib/schema";
import { Input } from "@/components/ui/input";
import { nanoid } from "nanoid";
import { DEFAULT_MEMBER_VIDEOS } from "@/lib/constants";

interface Props {
  getProjectData: () => ProjectData;
  onLoad: (data: ProjectData) => void;
}

export function SaveShare({ getProjectData, onLoad }: Props) {
  const [saving, setSaving] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [loadId, setLoadId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [urlCopied, setUrlCopied] = useState(false);

  const configured = isSupabaseConfigured();

  const handleSave = async () => {
    if (!configured) {
      setError("Supabaseが未設定です。環境変数を確認してください。");
      return;
    }
    const data = getProjectData();
    const parsed = SaveRequestSchema.safeParse(data);
    if (!parsed.success) {
      setError("データが不正です: " + parsed.error.message);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const id = nanoid(10);
      const { error: dbError } = await supabase.from("projects").insert({
        id,
        blocks: parsed.data.blocks,
        assignment: parsed.data.assignment,
        template: parsed.data.template,
        youtube_video_id: parsed.data.youtube.videoId,
        youtube_start_sec: parsed.data.youtube.startSec,
        member_videos: parsed.data.memberVideos || {},
      });
      if (dbError) throw dbError;
      const url = `${window.location.origin}/p/${id}`;
      setShareUrl(url);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message
        : (e && typeof e === "object" && "message" in e) ? String((e as Record<string, unknown>).message)
        : "保存に失敗しました";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleLoad = async () => {
    if (!configured) { setError("Supabaseが未設定です。"); return; }
    if (!loadId.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: dbError } = await supabase.from("projects").select("*").eq("id", loadId.trim()).single();
      if (dbError) throw dbError;
      if (!data) throw new Error("見つかりません");
      onLoad({
        blocks: data.blocks,
        assignment: data.assignment,
        template: data.template,
        youtube: { videoId: data.youtube_video_id || "", startSec: data.youtube_start_sec || 0 },
        memberVideos: (data.member_videos && Object.keys(data.member_videos).length > 0) ? data.member_videos : DEFAULT_MEMBER_VIDEOS,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message
        : (e && typeof e === "object" && "message" in e) ? String((e as Record<string, unknown>).message)
        : "読み込みに失敗しました";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyUrl = async () => {
    if (shareUrl) {
      await navigator.clipboard.writeText(shareUrl);
      setUrlCopied(true);
      setTimeout(() => setUrlCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-4 animate-fade-up" style={{ animationDelay: "50ms" }}>
      <div className="flex items-center gap-3">
        <div className="w-1 h-5 rounded-full bg-emerald-400" />
        <h3 className="font-[family-name:var(--font-display)] text-base font-semibold tracking-wider uppercase text-emerald-400">Save / Share</h3>
      </div>

      {!configured && (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
          <p className="text-[11px] text-amber-400/80 leading-relaxed">
            Supabaseが未設定のため保存・共有機能は使用できません。
            <code className="text-[10px] bg-amber-500/10 px-1 py-0.5 rounded mx-0.5">.env.local</code>を設定してください。
          </p>
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={saving || !configured}
        className="w-full h-10 rounded-lg text-sm font-medium tracking-wide transition-all duration-300 border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 hover:border-emerald-500/40 hover:bg-emerald-500/10 hover:shadow-[0_0_20px_rgba(52,211,153,0.12)] disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:shadow-none"
      >
        {saving ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-3 h-3 border border-emerald-400/50 border-t-emerald-400 rounded-full animate-spin" />
            保存中...
          </span>
        ) : "保存して共有URLを発行"}
      </button>

      {shareUrl && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3.5 space-y-2">
          <p className="text-[11px] text-emerald-400 font-medium tracking-wide">共有URL</p>
          <div className="flex gap-1.5">
            <Input value={shareUrl} readOnly className="h-8 text-xs bg-[rgba(255,255,255,0.04)] border-[rgba(255,255,255,0.1)] text-[#e8e6f0] font-mono" />
            <button onClick={handleCopyUrl} className={`h-8 px-3 rounded-lg text-[11px] font-medium tracking-wide transition-all duration-200 border flex-shrink-0 ${urlCopied ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-400" : "border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] text-[#c4c1d0] hover:text-emerald-400 hover:border-emerald-500/30"}`}>
              {urlCopied ? "OK" : "コピー"}
            </button>
          </div>
        </div>
      )}

      <div className="border-t border-[rgba(255,255,255,0.06)] pt-3.5 space-y-2">
        <p className="text-[11px] text-[#8b87a0] tracking-wide">IDで読み込み</p>
        <div className="flex gap-1.5">
          <Input value={loadId} onChange={(e) => setLoadId(e.target.value)} placeholder="プロジェクトID" className="h-8 text-xs bg-[rgba(255,255,255,0.04)] border-[rgba(255,255,255,0.1)] text-[#e8e6f0] placeholder:text-[#5a5770] font-mono" />
          <button onClick={handleLoad} disabled={loading || !configured} className="h-8 px-3 rounded-lg text-[11px] font-medium tracking-wide transition-all duration-200 border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] text-[#c4c1d0] hover:border-[rgba(124,92,255,0.3)] hover:text-[#9d85ff] disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0">
            読込
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-2.5">
          <p className="text-[11px] text-red-400">{error}</p>
        </div>
      )}
    </div>
  );
}
