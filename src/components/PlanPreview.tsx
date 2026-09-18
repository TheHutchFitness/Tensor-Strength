"use client";

import { useState } from "react";
import type { PlanItem } from "../lib/programSchedule";

function fmtDate(iso: string) {
  const d = new Date(iso + "T00:00:00Z");
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
}
function mondayMs(iso: string) {
  const d = new Date(iso + "T00:00:00Z");
  const day = d.getUTCDay();
  d.setUTCDate(d.getUTCDate() + (day === 0 ? -6 : 1 - day));
  d.setUTCHours(0, 0, 0, 0);
  return d.getTime();
}

export default function PlanPreview({
  open,
  programName,
  items,
  busy,
  onConfirm,
  onClose,
}: {
  open: boolean;
  programName: string;
  items: PlanItem[];
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const [openIdx, setOpenIdx] = useState<string | null>(null);
  if (!open) return null;

  const base = items.length ? mondayMs(items[0].date) : 0;
  const weekMap = new Map<number, PlanItem[]>();
  items.forEach((it) => {
    const wk = Math.round((mondayMs(it.date) - base) / (7 * 86400000));
    if (!weekMap.has(wk)) weekMap.set(wk, []);
    weekMap.get(wk)!.push(it);
  });
  const weeks = Array.from(weekMap.entries()).sort((a, b) => a[0] - b[0]);
  const first = items[0]?.date ? fmtDate(items[0].date) : "";
  const last = items[items.length - 1]?.date ? fmtDate(items[items.length - 1].date) : "";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-2xl max-h-[88vh] flex flex-col border border-bone/20 bg-ink shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 border-b border-bone/15 p-5">
          <div>
            <p className="font-display uppercase tracking-[0.2em] text-electric text-xs">Preview your 4-week plan</p>
            <h3 className="mt-1 font-display uppercase text-xl text-bone leading-tight">{programName}</h3>
            <p className="mt-1 text-xs text-bone/50">{items.length} sessions · {first}{last ? ` → ${last}` : ""}</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-bone/50 hover:text-bone text-2xl leading-none px-2">×</button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {weeks.map(([wk, days]) => (
            <div key={wk}>
              <p className="font-display uppercase tracking-wider text-[11px] text-bone/45 mb-2">Week {wk + 1}</p>
              <div className="space-y-1.5">
                {days.map((d) => {
                  const key = `${wk}-${d.date}-${d.title}`;
                  const sessionTitle = d.title.startsWith(programName + " — ") ? d.title.slice(programName.length + 3) : d.title;
                  const isOpen = openIdx === key;
                  return (
                    <div key={key} className="border border-bone/12 bg-ink/40">
                      <button
                        onClick={() => setOpenIdx(isOpen ? null : key)}
                        className="w-full flex items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-white/[0.03] transition-colors"
                      >
                        <span className="flex items-center gap-3 min-w-0">
                          <span className="font-display uppercase tracking-wider text-[10px] text-electric whitespace-nowrap w-24 shrink-0">{fmtDate(d.date)}</span>
                          <span className="text-sm text-bone/85 truncate">{sessionTitle}</span>
                        </span>
                        <span className="text-[10px] text-bone/40 whitespace-nowrap">{d.exercises.length} moves {isOpen ? "▲" : "▼"}</span>
                      </button>
                      {isOpen && (
                        <ul className="px-3 pb-3 pt-1 space-y-1 border-t border-bone/10">
                          {d.exercises.map((e, i) => (
                            <li key={i} className="text-xs text-bone/70 flex justify-between gap-3">
                              <span className="truncate">{e.name}</span>
                              <span className="text-bone/45 whitespace-nowrap">{[e.sets, e.reps].filter(Boolean).join(" × ")}{e.load ? ` · ${e.load}` : ""}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          {!items.length && <p className="text-sm text-bone/50">Nothing to preview — pick a start date first.</p>}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-bone/15 p-4">
          <button onClick={onClose} className="border border-bone/25 text-bone/70 px-4 py-2 font-display uppercase tracking-wider text-xs hover:border-bone hover:text-bone transition-colors">Cancel</button>
          <button onClick={onConfirm} disabled={busy || !items.length} className="bg-electric text-ink px-5 py-2 font-display uppercase tracking-wider text-xs hover:bg-bone transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
            {busy ? "Adding…" : "Confirm & add to calendar →"}
          </button>
        </div>
      </div>
    </div>
  );
}
