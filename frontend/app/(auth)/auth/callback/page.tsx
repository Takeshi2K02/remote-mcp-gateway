"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { setAppToken } from "@/lib/auth/token-storage";

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get("token");

    if (!token) {
      router.replace("/login");
      return;
    }

    setAppToken(token);
    router.replace("/dashboard");
  }, [router, searchParams]);

  return (
    <p className="text-sm text-muted-foreground">
      Signing you in...
    </p>
  );
}

export default function AuthCallbackPage() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <Suspense
        fallback={
          <p className="text-sm text-muted-foreground">
            Signing you in...
          </p>
        }
      >
        <AuthCallbackContent />
      </Suspense>
    </main>
  );
}