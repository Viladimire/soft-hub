'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type StatusState = "idle" | "loading" | "success" | "error";

type AdminLoginProps = {
  onSuccess?: () => void;
};

export const AdminLogin = ({ onSuccess }: AdminLoginProps) => {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [status, setStatus] = useState<StatusState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = token.trim();

    if (!trimmed) {
      setErrorMessage("يرجى إدخال مفتاح الإدارة");
      setStatus("error");
      return;
    }

    try {
      setStatus("loading");
      setErrorMessage(null);
      const response = await fetch("/api/admin/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token: trimmed }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        const message = typeof payload?.message === "string" ? payload.message : "فشل تسجيل الدخول";
        setErrorMessage(message);
        setStatus("error");
        return;
      }

      setStatus("success");
      setToken("");
      onSuccess?.();
      router.refresh();
    } catch (error) {
      console.error("Failed to login as admin", error);
      setErrorMessage("حدث خطأ غير متوقع. أعد المحاولة لاحقًا");
      setStatus("error");
    }
  };

  return (
    <Card className="border-white/10 bg-neutral-950/70">
      <CardHeader className="space-y-2 text-center">
        <CardTitle className="text-2xl font-semibold text-white">تسجيل دخول الإدارة</CardTitle>
        <CardDescription className="text-sm text-neutral-400">
          أدخل مفتاح الإدارة السري للوصول إلى لوحة التحكم.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="block text-xs text-neutral-400" htmlFor="admin-token">
              ADMIN_API_SECRET
            </label>
            <Input
              id="admin-token"
              type="password"
              value={token}
              onChange={(event) => setToken(event.target.value)}
              placeholder="••••••••••"
              className="bg-neutral-900/80 text-neutral-100"
              autoComplete="current-password"
            />
          </div>

          {errorMessage ? (
            <p className="text-sm text-rose-300" role="alert">
              {errorMessage}
            </p>
          ) : null}

          <Button type="submit" className="w-full" disabled={status === "loading"}>
            {status === "loading" ? "جارٍ التحقق..." : "تسجيل الدخول"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
