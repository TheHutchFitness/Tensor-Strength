/** Only completed, unambiguous repetitions belong in a strength estimate. */
export function estimateOneRepMax(weight: string, reps: string): number {
  if (!/^\d+(?:\.\d+)?$/.test(weight.trim()) || !/^\d+$/.test(reps.trim())) return 0;
  const w = Number(weight), r = Number(reps);
  if (!Number.isFinite(w) || w <= 0 || r < 1 || r > 12) return 0;
  return Math.round(r === 1 ? w : w * (1 + r / 30));
}

export function bestStrengthEstimate(name: string, sets: { weight: string; reps: string }[]): number {
  // Weight can mean assistance, jump height, or carried load on these movements.
  if (/warm[ -]?up|jump|throw|slam|plank|hang|carry|stretch|mobility|cardio|sprint|run\b|walk|bike|cycle|rowing|assisted|banded/i.test(name)) return 0;
  return sets.reduce((best, set) => Math.max(best, estimateOneRepMax(set.weight, set.reps)), 0);
}

export function localWorkoutDate(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/** Parse current ISO dates plus legacy locale dates without shifting the calendar day. */
export function parseWorkoutDate(value: unknown): Date | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  let year: number, month: number, day: number;
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(text);
  if (iso) {
    [, year, month, day] = iso.map(Number);
  } else {
    const legacy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text);
    if (!legacy) {
      const parsed = new Date(text);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
    const first = Number(legacy[1]);
    const second = Number(legacy[2]);
    year = Number(legacy[3]);
    // Existing Canadian-formatted records use day/month/year. Retain support for
    // unambiguous month/day/year records where the second number exceeds 12.
    if (second > 12 && first <= 12) {
      month = first;
      day = second;
    } else {
      day = first;
      month = second;
    }
  }
  const parsed = new Date(year, month - 1, day);
  return parsed.getFullYear() === year && parsed.getMonth() === month - 1 && parsed.getDate() === day ? parsed : null;
}

/** A target range is a prescription, not a completed set. Allow explicit durations. */
export function isCompletedSet(set: { weight: string; reps: string; rpe: string }): boolean {
  const reps = set.reps.trim();
  const validReps = /^(?:[1-9]\d*|\d+(?:\.\d+)?\s*(?:s|sec|secs|seconds|min|mins|minutes)|\d+:\d{2})$/i.test(reps);
  const weight = set.weight.trim();
  return validReps && (!weight || /^(?:\d+(?:\.\d+)?|bw)$/i.test(weight));
}

export function safeReturnPath(path: string | null, fallback = "/clients"): string {
  if (!path || !path.startsWith("/") || path.startsWith("//") || /[\\\x00-\x20]/.test(path)) return fallback;
  return path;
}
