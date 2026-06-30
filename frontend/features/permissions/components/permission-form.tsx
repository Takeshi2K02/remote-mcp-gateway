"use client";

import * as React from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type SQLServer } from "@/features/sql-servers/services/sql-servers.service";
import { type DatabaseModel } from "@/features/databases/services/databases.service";
import { type DatabaseTable } from "@/features/tables/services/tables.service";

const permissionSchema = z.object({
  user_id: z.preprocess((val) => (val === "" ? undefined : Number(val)), z.number({ message: "User ID is required" }).int().min(1, "User ID must be 1 or higher")),
  target_id: z.preprocess((val) => Number(val), z.number().int().min(1, "Please select a target resource")),
});

export type PermissionFormData = z.infer<typeof permissionSchema>;

interface PermissionFormProps {
  type: "server" | "database" | "table";
  servers: SQLServer[];
  databases: DatabaseModel[];
  tables: DatabaseTable[];
  onSubmit: (data: { user_id: number; target_id: number }) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function PermissionForm({
  type,
  servers,
  databases,
  tables,
  onSubmit,
  onCancel,
  isLoading,
}: PermissionFormProps) {
  const getDefaultTargetId = () => {
    if (type === "server") return servers[0]?.id || 0;
    if (type === "database") return databases[0]?.id || 0;
    return tables[0]?.id || 0;
  };

  const [formData, setFormData] = React.useState<PermissionFormData>({
    user_id: 1, // Default User ID to 1
    target_id: getDefaultTargetId(),
  });

  const [errors, setErrors] = React.useState<Record<string, string>>({});

  // Reset default target ID if lists load later
  React.useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      target_id: getDefaultTargetId(),
    }));
  }, [servers, databases, tables, type]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (errors[name]) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy[name];
        return copy;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const result = permissionSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        if (issue.path[0]) {
          fieldErrors[issue.path[0] as string] = issue.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    try {
      await onSubmit({
        user_id: result.data.user_id,
        target_id: result.data.target_id,
      });
    } catch (err) {
      console.error("Form submit error:", err);
    }
  };

  const renderTargetSelect = () => {
    if (type === "server") {
      return (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="target_id">SQL Server *</Label>
          <select
            id="target_id"
            name="target_id"
            className="flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            value={formData.target_id}
            onChange={handleChange}
            disabled={isLoading}
          >
            <option value="" disabled>Select server node...</option>
            {servers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.host})
              </option>
            ))}
          </select>
          {errors.target_id && <span className="text-xs text-destructive">{errors.target_id}</span>}
        </div>
      );
    }

    if (type === "database") {
      return (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="target_id">Database *</Label>
          <select
            id="target_id"
            name="target_id"
            className="flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            value={formData.target_id}
            onChange={handleChange}
            disabled={isLoading}
          >
            <option value="" disabled>Select database catalog...</option>
            {databases.map((db) => (
              <option key={db.id} value={db.id}>
                {db.name}
              </option>
            ))}
          </select>
          {errors.target_id && <span className="text-xs text-destructive">{errors.target_id}</span>}
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="target_id">Database Table *</Label>
        <select
          id="target_id"
          name="target_id"
          className="flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          value={formData.target_id}
          onChange={handleChange}
          disabled={isLoading}
        >
          <option value="" disabled>Select table schema...</option>
          {tables.map((t) => (
            <option key={t.id} value={t.id}>
              {t.schema_name}.{t.table_name}
            </option>
          ))}
        </select>
        {errors.target_id && <span className="text-xs text-destructive">{errors.target_id}</span>}
      </div>
    );
  };

  const getResourceListLength = () => {
    if (type === "server") return servers.length;
    if (type === "database") return databases.length;
    return tables.length;
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* User ID */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="user_id">User ID *</Label>
        <Input
          id="user_id"
          name="user_id"
          type="number"
          placeholder="e.g. 1"
          value={formData.user_id === undefined ? "" : formData.user_id}
          onChange={handleChange}
          disabled={isLoading}
        />
        {errors.user_id && <span className="text-xs text-destructive">{errors.user_id}</span>}
      </div>

      {/* Target Resource */}
      {renderTargetSelect()}

      <div className="flex justify-end gap-3 mt-6 border-t border-border pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading || getResourceListLength() === 0}>
          {isLoading ? "Saving..." : "Grant Permission"}
        </Button>
      </div>
    </form>
  );
}
export default PermissionForm;
