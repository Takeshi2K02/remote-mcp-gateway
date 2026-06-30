"use client";

import * as React from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type DatabaseModel } from "@/features/databases/services/databases.service";

const tableSchema = z.object({
  database_id: z.preprocess((val) => Number(val), z.number().int().min(1, "Please select a Database")),
  schema_name: z.string().min(1, "Schema name is required"),
  table_name: z.string().min(1, "Table name is required"),
  description: z.string().optional(),
  is_active: z.boolean().default(true),
});

export type TableFormData = z.infer<typeof tableSchema>;

interface TableFormProps {
  databases: DatabaseModel[];
  defaultValues?: Partial<TableFormData>;
  onSubmit: (data: TableFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  isEdit?: boolean;
}

export function TableForm({ databases, defaultValues, onSubmit, onCancel, isLoading, isEdit }: TableFormProps) {
  const [formData, setFormData] = React.useState<TableFormData>({
    database_id: defaultValues?.database_id || (databases[0]?.id || 0),
    schema_name: defaultValues?.schema_name || "dbo",
    table_name: defaultValues?.table_name || "",
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

    const result = tableSchema.safeParse(formData);
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
      {/* Database Parent */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="database_id">Parent Database *</Label>
        <select
          id="database_id"
          name="database_id"
          className="flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          value={formData.database_id}
          onChange={handleChange}
          disabled={isLoading || isEdit} // Cannot change parent DB in Edit mode typically
        >
          <option value="" disabled>Select catalog database...</option>
          {databases.map((db) => (
            <option key={db.id} value={db.id}>
              {db.name}
            </option>
          ))}
        </select>
        {errors.database_id && <span className="text-xs text-destructive">{errors.database_id}</span>}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Schema Name */}
        <div className="flex flex-col gap-1.5 col-span-1">
          <Label htmlFor="schema_name">Schema *</Label>
          <Input
            id="schema_name"
            name="schema_name"
            placeholder="dbo"
            value={formData.schema_name}
            onChange={handleChange}
            disabled={isLoading}
          />
          {errors.schema_name && <span className="text-xs text-destructive">{errors.schema_name}</span>}
        </div>

        {/* Table Name */}
        <div className="flex flex-col gap-1.5 col-span-2">
          <Label htmlFor="table_name">Table Name *</Label>
          <Input
            id="table_name"
            name="table_name"
            placeholder="e.g. customers"
            value={formData.table_name}
            onChange={handleChange}
            disabled={isLoading}
          />
          {errors.table_name && <span className="text-xs text-destructive">{errors.table_name}</span>}
        </div>
      </div>

      {/* Description */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="description">Description</Label>
        <Input
          id="description"
          name="description"
          placeholder="Enter schema details or purpose"
          value={formData.description}
          onChange={handleChange}
          disabled={isLoading}
        />
      </div>

      {/* Active Status (Only in Edit mode since Create does not take is_active in API schema) */}
      {isEdit && (
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
            Activate table mapping immediately
          </Label>
        </div>
      )}

      <div className="flex justify-end gap-3 mt-6 border-t border-border pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading || databases.length === 0}>
          {isLoading ? "Saving..." : "Save Table"}
        </Button>
      </div>
    </form>
  );
}
export default TableForm;
