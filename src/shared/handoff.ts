import { z } from "zod";

export const HandoffEnvelopeSchema = z.object({
  threadId: z.string().min(1),
  messageId: z.string().min(1),
  userText: z.string(),
  timestamp: z.string().datetime(),
  mode: z.enum(["mvp", "web"]).optional().default("mvp"),
  metadata: z.record(z.string(), z.unknown()).optional()
});

export type HandoffEnvelope = z.infer<typeof HandoffEnvelopeSchema>;


