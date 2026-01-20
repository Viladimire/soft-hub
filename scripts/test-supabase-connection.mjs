import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

import { createClient } from "@supabase/supabase-js";

const envPath = resolve(process.cwd(), ".env.local");

if (!existsSync(envPath)) {
  console.error("❌ لم يتم العثور على ملف .env.local. تأكد من تشغيل setup-supabase-env.ps1 أولاً.");
  process.exit(1);
}

const envContent = readFileSync(envPath, "utf-8")
  .split(/\r?\n/)
  .filter(Boolean)
  .reduce((acc, line) => {
    const [key, ...rest] = line.split("=");
    if (!key) {
      return acc;
    }
    acc[key.trim()] = rest.join("=").trim();
    return acc;
  }, {});

const url = envContent.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = envContent.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? envContent.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !anonKey) {
  console.error("❌ قيم Supabase غير مكتملة. تحقق من NEXT_PUBLIC_SUPABASE_URL و NEXT_PUBLIC_SUPABASE_ANON_KEY في .env.local");
  process.exit(1);
}

const supabase = createClient(url, anonKey);

try {
  const { error } = await supabase.from("software").select("id", { head: true, count: "exact" });
  if (error) {
    console.error("❌ فشل الاتصال بـ Supabase:", error.message);
    process.exit(1);
  }

  console.log("✅ الاتصال بـ Supabase ناجح ويمكن الوصول لجدول software.");
  process.exit(0);
} catch (error) {
  console.error("❌ حدث خطأ أثناء اختبار الاتصال بـ Supabase:", error?.message ?? error);
  process.exit(1);
}
