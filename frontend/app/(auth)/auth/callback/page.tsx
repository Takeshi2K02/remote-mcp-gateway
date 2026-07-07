import { Suspense } from "react";
import { AuthCallbackHandler } from "@/features/auth/auth-callback-handler";

export default function AuthCallbackPage() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <Suspense
        fallback={
          <p className="text-sm text-muted-foreground">Signing you in...</p>
        }
      >
        <AuthCallbackHandler />
      </Suspense>
    </main>
  );
}
