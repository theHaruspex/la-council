import { z } from "zod";

export const HandoffEnvelopeSchema = z.object({
  threadId: z.string().min(1),
  messageId: z.string().min(1),
  userText: z.string(),
  timestamp: z.string().datetime(),
  mode: z.enum(["mvp", "web"]).optional().default("mvp"),
  metadata: z.record(z.string(), z.unknown()).optional()
});

// Contract type for callers (input). Note: `.default()` makes the *parsed/output* value required.
export type HandoffEnvelope = z.input<typeof HandoffEnvelopeSchema>;
export type ParsedHandoffEnvelope = z.output<typeof HandoffEnvelopeSchema>;


