"use client";

import * as React from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const sqlServerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  host: z.string().min(1, "Host is required"),
  port: z.preprocess((val) => (val === "" ? 1433 : Number(val)), z.number().int().min(1).max(65535)),
  authentication_type: z.string().min(1, "Auth type is required"),
  username: z.string().optional(),
  secret_reference: z.string().optional(),
  connection_options: z.string().optional(),
  description: z.string().optional(),
  is_active: z.boolean().default(true),
});

export type SQLServerFormData = z.infer<typeof sqlServerSchema>;

interface SQLServerFormProps {
  defaultValues?: Partial<SQLServerFormData>;
  onSubmit: (data: SQLServerFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function SQLServerForm({ defaultValues, onSubmit, onCancel, isLoading }: SQLServerFormProps) {
  const [formData, setFormData] = React.useState<SQLServerFormData>({
    name: defaultValues?.name || "",
    host: defaultValues?.host || "",
    port: defaultValues?.port || 1433,
    authentication_type: defaultValues?.authentication_type || "sql_password",
    username: defaultValues?.username || "",
    secret_reference: defaultValues?.secret_reference || "",
    connection_options: defaultValues?.connection_options || "",
    description: defaultValues?.description || "",
    is_active: defaultValues?.is_active ?? true,
  });

  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const val = type === "checkbox" ? (e.target as HTMLInputElement).checked : value;
    
    setFormData((prev) => ({
      ...prev,
      [name]: val,
    }));
    
    // Clear error on change
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
    
    const result = sqlServerSchema.safeParse(formData);
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
      <div className="grid grid-cols-2 gap-4">
        {/* Name */}
        <div className="flex flex-col gap-1.5 col-span-2">
          <Label htmlFor="name">Server Name *</Label>
          <Input
            id="name"
            name="name"
            placeholder="e.g. Production DB Server"
            value={formData.name}
            onChange={handleChange}
            disabled={isLoading}
          />
          {errors.name && <span className="text-xs text-destructive">{errors.name}</span>}
        </div>

        {/* Host */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="host">Host / IP Address *</Label>
          <Input
            id="host"
            name="host"
            placeholder="e.g. mcp-server.database.windows.net"
            value={formData.host}
            onChange={handleChange}
            disabled={isLoading}
          />
          {errors.host && <span className="text-xs text-destructive">{errors.host}</span>}
        </div>

        {/* Port */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="port">Port</Label>
          <Input
            id="port"
            name="port"
            type="number"
            placeholder="1433"
            value={formData.port}
            onChange={handleChange}
            disabled={isLoading}
          />
          {errors.port && <span className="text-xs text-destructive">{errors.port}</span>}
        </div>

        {/* Authentication Type */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="authentication_type">Authentication Type *</Label>
          <select
            id="authentication_type"
            name="authentication_type"
            className="flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            value={formData.authentication_type}
            onChange={handleChange}
            disabled={isLoading}
          >
            <option value="sql_password">SQL Server Authentication</option>
            <option value="active_directory">Microsoft Entra ID (OAuth)</option>
          </select>
          {errors.authentication_type && (
            <span className="text-xs text-destructive">{errors.authentication_type}</span>
          )}
        </div>

        {/* Username */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="username">Username</Label>
          <Input
            id="username"
            name="username"
            placeholder="e.g. sa_admin"
            value={formData.username}
            onChange={handleChange}
            disabled={isLoading || formData.authentication_type === "active_directory"}
          />
          {errors.username && <span className="text-xs text-destructive">{errors.username}</span>}
        </div>

        {/* Secret Reference */}
        <div className="flex flex-col gap-1.5 col-span-2">
          <Label htmlFor="secret_reference">Password / Secret Key Vault Reference</Label>
          <Input
            id="secret_reference"
            name="secret_reference"
            placeholder="e.g. kv://secrets/db-prod-password"
            value={formData.secret_reference}
            onChange={handleChange}
            disabled={isLoading}
          />
          {errors.secret_reference && (
            <span className="text-xs text-destructive">{errors.secret_reference}</span>
          )}
        </div>

        {/* Connection Options */}
        <div className="flex flex-col gap-1.5 col-span-2">
          <Label htmlFor="connection_options">Connection Options (JSON / String)</Label>
          <Input
            id="connection_options"
            name="connection_options"
            placeholder="e.g. Encrypt=true;TrustServerCertificate=false;"
            value={formData.connection_options}
            onChange={handleChange}
            disabled={isLoading}
          />
          {errors.connection_options && (
            <span className="text-xs text-destructive">{errors.connection_options}</span>
          )}
        </div>

        {/* Description */}
        <div className="flex flex-col gap-1.5 col-span-2">
          <Label htmlFor="description">Description</Label>
          <Input
            id="description"
            name="description"
            placeholder="Enter server purpose or notes"
            value={formData.description}
            onChange={handleChange}
            disabled={isLoading}
          />
        </div>

        {/* Active Status */}
        <div className="flex items-center gap-2 col-span-2 py-1">
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
            Activate server configuration immediately
          </Label>
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-6 border-t border-border pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Saving..." : "Save Server"}
        </Button>
      </div>
    </form>
  );
}
