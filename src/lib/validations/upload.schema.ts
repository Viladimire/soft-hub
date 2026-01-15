import { z } from "zod";

export const uploadSchema = z.object({
  file: z
    .instanceof(File, { message: "الرجاء اختيار ملف" })
    .refine((file) => file.size <= 500 * 1024 * 1024, "الحجم الأقصى 500 ميغابايت"),
  category: z.string().min(1, "اختر فئة"),
  platform: z.string().min(1, "اختر منصة"),
});

export type UploadInput = z.infer<typeof uploadSchema>;
