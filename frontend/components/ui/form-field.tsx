import { useId } from "react";
import { cn } from "@/lib/utils";

interface FormFieldProps {
  /** Rendered in the design's small-caps form label style. */
  label: string;
  /** Explanatory text or a validation message shown beneath the control. */
  hint?: string;
  error?: string;
  className?: string;
  /** Receives the generated id so the label actually points at the control. */
  children: (props: { id: string; "aria-describedby"?: string }) => React.ReactNode;
}

/**
 * Label + control + message, wired together.
 *
 * The render-prop shape exists so the id is generated once and applied to both
 * halves — labels that only look adjacent are the usual way these forms end up
 * unusable with a screen reader.
 */
export function FormField({ label, hint, error, className, children }: FormFieldProps) {
  const id = useId();
  const messageId = error || hint ? `${id}-message` : undefined;

  return (
    <div className={cn("min-w-0", className)}>
      <label
        htmlFor={id}
        className="mb-1.5 block text-xs font-semibold tracking-[0.04em] text-muted-foreground uppercase"
      >
        {label}
      </label>
      {children({ id, "aria-describedby": messageId })}
      {(error || hint) && (
        <p
          id={messageId}
          className={cn(
            "mt-1.5 text-[12px]",
            error ? "text-destructive" : "text-subtle-foreground"
          )}
        >
          {error ?? hint}
        </p>
      )}
    </div>
  );
}
