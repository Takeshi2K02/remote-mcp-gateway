"use client";

import * as React from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type SQLServer } from "@/features/sql-servers/services/sql-servers.service";

const databaseSchema = z.object({
  name: z.string().min(1, "Database name is required"),
  sql_server_id: z.preprocess((val) => Number(val), z.number().int().min(1, "Please select a SQL Server")),
  description: z.string().optional(),
  is_active: z.boolean().default(true),
});

export type DatabaseFormData = z.infer<typeof databaseSchema>;

interface DatabaseFormProps {
  servers: SQLServer[];
  defaultValues?: Partial<DatabaseFormData>;
  onSubmit: (data: DatabaseFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function DatabaseForm({ servers, defaultValues, onSubmit, onCancel, isLoading }: DatabaseFormProps) {
  const [formData, setFormData] = React.useState<DatabaseFormData>({
    name: defaultValues?.name || "",
    sql_server_id: defaultValues?.sql_server_id || (servers[0]?.id || 0),
    description: defaultValues?.description || "",
    is_active: defaultValues?.is_active ?? true,
  });

  const [errors, setErrors] = React.useState<Record<string, string>>({});

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

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      is_active: e.target.checked,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const result = databaseSchema.safeParse(formData);
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
      await onSubmit(result.data);
    } catch (err) {
      console.error("Form submit error:", err);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Name */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">Database Name *</Label>
        <Input
          id="name"
          name="name"
          placeholder="e.g. sales_records_db"
          value={formData.name}
          onChange={handleChange}
          disabled={isLoading}
        />
        {errors.name && <span className="text-xs text-destructive">{errors.name}</span>}
      </div>

      {/* SQL Server Parent */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="sql_server_id">Registered SQL Server *</Label>
        <select
          id="sql_server_id"
          name="sql_server_id"
          className="flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          value={formData.sql_server_id}
          onChange={handleChange}
          disabled={isLoading}
        >
          <option value="" disabled>Select parent SQL Server node...</option>
          {servers.map((server) => (
            <option key={server.id} value={server.id}>
              {server.name} ({server.host}:{server.port})
            </option>
          ))}
        </select>
        {errors.sql_server_id && <span className="text-xs text-destructive">{errors.sql_server_id}</span>}
      </div>

      {/* Description */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="description">Description</Label>
        <Input
          id="description"
          name="description"
          placeholder="Enter purpose or mapping notes"
          value={formData.description}
          onChange={handleChange}
          disabled={isLoading}
        />
      </div>

      {/* Active Status */}
      <div className="flex items-center gap-2 py-1">
        <input
          id="is_active"
          name="is_active"
          type="checkbox"
          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
          checked={formData.is_active}
          onChange={handleCheckboxChange}
          disabled={isLoading}
        />
        <Label htmlFor="is_active" className="cursor-pointer font-normal text-muted-foreground">
          Activate database catalog entry immediately
        </Label>
      </div>

      <div className="flex justify-end gap-3 mt-6 border-t border-border pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading || servers.length === 0}>
          {isLoading ? "Saving..." : "Save Database"}
        </Button>
      </div>
    </form>
  );
}
export default DatabaseForm;
