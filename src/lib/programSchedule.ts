// Builds a multi-week calendar plan from a program's session list so members can
// auto-load a 4-week block onto their calendar. Produces workout_schedule-ready
// items: { date: "YYYY-MM-DD", title, exercises: [{name, sets, reps, load, notes}] }.

export type PlanExercise = { exercise: string; sets: string; reps: string; rpe?: string; notes?: string };
export type PlanSession = { id: string; title: string; exercises: PlanExercise[] };
export type PlanItem = {
  date: string;
  title: string;
  exercises: { name: string; sets: string; reps: string; load: string; notes: string }[];
};

// Training weekday layout (JS getUTCDay: 0=Sun … 6=Sat) keyed by days/week.
function weekdayLayout(daysPerWeek: number): number[] {
  const map: Record<number, number[]> = {
    1: [1],
    2: [1, 4],
    3: [1, 3, 5],
    4: [1, 2, 4, 5],
    5: [1, 2, 3, 4, 6],
    6: [1, 2, 3, 4, 5, 6],
    7: [1, 2, 3, 4, 5, 6, 0],
  };
  return map[Math.max(1, Math.min(7, daysPerWeek))] || [1, 3, 5];
}

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// Monday (UTC) of the week containing the given date.
function mondayOf(d: Date): Date {
  const out = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = out.getUTCDay(); // 0=Sun..6=Sat
  const diff = day === 0 ? -6 : 1 - day;
  out.setUTCDate(out.getUTCDate() + diff);
  return out;
}

export function buildProgramPlan(
  sessions: PlanSession[],
  programName: string,
  daysPerWeek: number,
  weeks: number,
  startDate: string
): PlanItem[] {
  if (!sessions?.length) return [];
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const chosen = /^\d{4}-\d{2}-\d{2}$/.test(startDate) ? new Date(startDate + "T00:00:00Z") : today;
  // Never schedule into the past — anchor to the week of the later of chosen/today.
  const anchor = chosen.getTime() >= today.getTime() ? chosen : today;
  const weekStart = mondayOf(anchor);
  const layout = weekdayLayout(daysPerWeek);

  const items: PlanItem[] = [];
  let sIdx = 0;
  for (let w = 0; w < Math.max(1, weeks); w++) {
    for (const wd of layout) {
      const offset = wd === 0 ? 6 : wd - 1; // days after Monday
      const d = new Date(weekStart);
      d.setUTCDate(d.getUTCDate() + w * 7 + offset);
      if (d.getTime() < today.getTime()) { sIdx++; continue; } // skip past days but keep rotation aligned
      const session = sessions[sIdx % sessions.length];
      sIdx++;
      items.push({
        date: ymd(d),
        title: `${programName} — ${session.title}`,
        exercises: (session.exercises || []).map((e) => ({
          name: e.exercise,
          sets: e.sets || "",
          reps: e.reps || "",
          load: e.rpe ? `RPE ${e.rpe}` : "",
          notes: e.notes || "",
        })),
      });
    }
  }
  return items;
}
