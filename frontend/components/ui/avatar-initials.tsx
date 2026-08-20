import { avatarTint, initialsOf } from "@/lib/format";
import { cn } from "@/lib/utils";

// Tailwind cannot build `bg-[var(--avatar-${n}-bg)]` from a runtime value, so
// the five pairs are enumerated. Keep in step with the --avatar-* tokens.
const TINT_CLASSES: Record<number, string> = {
  1: "bg-[var(--avatar-1-bg)] text-[var(--avatar-1-fg)]",
  2: "bg-[var(--avatar-2-bg)] text-[var(--avatar-2-fg)]",
  3: "bg-[var(--avatar-3-bg)] text-[var(--avatar-3-fg)]",
  4: "bg-[var(--avatar-4-bg)] text-[var(--avatar-4-fg)]",
  5: "bg-[var(--avatar-5-bg)] text-[var(--avatar-5-fg)]",
};

const SIZE_CLASSES = {
  xs: "h-6.5 w-6.5 text-[10px]",
  sm: "h-7 w-7 text-[11px]",
  md: "h-7.5 w-7.5 text-[11.5px]",
  lg: "h-9.5 w-9.5 text-[13px]",
} as const;

interface AvatarInitialsProps {
  /** Display name; falls back to the seed when absent. */
  name: string | null | undefined;
  /**
   * Value the tint is derived from. Pass something stable and unique — an
   * email or id — so the colour does not change when the name is edited.
   */
  seed: string;
  size?: keyof typeof SIZE_CLASSES;
  className?: string;
}

export function AvatarInitials({ name, seed, size = "sm", className }: AvatarInitialsProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-bold",
        SIZE_CLASSES[size],
        TINT_CLASSES[avatarTint(seed)],
        className
      )}
    >
      {initialsOf(name || seed)}
    </span>
  );
}
