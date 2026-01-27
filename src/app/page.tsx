"use client";

import Link from "next/link";
import { useEditor } from "@/lib/use-editor";
import { BlockSequenceEditor } from "@/components/editor/block-sequence-editor";
import { SlotAssignment } from "@/components/editor/slot-assignment";
import { SequencePlayer } from "@/components/editor/sequence-player";

function EditorContent() {
  const editor = useEditor();

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="glass-panel rounded-2xl p-6">
        <BlockSequenceEditor
          blocks={editor.state.blocks}
          onAdd={editor.addBlock}
          onRemove={editor.removeBlock}
          onMove={editor.moveBlock}
          onClear={editor.clearBlocks}
        />
      </div>
      <div className="glass-panel rounded-2xl p-6">
        <SlotAssignment
          blocks={editor.state.blocks}
          assignment={editor.state.assignment}
          onAssign={editor.setAssignment}
          onClear={editor.clearAssignment}
          onReset={editor.resetAssignment}
          onApplyRandom={editor.applyRandom}
        />
      </div>
      <div className="glass-panel rounded-2xl p-5">
        <SequencePlayer
          blocks={editor.state.blocks}
          assignment={editor.state.assignment}
          memberVideos={editor.state.memberVideos}
        />
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Header with stage spotlight effect */}
      <header className="relative border-b border-[rgba(255,255,255,0.06)] stage-spotlight">
        <div className="absolute inset-0 bg-gradient-to-r from-[rgba(255,43,78,0.06)] via-[rgba(64,208,240,0.03)] to-[rgba(168,85,247,0.06)]" />
        <div className="relative mx-auto max-w-7xl px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Animated accent bar */}
              <div className="w-1.5 h-10 rounded-full animate-glow-pulse" style={{ background: 'linear-gradient(to bottom, #ff2b4e, #ff8a30, #ffd230, #34d399, #40d0f0, #3b82f6, #a855f7, #e0dff0)' }} />
              <div>
                <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-wider text-[#e8e6f0]">
                  MY<span style={{ background: 'linear-gradient(to right, #ff2b4e, #ffd230, #40d0f0, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>LiFE</span>!
                </h1>
                <p className="text-xs text-[#8b87a0] tracking-wide mt-0.5">
                  自己紹介パートを並べ替えて、自分だけのオリジナルを作ろう
                </p>
              </div>
            </div>
            <Link
              href="/settings"
              className="text-xs text-[#8b87a0] hover:text-[#40dfff] transition-colors tracking-wide uppercase px-3 py-1.5 rounded-lg border border-[rgba(255,255,255,0.08)] hover:border-[rgba(0,212,255,0.3)]"
            >
              設定
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        <EditorContent />
      </main>

      {/* Footer */}
      <footer className="mt-16 relative">
        <div className="h-px" style={{ background: 'linear-gradient(to right, #ff2b4e, #ff8a30, #ffd230, #34d399, #40d0f0, #3b82f6, #a855f7, #e0dff0)', opacity: 0.3 }} />
        <div className="mx-auto max-w-7xl px-6 py-5">
          <p className="text-[11px] text-[#5a5770]">
            本サイトは元楽曲の歌詞を表示・保存・配布しません。YouTube動画はiframe埋め込みによる再生のみです。
          </p>
        </div>
      </footer>
    </div>
  );
}
