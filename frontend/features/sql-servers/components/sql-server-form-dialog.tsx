"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Input, Select } from "@/components/ui/input";
import {
  AUTHENTICATION_TYPES,
  requiresCredentials,
  type SQLServer,
  type SQLServerInput,
} from "../services/sql-servers.service";

interface SqlServerFormDialogProps {
  /** `"new"` opens a blank form; a server opens it populated for editing. */
  target: SQLServer | "new" | null;
  onClose: () => void;
  onSubmit: (input: SQLServerInput, id?: number) => Promise<boolean>;
  isSaving: boolean;
  error: string | null;
}

interface FormState {
  name: string;
  host: string;
  port: string;
  authentication_type: string;
  username: string;
  secret_reference: string;
  description: string;
}

function initialState(target: SQLServer | "new"): FormState {
  if (target === "new") {
    return {
      name: "",
      host: "",
      port: "1433",
      authentication_type: "sql_password",
      username: "",
      secret_reference: "",
      description: "",
    };
  }

  return {
    name: target.name,
    host: target.host,
    port: String(target.port),
    authentication_type: target.authentication_type,
    username: target.username ?? "",
    secret_reference: target.secret_reference ?? "",
    description: target.description ?? "",
  };
}

export function SqlServerFormDialog({
  target,
  onClose,
  onSubmit,
  isSaving,
  error,
}: SqlServerFormDialogProps) {
  if (!target) return null;

  // Keyed on the target so switching from one row's edit to another's resets
  // the fields — without it the form would keep the previous server's values.
  return (
    <SqlServerForm
      key={target === "new" ? "new" : target.id}
      target={target}
      onClose={onClose}
      onSubmit={onSubmit}
      isSaving={isSaving}
      error={error}
    />
  );
}

function SqlServerForm({
  target,
  onClose,
  onSubmit,
  isSaving,
  error,
}: Omit<SqlServerFormDialogProps, "target"> & { target: SQLServer | "new" }) {
  const [form, setForm] = useState<FormState>(() => initialState(target));
  const [validation, setValidation] = useState<Partial<Record<keyof FormState, string>>>(
    {}
  );

  const isEdit = target !== "new";
  const showCredentials = requiresCredentials(form.authentication_type);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setValidation((current) => ({ ...current, [key]: undefined }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const port = Number(form.port);
    const errors: Partial<Record<keyof FormState, string>> = {};
    if (!form.name.trim()) errors.name = "A server name is required.";
    if (!form.host.trim()) errors.host = "A host endpoint is required.";
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      errors.port = "Port must be between 1 and 65535.";
    }

    if (Object.keys(errors).length > 0) {
      setValidation(errors);
      return;
    }

    const input: SQLServerInput = {
      name: form.name.trim(),
      host: form.host.trim(),
      port,
      authentication_type: form.authentication_type,
      // Credentials only mean something for SQL Password; sending stale values
      // alongside Azure AD would store a credential the gateway never uses.
      username: showCredentials ? form.username.trim() || null : null,
      secret_reference: showCredentials ? form.secret_reference.trim() || null : null,
      description: form.description.trim() || null,
      is_active: isEdit ? target.is_active : true,
    };

    const saved = await onSubmit(input, isEdit ? target.id : undefined);
    if (saved) onClose();
  };

  return (
    <Dialog open onOpenChange={(open) => !open && !isSaving && onClose()}>
      <DialogContent className="max-w-120 gap-0 p-6.5">
        <form onSubmit={handleSubmit} noValidate>
          <DialogHeader>
            <DialogTitle className="text-[17px] font-bold">
              {isEdit ? "Edit Server" : "New Server"}
            </DialogTitle>
            <DialogDescription className="text-[13px]">
              Register a SQL Server / Azure SQL endpoint for discovery.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-5 flex flex-col gap-3.5">
            <FormField label="Server name" error={validation.name}>
              {(props) => (
                <Input
                  {...props}
                  value={form.name}
                  placeholder="mcp-gateway-sql-srv"
                  onChange={(event) => set("name", event.target.value)}
                />
              )}
            </FormField>

            <FormField label="Host endpoint" error={validation.host}>
              {(props) => (
                <Input
                  {...props}
                  value={form.host}
                  placeholder="your-server.database.windows.net"
                  className="font-mono"
                  onChange={(event) => set("host", event.target.value)}
                />
              )}
            </FormField>

            <div className="grid grid-cols-[1fr_1.4fr] gap-3">
              <FormField label="Port" error={validation.port}>
                {(props) => (
                  <Input
                    {...props}
                    value={form.port}
                    inputMode="numeric"
                    placeholder="1433"
                    className="font-mono"
                    onChange={(event) => set("port", event.target.value)}
                  />
                )}
              </FormField>

              <FormField label="Authentication">
                {(props) => (
                  <Select
                    {...props}
                    value={form.authentication_type}
                    onChange={(event) => set("authentication_type", event.target.value)}
                  >
                    {AUTHENTICATION_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </Select>
                )}
              </FormField>
            </div>

            {showCredentials && (
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Username">
                  {(props) => (
                    <Input
                      {...props}
                      value={form.username}
                      autoComplete="off"
                      onChange={(event) => set("username", event.target.value)}
                    />
                  )}
                </FormField>

                {/* The gateway stores a reference to the credential, never the
                    credential — so this asks for the reference rather than
                    offering a password box it could not honour. */}
                <FormField label="Secret reference" hint="Key Vault secret name">
                  {(props) => (
                    <Input
                      {...props}
                      value={form.secret_reference}
                      autoComplete="off"
                      className="font-mono"
                      placeholder="sql-admin-password"
                      onChange={(event) => set("secret_reference", event.target.value)}
                    />
                  )}
                </FormField>
              </div>
            )}

            <FormField label="Description" hint="Optional">
              {(props) => (
                <Input
                  {...props}
                  value={form.description}
                  onChange={(event) => set("description", event.target.value)}
                />
              )}
            </FormField>
          </div>

          {error && (
            <p
              role="alert"
              className="mt-4 rounded-md bg-destructive-bg px-3.5 py-2.5 text-[12.5px] font-medium text-destructive"
            >
              {error}
            </p>
          )}

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" size="lg" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" size="lg" disabled={isSaving}>
              {isSaving && <Loader2 aria-hidden="true" className="animate-spin" />}
              {isEdit ? "Save Changes" : "Add Server"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
