import { z } from "zod";

import { CitationSchema } from "./citations.js";

export const AgentResultSchema = z.object({
  replyText: z.string(),
  citations: z.array(CitationSchema),
  toolTrace: z
    .array(
      z.object({
        tool: z.string(),
        ms: z.number(),
        ok: z.boolean()
      })
    )
    .optional(),
  debug: z.record(z.string(), z.unknown()).optional()
});

export type AgentResult = z.infer<typeof AgentResultSchema>;


