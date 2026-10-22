// Report date ranges, computed in the store's time zone and returned as UTC
// instants for a half-open [from, to) interval.

export const RANGE_PRESETS = [
  { id: "today", label: "Today" },
  { id: "7d", label: "Last 7 days" },
  { id: "30d", label: "Last 30 days" },
  { id: "this_month", label: "This month" },
  { id: "last_month", label: "Last month" },
  { id: "custom", label: "Custom" },
] as const;
export type RangePreset = (typeof RANGE_PRESETS)[number]["id"];

export type ResolvedRange = {
  preset: RangePreset;
  from: Date;
  to: Date;
  /** Inclusive local dates (YYYY-MM-DD) for display and the custom inputs. */
  fromDate: string;
  toDate: string;
  label: string;
};

type YMD = { y: number; m: number; d: number };

/** Offset (ms) of `timeZone` from UTC at the given instant. */
function tzOffset(instant: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(instant));
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour") % 24, get("minute"), get("second"));
  return asUtc - Math.floor(instant / 1000) * 1000;
}

/** UTC instant of local midnight on the given calendar date in `timeZone`. */
export function startOfLocalDay({ y, m, d }: YMD, timeZone: string): Date {
  const guess = Date.UTC(y, m - 1, d);
  let result = guess - tzOffset(guess, timeZone);
  // Re-evaluate once in case the offset differs at the corrected instant (DST).
  result = guess - tzOffset(result, timeZone);
  return new Date(result);
}

export function localToday(now: Date, timeZone: string): YMD {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  return { y: get("year"), m: get("month"), d: get("day") };
}

function addDays({ y, m, d }: YMD, days: number): YMD {
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() };
}

const iso = ({ y, m, d }: YMD) => `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

function parseYmd(value: string | undefined): YMD | null {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const ymd = { y: Number(match[1]), m: Number(match[2]), d: Number(match[3]) };
  const check = new Date(Date.UTC(ymd.y, ymd.m - 1, ymd.d));
  return check.getUTCMonth() === ymd.m - 1 && check.getUTCDate() === ymd.d ? ymd : null;
}

const MAX_DAYS = 366;

export function resolveRange(
  input: { range?: string; from?: string; to?: string },
  timeZone: string,
  now: Date = new Date(),
): ResolvedRange {
  const today = localToday(now, timeZone);
  let preset = (RANGE_PRESETS.some((p) => p.id === input.range) ? input.range : "30d") as RangePreset;
  let start: YMD;
  let endInclusive: YMD;

  switch (preset) {
    case "today":
      start = today;
      endInclusive = today;
      break;
    case "7d":
      start = addDays(today, -6);
      endInclusive = today;
      break;
    case "this_month":
      start = { ...today, d: 1 };
      endInclusive = today;
      break;
    case "last_month": {
      const firstThis = { ...today, d: 1 };
      endInclusive = addDays(firstThis, -1);
      start = { ...endInclusive, d: 1 };
      break;
    }
    case "custom": {
      const f = parseYmd(input.from);
      const t = parseYmd(input.to);
      if (f && t && iso(f) <= iso(t)) {
        start = f;
        endInclusive = t;
        const span = (Date.UTC(t.y, t.m - 1, t.d) - Date.UTC(f.y, f.m - 1, f.d)) / 86_400_000;
        if (span >= MAX_DAYS) start = addDays(t, -(MAX_DAYS - 1));
        break;
      }
      preset = "30d";
      start = addDays(today, -29);
      endInclusive = today;
      break;
    }
    default:
      start = addDays(today, -29);
      endInclusive = today;
  }

  const label = RANGE_PRESETS.find((p) => p.id === preset)!.label;
  return {
    preset,
    from: startOfLocalDay(start, timeZone),
    to: startOfLocalDay(addDays(endInclusive, 1), timeZone),
    fromDate: iso(start),
    toDate: iso(endInclusive),
    label: preset === "custom" ? `${iso(start)} – ${iso(endInclusive)}` : label,
  };
}

/** "YYYY-MM-DDTHH:mm" wall-clock time in `timeZone` → UTC Date (null if invalid). */
export function localDateTimeToUtc(value: string | undefined, timeZone: string): Date | null {
  const m = value?.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) return null;
  const [y, mo, d, h, mi] = m.slice(1).map(Number);
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  let result = guess - tzOffset(guess, timeZone);
  result = guess - tzOffset(result, timeZone);
  return Number.isFinite(result) ? new Date(result) : null;
}

/** UTC ISO → "YYYY-MM-DDTHH:mm" in `timeZone`, for datetime-local inputs. */
export function utcToLocalInput(iso: string | null | undefined, timeZone: string): string {
  if (!iso) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
  }).formatToParts(new Date(iso));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}
