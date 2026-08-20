import { cn } from "@/lib/utils";

/**
 * The console's single container shape: white block, hairline border, 14px
 * corners, a shadow you have to look for. Table cards, chart cards and panels
 * are all this, which is why it is one component and not three.
 */
export function SurfaceCard({
  className,
  ...props
}: React.ComponentProps<"section">) {
  return <section className={cn("surface-card", className)} {...props} />;
}

interface SurfaceCardHeaderProps {
  title: string;
  description?: string;
  /** Right-aligned controls — a search field, a filter, a button. */
  action?: React.ReactNode;
  /**
   * Table cards rule off the header from the rows below. Chart cards, whose
   * body is a single figure, do not.
   */
  bordered?: boolean;
  className?: string;
}

export function SurfaceCardHeader({
  title,
  description,
  action,
  bordered = false,
  className,
}: SurfaceCardHeaderProps) {
  return (
    <header
      className={cn(
        "flex flex-wrap items-center justify-between gap-4 px-5.5 py-5",
        bordered && "border-b border-border",
        className
      )}
    >
      <div className="min-w-0">
        <h2 className="text-[15px] font-bold text-foreground">{title}</h2>
        {description && (
          <p className="mt-0.5 text-[12.5px] text-subtle-foreground">{description}</p>
        )}
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </header>
  );
}
