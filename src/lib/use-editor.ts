"use client";

import { useState, useCallback } from "react";
import type { Block, Assignment, ProjectData, MemberVideo, MemberVideos } from "./types";
import { isSequenceLocked, expandBlocksWithKeys } from "./slots";
import { DEFAULT_TEMPLATE, DEFAULT_MEMBER_VIDEOS, PRESETS, SLOT_CANDIDATES } from "./constants";

export interface EditorState {
  blocks: Block[];
  assignment: Assignment;
  template: string;
  youtube: { videoId: string; startSec: number };
  memberVideos: MemberVideos;
}

const INITIAL_STATE: EditorState = {
  blocks: [],
  assignment: {},
  template: DEFAULT_TEMPLATE,
  youtube: { videoId: "", startSec: 0 },
  memberVideos: DEFAULT_MEMBER_VIDEOS,
};

export function useEditor(initial?: Partial<EditorState>) {
  const [state, setState] = useState<EditorState>({
    ...INITIAL_STATE,
    ...initial,
  });

  const addBlock = useCallback((block: Block) => {
    setState((s) => {
      if (isSequenceLocked(s.blocks)) return s;
      return { ...s, blocks: [...s.blocks, block] };
    });
  }, []);

  const removeBlock = useCallback((index: number) => {
    setState((s) => ({
      ...s,
      blocks: s.blocks.filter((_, i) => i !== index),
    }));
  }, []);

  const moveBlock = useCallback((from: number, to: number) => {
    setState((s) => {
      const newBlocks = [...s.blocks];
      const [moved] = newBlocks.splice(from, 1);
      newBlocks.splice(to, 0, moved);
      return { ...s, blocks: newBlocks };
    });
  }, []);

  /** Set assignment by position key (e.g. "0:1") */
  const setAssignment = useCallback((key: string, name: string) => {
    setState((s) => ({
      ...s,
      assignment: { ...s.assignment, [key]: name },
    }));
  }, []);

  /** Clear a single assignment by position key */
  const clearAssignment = useCallback((key: string) => {
    setState((s) => {
      const newAssignment = { ...s.assignment };
      delete newAssignment[key];
      return { ...s, assignment: newAssignment };
    });
  }, []);

  const resetAssignment = useCallback(() => {
    setState((s) => ({ ...s, assignment: {} }));
  }, []);

  /** Fill all positions with the first recommended candidate for their slot type */
  const applyRecommended = useCallback(() => {
    setState((s) => {
      const expanded = expandBlocksWithKeys(s.blocks);
      const newAssignment: Assignment = { ...s.assignment };
      for (const info of expanded) {
        newAssignment[info.key] = SLOT_CANDIDATES[info.slot][0];
      }
      return { ...s, assignment: newAssignment };
    });
  }, []);

  const setTemplate = useCallback((template: string) => {
    setState((s) => ({ ...s, template }));
  }, []);

  const setYouTube = useCallback(
    (youtube: { videoId: string; startSec: number }) => {
      setState((s) => ({ ...s, youtube }));
    },
    []
  );

  const setMemberVideo = useCallback(
    (memberName: string, video: MemberVideo) => {
      setState((s) => ({
        ...s,
        memberVideos: { ...s.memberVideos, [memberName]: video },
      }));
    },
    []
  );

  const clearMemberVideo = useCallback((memberName: string) => {
    setState((s) => {
      const newMemberVideos = { ...s.memberVideos };
      delete newMemberVideos[memberName];
      return { ...s, memberVideos: newMemberVideos };
    });
  }, []);

  const loadPreset = useCallback((index: number) => {
    const preset = PRESETS[index];
    if (!preset) return;
    setState((s) => ({
      ...s,
      blocks: [...preset.blocks],
      assignment: { ...preset.assignment },
    }));
  }, []);

  const loadProject = useCallback((data: ProjectData) => {
    setState({
      blocks: data.blocks,
      assignment: data.assignment,
      template: data.template,
      youtube: data.youtube,
      memberVideos: (data.memberVideos && Object.keys(data.memberVideos).length > 0) ? data.memberVideos : DEFAULT_MEMBER_VIDEOS,
    });
  }, []);

  const toProjectData = useCallback((): ProjectData => {
    return {
      blocks: state.blocks,
      assignment: state.assignment,
      template: state.template,
      youtube: state.youtube,
      memberVideos: state.memberVideos,
    };
  }, [state]);

  const clearBlocks = useCallback(() => {
    setState((s) => ({ ...s, blocks: [] }));
  }, []);

  return {
    state,
    addBlock,
    removeBlock,
    moveBlock,
    setAssignment,
    clearAssignment,
    resetAssignment,
    applyRecommended,
    setTemplate,
    setYouTube,
    setMemberVideo,
    clearMemberVideo,
    loadPreset,
    loadProject,
    toProjectData,
    clearBlocks,
  };
}
