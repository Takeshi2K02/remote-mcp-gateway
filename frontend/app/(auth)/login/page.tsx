"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { redirectToMicrosoftLogin } from "@/lib/auth/auth-service";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2 text-center">
          <CardTitle className="text-2xl font-bold">
            Remote MCP Gateway
          </CardTitle>

          <CardDescription>
            Sign in with your Microsoft account to access the Admin Portal.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Button
            className="w-full"
            onClick={redirectToMicrosoftLogin}
          >
            Sign in with Microsoft
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}