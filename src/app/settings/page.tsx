"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { Slot, MemberVideo } from "@/lib/types";
import { SLOT_CANDIDATES as DEFAULT_SLOT_CANDIDATES, DEFAULT_MEMBER_VIDEOS } from "@/lib/constants";
import {
  loadSlotCandidates,
  saveSlotCandidates,
  loadMemberVideos,
  saveMemberVideos,
  allCandidatesFromSlots,
  type SlotCandidates,
} from "@/lib/settings-store";
import type { MemberVideos } from "@/lib/types";
import { extractYouTubeId } from "@/lib/slots";
import { Input } from "@/components/ui/input";

const SLOTS: Slot[] = ["A1", "A2", "A3", "B1", "B2", "B3"];

const SLOT_THEME: Record<Slot, { color: string; bg: string; border: string }> = {
  A1: { color: "#ff3b7f", bg: "rgba(255,59,127,0.08)", border: "rgba(255,59,127,0.25)" },
  A2: { color: "#ff6b4a", bg: "rgba(255,107,74,0.08)", border: "rgba(255,107,74,0.25)" },
  A3: { color: "#ffb830", bg: "rgba(255,184,48,0.08)", border: "rgba(255,184,48,0.25)" },
  B1: { color: "#00d4ff", bg: "rgba(0,212,255,0.08)", border: "rgba(0,212,255,0.25)" },
  B2: { color: "#7c5cff", bg: "rgba(124,92,255,0.08)", border: "rgba(124,92,255,0.25)" },
  B3: { color: "#c77dff", bg: "rgba(199,125,255,0.08)", border: "rgba(199,125,255,0.25)" },
};

export default function SettingsPage() {
  const [candidates, setCandidates] = useState<SlotCandidates | null>(null);
  const [videos, setVideos] = useState<MemberVideos | null>(null);
  const [newName, setNewName] = useState<Record<Slot, string>>({ A1: "", A2: "", A3: "", B1: "", B2: "", B3: "" });

  // Video editing state
  const [editingMember, setEditingMember] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState("");
  const [startInput, setStartInput] = useState("");
  const [endInput, setEndInput] = useState("");

  // Load from localStorage on mount
  useEffect(() => {
    setCandidates(loadSlotCandidates());
    setVideos(loadMemberVideos());
  }, []);

  if (!candidates || !videos) return null;

  const allMembers = allCandidatesFromSlots(candidates);

  // ── Slot Candidates ──

  const handleAddMember = (slot: Slot) => {
    const name = newName[slot].trim();
    if (!name) return;
    if (candidates[slot].includes(name)) return;
    const updated = { ...candidates, [slot]: [...candidates[slot], name] };
    setCandidates(updated);
    saveSlotCandidates(updated);
    setNewName((s) => ({ ...s, [slot]: "" }));
  };

  const handleRemoveMember = (slot: Slot, name: string) => {
    const updated = { ...candidates, [slot]: candidates[slot].filter((n) => n !== name) };
    setCandidates(updated);
    saveSlotCandidates(updated);
  };

  const handleResetSlots = () => {
    const reset = structuredClone(DEFAULT_SLOT_CANDIDATES);
    setCandidates(reset);
    saveSlotCandidates(reset);
  };

  // ── Member Videos ──

  const handleStartEdit = (name: string) => {
    const existing = videos[name];
    setEditingMember(name);
    setUrlInput(existing?.videoId || "");
    setStartInput(existing?.startSec ? String(existing.startSec) : "");
    setEndInput(existing?.endSec ? String(existing.endSec) : "");
  };

  const handleApplyVideo = (name: string) => {
    const id = extractYouTubeId(urlInput) || urlInput.trim();
    const start = Math.max(0, parseFloat(startInput) || 0);
    const end = Math.max(0, parseFloat(endInput) || 0);
    if (id) {
      const updated = { ...videos, [name]: { videoId: id, startSec: start, endSec: end } };
      setVideos(updated);
      saveMemberVideos(updated);
    }
    setEditingMember(null);
    setUrlInput("");
    setStartInput("");
    setEndInput("");
  };

  const handleClearVideo = (name: string) => {
    const updated = { ...videos };
    delete updated[name];
    setVideos(updated);
    saveMemberVideos(updated);
    if (editingMember === name) {
      setEditingMember(null);
      setUrlInput("");
      setStartInput("");
      setEndInput("");
    }
  };

  const handleResetVideos = () => {
    const reset = { ...DEFAULT_MEMBER_VIDEOS };
    setVideos(reset);
    saveMemberVideos(reset);
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="relative border-b border-[rgba(255,255,255,0.06)] stage-spotlight">
        <div className="absolute inset-0 bg-gradient-to-r from-[rgba(255,43,78,0.06)] via-[rgba(64,208,240,0.03)] to-[rgba(168,85,247,0.06)]" />
        <div className="relative mx-auto max-w-4xl px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-10 rounded-full animate-glow-pulse" style={{ background: 'linear-gradient(to bottom, #ff2b4e, #ff8a30, #ffd230, #34d399, #40d0f0, #3b82f6, #a855f7, #e0dff0)' }} />
              <div>
                <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-wider uppercase text-[#e8e6f0]">
                  Settings
                </h1>
                <p className="text-xs text-[#8b87a0] tracking-wide mt-0.5">
                  メンバー・動画設定
                </p>
              </div>
            </div>
            <Link
              href="/"
              className="text-xs text-[#8b87a0] hover:text-[#ff3b7f] transition-colors tracking-wide uppercase px-3 py-1.5 rounded-lg border border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,59,127,0.3)]"
            >
              エディターへ戻る
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8 space-y-8">
        {/* ── Section 1: Slot Members ── */}
        <section className="glass-panel rounded-2xl p-6 space-y-5 animate-fade-up">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-1 h-5 rounded-full bg-[#ff8a30]" />
              <h2 className="font-[family-name:var(--font-display)] text-base font-semibold tracking-wider uppercase text-[#ffaa60]">
                Slot Members
              </h2>
            </div>
            <button
              onClick={handleResetSlots}
              className="text-[11px] text-[#8b87a0] hover:text-[#ff3b7f] transition-colors tracking-wide uppercase px-2 py-1 rounded hover:bg-[rgba(255,59,127,0.06)]"
            >
              デフォルトに戻す
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {SLOTS.map((slot) => {
              const theme = SLOT_THEME[slot];
              return (
                <div
                  key={slot}
                  className="rounded-xl border p-4 space-y-3"
                  style={{ backgroundColor: theme.bg, borderColor: theme.border }}
                >
                  <h3
                    className="font-[family-name:var(--font-display)] text-sm font-bold tracking-widest uppercase"
                    style={{ color: theme.color }}
                  >
                    {slot}
                  </h3>

                  {/* Current members */}
                  <div className="space-y-1.5">
                    {candidates[slot].map((name) => (
                      <div
                        key={name}
                        className="flex items-center justify-between rounded-lg px-2.5 py-1.5 bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.06)]"
                      >
                        <span className="text-xs text-[#e8e6f0]">{name}</span>
                        <button
                          onClick={() => handleRemoveMember(slot, name)}
                          className="text-[10px] text-[#8b87a0] hover:text-[#ff3b7f] transition-colors px-1"
                          title="削除"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                    {candidates[slot].length === 0 && (
                      <p className="text-[11px] text-[#5a5770]">メンバーなし</p>
                    )}
                  </div>

                  {/* Add new member */}
                  <div className="flex gap-1.5">
                    <Input
                      value={newName[slot]}
                      onChange={(e) => setNewName((s) => ({ ...s, [slot]: e.target.value }))}
                      onKeyDown={(e) => { if (e.key === "Enter") handleAddMember(slot); }}
                      placeholder="名前を入力"
                      className="h-7 text-xs flex-1 bg-[rgba(255,255,255,0.04)] border-[rgba(255,255,255,0.1)] text-[#e8e6f0] placeholder:text-[#5a5770]"
                    />
                    <button
                      onClick={() => handleAddMember(slot)}
                      className="h-7 px-2.5 rounded text-[10px] font-semibold tracking-wider uppercase border transition-all duration-200"
                      style={{
                        borderColor: theme.border,
                        backgroundColor: theme.bg,
                        color: theme.color,
                      }}
                    >
                      追加
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Section 2: Member Videos ── */}
        <section className="glass-panel rounded-2xl p-6 space-y-5 animate-fade-up" style={{ animationDelay: "100ms" }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-1 h-5 rounded-full bg-[#40d0f0]" />
              <h2 className="font-[family-name:var(--font-display)] text-base font-semibold tracking-wider uppercase text-[#60d0f0]">
                Member Videos
              </h2>
              {Object.keys(videos).length > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[rgba(64,208,240,0.1)] border border-[rgba(64,208,240,0.2)] text-[#60d0f0] font-mono">
                  {Object.keys(videos).filter((k) => videos[k]?.videoId).length}
                </span>
              )}
            </div>
            <button
              onClick={handleResetVideos}
              className="text-[11px] text-[#8b87a0] hover:text-[#ff3b7f] transition-colors tracking-wide uppercase px-2 py-1 rounded hover:bg-[rgba(255,59,127,0.06)]"
            >
              デフォルトに戻す
            </button>
          </div>

          <div className="space-y-2">
            {allMembers.map((name) => {
              const hasVideo = !!videos[name]?.videoId;
              const isEditing = editingMember === name;
              const mv = videos[name];

              // Find which slot this member belongs to
              const memberSlot = SLOTS.find((s) => candidates[s].includes(name));
              const slotColor = memberSlot ? SLOT_THEME[memberSlot].color : "#8b87a0";

              return (
                <div
                  key={name}
                  className={`rounded-lg border p-3 transition-all duration-200 ${
                    isEditing
                      ? "border-[rgba(0,212,255,0.3)] bg-[rgba(0,212,255,0.06)]"
                      : hasVideo
                      ? "border-[rgba(0,212,255,0.15)] bg-[rgba(0,212,255,0.03)]"
                      : "border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="font-[family-name:var(--font-display)] text-[10px] font-bold tracking-widest uppercase flex-shrink-0"
                        style={{ color: slotColor }}
                      >
                        {memberSlot || "?"}
                      </span>
                      <span className="text-sm font-medium text-[#e8e6f0] truncate">{name}</span>
                      {hasVideo && !isEditing && (
                        <span className="text-[10px] text-[#40dfff] opacity-60 font-mono flex-shrink-0">
                          {mv.videoId.slice(0, 6)}... {mv.startSec}s–{mv.endSec > 0 ? `${mv.endSec}s` : "end"}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-1.5 flex-shrink-0">
                      {hasVideo && (
                        <button
                          onClick={() => handleClearVideo(name)}
                          className="text-[10px] px-2 py-0.5 rounded text-[#8b87a0] hover:text-[#ff3b7f] transition-colors"
                        >
                          削除
                        </button>
                      )}
                      {!isEditing && (
                        <button
                          onClick={() => handleStartEdit(name)}
                          className="text-[10px] px-2 py-0.5 rounded text-[#8b87a0] hover:text-[#40dfff] transition-colors"
                        >
                          {hasVideo ? "編集" : "設定"}
                        </button>
                      )}
                    </div>
                  </div>

                  {isEditing && (
                    <div className="mt-3 space-y-2.5">
                      <Input
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        placeholder="動画URL / ID"
                        className="h-8 text-xs bg-[rgba(255,255,255,0.04)] border-[rgba(255,255,255,0.1)] text-[#e8e6f0] placeholder:text-[#5a5770]"
                      />
                      <div className="flex gap-2 items-end">
                        <div className="space-y-0.5 flex-1">
                          <label className="text-[10px] text-[#8b87a0]">開始秒</label>
                          <Input
                            type="number"
                            value={startInput}
                            onChange={(e) => setStartInput(e.target.value)}
                            placeholder="0"
                            min={0}
                            step={0.01}
                            className="h-8 text-xs bg-[rgba(255,255,255,0.04)] border-[rgba(255,255,255,0.1)] text-[#e8e6f0] placeholder:text-[#5a5770]"
                          />
                        </div>
                        <div className="space-y-0.5 flex-1">
                          <label className="text-[10px] text-[#8b87a0]">終了秒</label>
                          <Input
                            type="number"
                            value={endInput}
                            onChange={(e) => setEndInput(e.target.value)}
                            placeholder="0 (最後まで)"
                            min={0}
                            step={0.01}
                            className="h-8 text-xs bg-[rgba(255,255,255,0.04)] border-[rgba(255,255,255,0.1)] text-[#e8e6f0] placeholder:text-[#5a5770]"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApplyVideo(name)}
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
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-16 relative">
        <div className="h-px" style={{ background: 'linear-gradient(to right, #ff2b4e, #ff8a30, #ffd230, #34d399, #40d0f0, #3b82f6, #a855f7, #e0dff0)', opacity: 0.3 }} />
        <div className="mx-auto max-w-4xl px-6 py-5">
          <p className="text-[11px] text-[#5a5770]">
            設定はブラウザのローカルストレージに保存されます。
          </p>
        </div>
      </footer>
    </div>
  );
}
