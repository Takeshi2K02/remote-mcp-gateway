"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { apiRequest } from "@/lib/api/http-client";
import { Server, Database, Table, Loader2 } from "lucide-react";

interface ResourceCounts {
  servers: number | null;
  databases: number | null;
  tables: number | null;
}

export function StatsCard() {
  const [counts, setCounts] = useState<ResourceCounts>({
    servers: null,
    databases: null,
    tables: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function fetchCounts() {
      try {
        setLoading(true);
        setError(false);
        
        // Fetch all in parallel using apiRequest
        const [servers, databases, tables] = await Promise.all([
          apiRequest<unknown[]>("/sql-servers"),
          apiRequest<unknown[]>("/databases"),
          apiRequest<unknown[]>("/database-tables"),
        ]);

        setCounts({
          servers: servers ? servers.length : 0,
          databases: databases ? databases.length : 0,
          tables: tables ? tables.length : 0,
        });
      } catch (err) {
        console.error("Error fetching resource counts:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    }

    fetchCounts();
  }, []);

  const statsItems = [
    {
      title: "SQL Servers",
      value: counts.servers,
      icon: Server,
      color: "text-blue-500 bg-blue-500/10 border-blue-500/20",
      description: "Registered database instances",
    },
    {
      title: "Databases",
      value: counts.databases,
      icon: Database,
      color: "text-indigo-500 bg-indigo-500/10 border-indigo-500/20",
      description: "Monitored databases",
    },
    {
      title: "Tables",
      value: counts.tables,
      icon: Table,
      color: "text-purple-500 bg-purple-500/10 border-purple-500/20",
      description: "Mapped tables and schemas",
    },
  ];

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        {statsItems.map((item) => (
          <Card key={item.title} className="shadow-sm border-border">
            <CardContent className="p-6 flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">{item.title}</p>
                <div className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  <span className="text-xl font-bold">Loading...</span>
                </div>
              </div>
              <div className={`p-3 rounded-lg border ${item.color.split(" ")[1]}`}>
                <item.icon className="h-5 w-5 text-muted-foreground animate-pulse" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {statsItems.map((item) => (
        <Card key={item.title} className="shadow-sm border-border hover:shadow-md transition-all duration-200">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-muted-foreground/80 tracking-tight">{item.title}</p>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-extrabold tracking-tight text-foreground">
                  {error ? "—" : item.value ?? 0}
                </span>
              </div>
              <p className="text-xs text-muted-foreground/70">{item.description}</p>
            </div>
            <div className={`p-3.5 rounded-xl border ${item.color}`}>
              <item.icon className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
export default StatsCard;
