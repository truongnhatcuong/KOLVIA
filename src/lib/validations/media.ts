import { z } from "zod";

export const uploadInputSchema = z
  .object({
    target: z.enum(["AVATAR", "COVER", "PORTFOLIO", "LOGO", "JOB_COVER"]),
    jobId: z.string().min(1).max(100).optional(),
  })
  .strict()
  .superRefine((input, ctx) => {
    if ((input.target === "JOB_COVER") !== Boolean(input.jobId))
      ctx.addIssue({ code: "custom", message: "Ảnh Job cần mã Job hợp lệ.", path: ["jobId"] });
  });
export type UploadInput = z.infer<typeof uploadInputSchema>;
export const mediaSelect = { id: true, target: true, url: true, name: true } as const;
export type MediaView = { id: string; target: string; url: string; name: string };
