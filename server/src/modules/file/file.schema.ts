import { z } from "zod";

export const presignBodySchema = z.object({
  contentType: z.string().trim().min(1).optional(),
  ext: z.string().trim().min(1).optional(),
});

export const batchFilesSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(100),
});

export const fileParamsSchema = z.object({ id: z.string().min(1) });

