"use client";

import { useEffect, useState } from "react";
import { getCurrentUser, type CurrentUser } from "@/features/auth/services/auth.service";

export default function DashboardPage() {
  const [user, setUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    async function loadUser() {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
    }

    loadUser();
  }, []);

  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>

      <p className="text-muted-foreground">
        You are signed in to Remote MCP Gateway.
      </p>

      {user && (
        <pre className="mt-4 rounded-md border p-4 text-sm">
          {JSON.stringify(user, null, 2)}
        </pre>
      )}
    </main>
  );
}