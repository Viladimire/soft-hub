import { z } from "zod";

export const uploadSchema = z.object({
  file: z
    .instanceof(File, { message: "Please select a file" })
    .refine((file) => file.size <= 500 * 1024 * 1024, "Max size is 500 MB"),
  category: z.string().min(1, "Select a category"),
  platform: z.string().min(1, "Select a platform"),
});

export type UploadInput = z.infer<typeof uploadSchema>;
