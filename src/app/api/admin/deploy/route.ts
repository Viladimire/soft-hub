import { NextResponse, type NextRequest } from "next/server";

import { isAdminRequestAuthorized } from "@/lib/auth/admin-session";
import { readLocalAdminConfig } from "@/lib/services/local-admin-config";

export const POST = async (request: NextRequest) => {
  if (!isAdminRequestAuthorized(request)) {
    return NextResponse.json({ message: "غير مصرح" }, { status: 401 });
  }

  const config = await readLocalAdminConfig();
  const deployHookUrl = process.env.VERCEL_DEPLOY_HOOK_URL ?? config.vercel?.deployHookUrl;

  if (!deployHookUrl) {
    return NextResponse.json(
      { message: "لا يوجد VERCEL_DEPLOY_HOOK_URL. أنشئ Deploy Hook في Vercel ثم الصق الرابط في Settings واحفظ." },
      { status: 400 },
    );
  }

  try {
    const response = await fetch(deployHookUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ source: "soft-hub-admin" }),
      cache: "no-store",
    });

    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json(
        { message: `فشل Trigger على Vercel (${response.status})`, details: text.slice(0, 2000) },
        { status: 502 },
      );
    }

    const text = await response.text().catch(() => "");
    return NextResponse.json({ ok: true, message: "تم إرسال أمر النشر إلى Vercel", details: text.slice(0, 2000) });
  } catch (error) {
    console.error("Deploy hook failed", error);
    return NextResponse.json({ message: "تعذر الاتصال بـ Vercel deploy hook" }, { status: 500 });
  }
};
