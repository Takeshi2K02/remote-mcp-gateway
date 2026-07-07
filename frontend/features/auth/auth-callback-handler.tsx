"use client";
import { setAppToken } from "@/lib/auth/token-storage";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export function AuthCallbackHandler() {
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

  return <p className="text-sm text-muted-foreground">Signing you in...</p>;
}
