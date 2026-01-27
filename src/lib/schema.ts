import { z } from "zod";

const BlockSchema = z.enum(["A123", "A23", "B123", "B23"]);

const AssignmentSchema = z.record(z.string(), z.string());

const MemberVideoSchema = z.object({
  videoId: z.string().max(20),
  startSec: z.number().min(0).max(99999),
  endSec: z.number().min(0).max(99999).default(0),
});

const MemberVideosSchema = z.record(z.string(), MemberVideoSchema);

export const ProjectSchema = z.object({
  blocks: z.array(BlockSchema),
  assignment: AssignmentSchema.default({}),
  template: z.string().default("{SEQ}"),
  youtube: z
    .object({
      videoId: z.string().default(""),
      startSec: z.number().int().min(0).default(0),
    })
    .default({ videoId: "", startSec: 0 }),
  memberVideos: MemberVideosSchema.default({}),
});

export const SaveRequestSchema = z.object({
  blocks: z.array(BlockSchema),
  assignment: AssignmentSchema,
  template: z.string().max(500),
  youtube: z.object({
    videoId: z.string().max(20),
    startSec: z.number().int().min(0).max(99999),
  }),
  memberVideos: MemberVideosSchema.optional().default({}),
});
