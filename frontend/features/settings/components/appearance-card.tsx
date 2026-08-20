import { ThemeToggle } from "@/components/theme-toggle";
import { SurfaceCard } from "@/components/ui/surface-card";

export function AppearanceCard() {
  return (
    <SurfaceCard className="p-5.5">
      <h2 className="mb-1 text-[15px] font-bold">Appearance</h2>
      <p className="mb-3.5 text-[13px] text-muted-foreground">
        Choose how the admin console looks. &quot;System&quot; follows your operating
        system&apos;s preference automatically.
      </p>
      <ThemeToggle />
    </SurfaceCard>
  );
}
