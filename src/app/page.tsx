"use client";

import { useEditor } from "@/lib/use-editor";
import { BlockSequenceEditor } from "@/components/editor/block-sequence-editor";
import { SlotAssignment } from "@/components/editor/slot-assignment";
import { PresetSelector } from "@/components/editor/preset-selector";
import { SequencePlayer } from "@/components/editor/sequence-player";

function EditorContent() {
  const editor = useEditor();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-8">
      {/* Left column — Sidebar */}
      <aside className="space-y-8 order-2 lg:order-1">
        <div className="glass-panel rounded-2xl p-5 space-y-6">
          <PresetSelector onLoad={editor.loadPreset} />
        </div>
      </aside>

      {/* Main editor */}
      <div className="space-y-8 order-1 lg:order-2">
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
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Header with stage spotlight effect */}
      <header className="relative border-b border-[rgba(255,255,255,0.06)] stage-spotlight">
        <div className="absolute inset-0 bg-gradient-to-r from-[rgba(255,59,127,0.05)] via-transparent to-[rgba(124,92,255,0.05)]" />
        <div className="relative mx-auto max-w-7xl px-6 py-6">
          <div className="flex items-center gap-3">
            {/* Animated accent bar */}
            <div className="w-1 h-10 rounded-full bg-gradient-to-b from-[#ff3b7f] to-[#7c5cff] animate-glow-pulse" />
            <div>
              <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-wider uppercase text-[#e8e6f0]">
                A-Frame <span className="text-[#ff3b7f]">Shout</span> Builder
              </h1>
              <p className="text-xs text-[#8b87a0] tracking-wide mt-0.5">
                枠に名前を割り当てて、オリジナルテキストを生成・共有
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        <EditorContent />
      </main>

      {/* Footer */}
      <footer className="border-t border-[rgba(255,255,255,0.04)] mt-16">
        <div className="mx-auto max-w-7xl px-6 py-5">
          <p className="text-[11px] text-[#5a5770]">
            本サイトは元楽曲の歌詞を表示・保存・配布しません。YouTube動画はiframe埋め込みによる再生のみです。
          </p>
        </div>
      </footer>
    </div>
  );
}
