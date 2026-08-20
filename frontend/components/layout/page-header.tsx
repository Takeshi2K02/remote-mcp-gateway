import { cn } from "@/lib/utils";

interface PageHeaderProps {
  /**
   * The page's own heading. Longer than the nav label on purpose — the top bar
   * says "Dashboard", this says "Dashboard Overview".
   */
  title: string;
  description: string;
  /** Primary action for the page, e.g. "New Server" or a sync button. */
  action?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, description, action, className }: PageHeaderProps) {
  return (
    <div
      className={cn(
        "mb-6.5 flex flex-wrap items-start justify-between gap-4",
        className
      )}
    >
      <div className="min-w-0">
        <h2 className="text-[26px] font-extrabold tracking-[-0.3px] text-foreground">
          {title}
        </h2>
        <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  );
}
