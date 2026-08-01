"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import http, { getApiPayload } from "@/lib/http";
import { useAuthStore } from "@/store/auth-store";
import type { UserSession } from "@/types";

const loginSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(3, "ایمیل یا شماره موبایل معتبر وارد کنید"),
  password: z.string().min(4, "رمز عبور حداقل ۴ کاراکتر باشد"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

interface LoginResponse {
  message: string;
  user: UserSession;
}

export default function AdminLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setUser = useAuthStore((state) => state.setUser);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      identifier: "admin@premiummenu.test",
      password: "admin1234",
    },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setSubmitError(null);

    try {
      const response = await getApiPayload<LoginResponse>(
        http.post("/auth/login", values),
      );
      setUser(response.user);

      const nextPath = searchParams.get("next");
      router.replace(nextPath && nextPath.startsWith("/admin") ? nextPath : "/admin");
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "ایمیل یا رمز عبور نادرست است. لطفاً دوباره تلاش کنید.",
      );
    }
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-lg items-center justify-center px-6 py-16 lg:px-8">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-2xl">ورود پنل ادمین</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="identifier">ایمیل یا شماره موبایل</Label>
              <Input
                id="identifier"
                type="text"
                autoComplete="username"
                placeholder="admin@premiummenu.test"
                {...register("identifier")}
              />
              {errors.identifier ? (
                <p className="text-sm text-red-600">{errors.identifier.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">رمز عبور</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="admin1234"
                {...register("password")}
              />
              {errors.password ? (
                <p className="text-sm text-red-600">{errors.password.message}</p>
              ) : null}
            </div>

            {submitError ? (
              <p className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
                {submitError}
              </p>
            ) : null}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "در حال ورود..." : "ورود"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
