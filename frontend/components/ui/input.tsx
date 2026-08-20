import { cn } from "@/lib/utils";

/**
 * The console's text field: tinted ground, hairline border, blue border on
 * focus rather than a ring. Sized to the design's 13.5px form text.
 */
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "w-full min-w-0 rounded-md border border-input bg-field px-3 py-2.5 text-[13.5px] text-foreground transition-colors outline-none",
        "focus-visible:border-ring",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  );
}

/** Matching <select>. Same metrics so a two-up row of field + select aligns. */
function Select({ className, ...props }: React.ComponentProps<"select">) {
  return (
    <select
      data-slot="select"
      className={cn(
        "w-full min-w-0 rounded-md border border-input bg-field px-3 py-2.5 text-[13.5px] text-foreground transition-colors outline-none",
        "focus-visible:border-ring disabled:pointer-events-none disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}

export { Input, Select };
