/**
 * Presentation helpers shared by every table and card in the console.
 *
 * These live here rather than beside a feature because the same person must
 * get the same initials and the same avatar tint whether they appear in the
 * users table, the audit log, or the permissions picker — a per-feature copy
 * is how that consistency gets lost.
 */

const AVATAR_TINT_COUNT = 5;

/** "Takeshi Dilshan" -> "TD". Falls back to the email's first letters. */
export function initialsOf(value: string | null | undefined): string {
  const source = (value ?? "").trim();
  if (!source) return "??";

  const words = source.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

/**
 * Stable 1..5 tint index for a seed string.
 *
 * Deliberately deterministic and content-derived: the tint has to survive a
 * refetch, a re-sort and a different page, and an index into the fetched array
 * survives none of those.
 */
export function avatarTint(seed: string | null | undefined): number {
  const source = seed ?? "";
  let hash = 0;
  for (let i = 0; i < source.length; i += 1) {
    hash = (hash * 31 + source.charCodeAt(i)) % AVATAR_TINT_COUNT;
  }
  return hash + 1;
}

/** "8/19/2026, 10:50:40 AM" — the console's full timestamp form. */
export function formatDateTime(value: string | null | undefined): string {
  const date = toDate(value);
  if (!date) return "—";
  return date.toLocaleString("en-US", {
    month: "numeric",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

/** "8/19/2026" — used where the column is narrow and the time adds nothing. */
export function formatDate(value: string | null | undefined): string {
  const date = toDate(value);
  if (!date) return "—";
  return date.toLocaleDateString("en-US", {
    month: "numeric",
    day: "numeric",
    year: "numeric",
  });
}

/** "10:41:52 AM" */
export function formatTime(value: string | null | undefined): string {
  const date = toDate(value);
  if (!date) return "—";
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

/**
 * "10:52 AM" for today, "8/19, 6:03 PM" otherwise.
 *
 * The dashboard's activity column is 80px wide — the full timestamp form does
 * not fit, and truncating it would cut the part that varies.
 */
export function formatShortDateTime(value: string | null | undefined): string {
  const date = toDate(value);
  if (!date) return "—";

  const time = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  const now = new Date();
  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  if (isToday) return time;

  return `${date.toLocaleDateString("en-US", { month: "numeric", day: "numeric" })}, ${time}`;
}

/**
 * "Mon", "Tue" — bar-chart axis labels.
 *
 * A date-only string parses as UTC midnight, which renders as the previous day
 * anywhere west of Greenwich. The activity buckets are UTC days, so the label
 * is read back in UTC rather than shifted into local time.
 */
export function formatWeekday(value: string | null | undefined): string {
  const date = toDate(value);
  if (!date) return "—";

  const isDateOnly = typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    ...(isDateOnly ? { timeZone: "UTC" } : {}),
  });
}

/** First 8 characters of a GUID, which is all the column has room for. */
export function shortId(value: string | null | undefined): string {
  if (!value) return "—";
  return value.length > 8 ? `${value.slice(0, 8)}...` : value;
}

export function pluralize(count: number, singular: string, plural?: string): string {
  return `${count} ${count === 1 ? singular : (plural ?? `${singular}s`)}`;
}

/**
 * The API sends naive ISO strings for columns written before the timestamps
 * became timezone-aware. Left alone the browser reads those as local time and
 * shifts them; appending Z pins them to UTC, which is how they were stored.
 */
function toDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const normalized =
    /\d{2}:\d{2}:\d{2}/.test(value) && !/(Z|[+-]\d{2}:?\d{2})$/.test(value)
      ? `${value}Z`
      : value;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * "failed" -> "Failed". The API stores status words lowercase; the console
 * shows them capitalised. Done here rather than in the API so the stored
 * vocabulary stays the source of truth for filtering and tone selection.
 */
export function titleCase(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}
