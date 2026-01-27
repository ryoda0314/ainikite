"use client";

import { useState } from "react";
import type { MemberVideo, MemberVideos, Assignment } from "@/lib/types";
import { ALL_CANDIDATES } from "@/lib/constants";
import { extractYouTubeId } from "@/lib/slots";
import { Input } from "@/components/ui/input";
import { YouTubePlayer } from "@/components/youtube-player";

interface Props {
  memberVideos: MemberVideos;
  assignment: Assignment;
  onSetMemberVideo: (name: string, video: MemberVideo) => void;
  onClearMemberVideo: (name: string) => void;
}

export function MemberVideoSettings({ memberVideos, assignment, onSetMemberVideo, onClearMemberVideo }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [editingMember, setEditingMember] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState("");
  const [startInput, setStartInput] = useState("");
  const [endInput, setEndInput] = useState("");
  const [playingMember, setPlayingMember] = useState<string | null>(null);
  const [showExport, setShowExport] = useState(false);
  const [exportCopied, setExportCopied] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importInput, setImportInput] = useState("");
  const [importStatus, setImportStatus] = useState<{ ok: boolean; msg: string } | null>(null);

  const assignedMembers = new Set(Object.values(assignment));

  // Derive a live preview video ID from the URL input
  const previewId = extractYouTubeId(urlInput) || (urlInput.trim().length === 11 ? urlInput.trim() : null);
  const previewStart = Math.max(0, parseFloat(startInput) || 0);
  const previewEnd = Math.max(0, parseFloat(endInput) || 0);

  const handleStartEdit = (name: string) => {
    const existing = memberVideos[name];
    setEditingMember(name);
    setPlayingMember(null);
    setUrlInput(existing?.videoId || "");
    setStartInput(existing?.startSec ? String(existing.startSec) : "");
    setEndInput(existing?.endSec ? String(existing.endSec) : "");
  };

  const handleApply = (name: string) => {
    const id = extractYouTubeId(urlInput) || urlInput.trim();
    const start = Math.max(0, parseFloat(startInput) || 0);
    const end = Math.max(0, parseFloat(endInput) || 0);
    if (id) {
      onSetMemberVideo(name, { videoId: id, startSec: start, endSec: end });
    }
    setEditingMember(null);
    setUrlInput("");
    setStartInput("");
    setEndInput("");
  };

  const handleClear = (name: string) => {
    onClearMemberVideo(name);
    if (editingMember === name) {
      setEditingMember(null);
      setUrlInput("");
      setStartInput("");
      setEndInput("");
    }
  };

  const configuredCount = Object.keys(memberVideos).filter((k) => memberVideos[k]?.videoId).length;

  // Build export data
  const exportData = Object.fromEntries(
    Object.entries(memberVideos)
      .filter(([, v]) => v.videoId)
      .map(([name, v]) => [name, { videoId: v.videoId, startSec: v.startSec, endSec: v.endSec }])
  );
  const exportJson = JSON.stringify(exportData, null, 2);

  const handleCopyExport = async () => {
    await navigator.clipboard.writeText(exportJson);
    setExportCopied(true);
    setTimeout(() => setExportCopied(false), 2000);
  };

  const handleImport = () => {
    setImportStatus(null);
    try {
      const parsed = JSON.parse(importInput.trim());
      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
        setImportStatus({ ok: false, msg: "オブジェクト形式のJSONを入力してください" });
        return;
      }
      let count = 0;
      for (const [name, val] of Object.entries(parsed)) {
        const v = val as Record<string, unknown>;
        if (typeof v?.videoId !== "string" || !v.videoId) continue;
        onSetMemberVideo(name, {
          videoId: v.videoId,
          startSec: Math.max(0, Number(v.startSec) || 0),
          endSec: Math.max(0, Number(v.endSec) || 0),
        });
        count++;
      }
      if (count === 0) {
        setImportStatus({ ok: false, msg: "有効なエントリが見つかりません" });
      } else {
        setImportStatus({ ok: true, msg: `${count}件インポートしました` });
        setImportInput("");
      }
    } catch {
      setImportStatus({ ok: false, msg: "JSONの解析に失敗しました" });
    }
  };

  return (
    <div className="space-y-3 animate-fade-up" style={{ animationDelay: "350ms" }}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between group"
      >
        <div className="flex items-center gap-3">
          <div className="w-1 h-5 rounded-full bg-[#00d4ff]" />
          <h3 className="font-[family-name:var(--font-display)] text-base font-semibold tracking-wider uppercase text-[#40dfff]">
            Member Videos
          </h3>
          {configuredCount > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[rgba(0,212,255,0.1)] border border-[rgba(0,212,255,0.2)] text-[#40dfff] font-mono">
              {configuredCount}
            </span>
          )}
        </div>
        <svg
          className={`w-4 h-4 text-[#8b87a0] transition-transform duration-200 group-hover:text-[#40dfff] ${expanded ? "rotate-180" : ""}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="space-y-3">
          <div className="space-y-1.5 max-h-[520px] overflow-y-auto pr-1 custom-scrollbar">
            {ALL_CANDIDATES.map((name) => {
              const isAssigned = assignedMembers.has(name);
              const hasVideo = !!memberVideos[name]?.videoId;
              const isEditing = editingMember === name;
              const mv = memberVideos[name];

              return (
                <div
                  key={name}
                  className={`rounded-lg border p-2.5 transition-all duration-200 ${
                    isEditing
                      ? "border-[rgba(0,212,255,0.3)] bg-[rgba(0,212,255,0.06)]"
                      : hasVideo
                      ? "border-[rgba(0,212,255,0.15)] bg-[rgba(0,212,255,0.03)]"
                      : "border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      {isAssigned && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#00d4ff] flex-shrink-0" />
                      )}
                      <span className={`text-xs font-medium truncate ${isAssigned ? "text-[#e8e6f0]" : "text-[#8b87a0]"}`}>
                        {name}
                      </span>
                      {hasVideo && !isEditing && (
                        <span className="text-[9px] text-[#40dfff] opacity-60 font-mono flex-shrink-0">
                          {mv.startSec}s–{mv.endSec > 0 ? `${mv.endSec}s` : "end"}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      {hasVideo && !isEditing && (
                        <button
                          onClick={() => setPlayingMember(playingMember === name ? null : name)}
                          className={`text-[10px] px-1.5 py-0.5 rounded transition-colors ${
                            playingMember === name
                              ? "text-[#40dfff]"
                              : "text-[#8b87a0] hover:text-[#40dfff]"
                          }`}
                          title="再生"
                        >
                          {playingMember === name ? "■" : "▶"}
                        </button>
                      )}
                      {hasVideo && (
                        <button
                          onClick={() => handleClear(name)}
                          className="text-[10px] px-1.5 py-0.5 rounded text-[#8b87a0] hover:text-[#ff3b7f] transition-colors"
                        >
                          削除
                        </button>
                      )}
                      {!isEditing && (
                        <button
                          onClick={() => handleStartEdit(name)}
                          className="text-[10px] px-1.5 py-0.5 rounded text-[#8b87a0] hover:text-[#40dfff] transition-colors"
                        >
                          {hasVideo ? "編集" : "設定"}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Playback player (non-edit mode) */}
                  {playingMember === name && !isEditing && hasVideo && (
                    <div className="mt-2 rounded-lg overflow-hidden border border-[rgba(0,212,255,0.15)]">
                      <div className="aspect-video bg-black">
                        <YouTubePlayer
                          videoId={mv.videoId}
                          startSec={mv.startSec}
                          endSec={mv.endSec}
                          autoPlay
                        />
                      </div>
                    </div>
                  )}

                  {isEditing && (
                    <div className="mt-2.5 space-y-2.5">
                      {/* Video URL input */}
                      <Input
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        placeholder="動画URL / ID"
                        className="h-7 text-xs bg-[rgba(255,255,255,0.04)] border-[rgba(255,255,255,0.1)] text-[#e8e6f0] placeholder:text-[#5a5770]"
                      />

                      {/* Inline preview player */}
                      {previewId ? (
                        <div className="rounded-lg overflow-hidden border border-[rgba(0,212,255,0.15)]">
                          <div className="aspect-video bg-black">
                            <YouTubePlayer
                              videoId={previewId}
                              startSec={previewStart}
                              endSec={previewEnd}
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="aspect-video rounded-lg border border-dashed border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.01)] flex items-center justify-center">
                          <span className="text-[10px] text-[#5a5770]">URLを入力するとプレビュー表示</span>
                        </div>
                      )}

                      {/* Start / End seconds */}
                      <div className="flex gap-1.5 items-end">
                        <div className="space-y-0.5 flex-1">
                          <label className="text-[10px] text-[#8b87a0]">開始秒</label>
                          <Input
                            type="number"
                            value={startInput}
                            onChange={(e) => setStartInput(e.target.value)}
                            placeholder="0"
                            min={0}
                            step={0.01}
                            className="h-7 text-xs bg-[rgba(255,255,255,0.04)] border-[rgba(255,255,255,0.1)] text-[#e8e6f0] placeholder:text-[#5a5770]"
                          />
                        </div>
                        <div className="space-y-0.5 flex-1">
                          <label className="text-[10px] text-[#8b87a0]">終了秒</label>
                          <Input
                            type="number"
                            value={endInput}
                            onChange={(e) => setEndInput(e.target.value)}
                            placeholder="0"
                            min={0}
                            step={0.01}
                            className="h-7 text-xs bg-[rgba(255,255,255,0.04)] border-[rgba(255,255,255,0.1)] text-[#e8e6f0] placeholder:text-[#5a5770]"
                          />
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => handleApply(name)}
                          className="h-7 px-3 rounded text-[10px] font-semibold tracking-wider uppercase border border-[rgba(0,212,255,0.25)] bg-[rgba(0,212,255,0.06)] text-[#40dfff] transition-all duration-200 hover:border-[rgba(0,212,255,0.5)] hover:bg-[rgba(0,212,255,0.12)]"
                        >
                          反映
                        </button>
                        <button
                          onClick={() => { setEditingMember(null); setUrlInput(""); setStartInput(""); setEndInput(""); }}
                          className="h-7 px-2 rounded text-[10px] text-[#8b87a0] hover:text-[#c4c1d0] transition-colors"
                        >
                          閉じる
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Export / Import section */}
          <div className="border-t border-[rgba(255,255,255,0.06)] pt-3 space-y-2">
            {/* Export */}
            {configuredCount > 0 && (
              <div className="space-y-2">
                <button
                  onClick={() => { setShowExport(!showExport); setShowImport(false); }}
                  className="flex items-center gap-2 text-[11px] text-[#8b87a0] hover:text-[#40dfff] transition-colors"
                >
                  <svg
                    className={`w-3 h-3 transition-transform duration-200 ${showExport ? "rotate-90" : ""}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  設定値を出力
                </button>
                {showExport && (
                  <div className="space-y-1.5">
                    <pre className="text-[10px] font-mono text-[#c4c1d0] bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] rounded-lg p-3 overflow-x-auto max-h-[200px] overflow-y-auto whitespace-pre-wrap break-all">
                      {exportJson}
                    </pre>
                    <button
                      onClick={handleCopyExport}
                      className={`h-6 px-3 rounded text-[10px] font-medium tracking-wide transition-all duration-200 border ${
                        exportCopied
                          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                          : "border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] text-[#8b87a0] hover:text-[#40dfff] hover:border-[rgba(0,212,255,0.3)]"
                      }`}
                    >
                      {exportCopied ? "Copied!" : "コピー"}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Import */}
            <div className="space-y-2">
              <button
                onClick={() => { setShowImport(!showImport); setShowExport(false); setImportStatus(null); }}
                className="flex items-center gap-2 text-[11px] text-[#8b87a0] hover:text-[#40dfff] transition-colors"
              >
                <svg
                  className={`w-3 h-3 transition-transform duration-200 ${showImport ? "rotate-90" : ""}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                設定値を読み込み
              </button>
              {showImport && (
                <div className="space-y-1.5">
                  <textarea
                    value={importInput}
                    onChange={(e) => { setImportInput(e.target.value); setImportStatus(null); }}
                    placeholder='{"メンバー名": {"videoId": "...", "startSec": 0, "endSec": 0}, ...}'
                    rows={5}
                    className="w-full text-[10px] font-mono text-[#c4c1d0] bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] rounded-lg p-3 resize-y placeholder:text-[#5a5770] focus:outline-none focus:border-[rgba(0,212,255,0.3)]"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleImport}
                      disabled={!importInput.trim()}
                      className="h-6 px-3 rounded text-[10px] font-medium tracking-wide transition-all duration-200 border border-[rgba(0,212,255,0.25)] bg-[rgba(0,212,255,0.06)] text-[#40dfff] hover:border-[rgba(0,212,255,0.5)] hover:bg-[rgba(0,212,255,0.12)] disabled:opacity-30 disabled:pointer-events-none"
                    >
                      反映
                    </button>
                    {importStatus && (
                      <span className={`text-[10px] ${importStatus.ok ? "text-emerald-400" : "text-red-400"}`}>
                        {importStatus.msg}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
