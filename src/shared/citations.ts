import { z } from "zod";

export const CitationSchema = z.object({
  url: z.string().url(),
  title: z.string().optional(),
  retrievedAt: z.string().datetime().optional(),
  excerpt: z.string().max(500).optional()
});

export type Citation = z.infer<typeof CitationSchema>;


