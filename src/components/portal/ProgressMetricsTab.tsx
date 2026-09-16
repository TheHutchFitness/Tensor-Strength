"use client";

import { useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Metric = {
  id: string;
  date: string;
  weight?: number | null;
  waist?: number | null;
  chest?: number | null;
  hips?: number | null;
  arms?: number | null;
  thighs?: number | null;
  sleepHrs?: number | null;
  steps?: number | null;
  restingHr?: number | null;
  note?: string;
};

const ELECTRIC = "#33ccff";
const FIELDS: [string, string, string][] = [
  ["weight", "Bodyweight", "lb"],
  ["waist", "Waist", "in"],
  ["chest", "Chest", "in"],
  ["hips", "Hips", "in"],
  ["arms", "Arms", "in"],
  ["thighs", "Thighs", "in"],
  ["sleepHrs", "Sleep", "hrs"],
  ["steps", "Steps", "/day"],
  ["restingHr", "Resting HR", "bpm"],
];
const CHARTS: [string, string][] = [
  ["weight", "Bodyweight"],
  ["waist", "Waist"],
  ["sleepHrs", "Sleep (hrs)"],
  ["steps", "Steps"],
  ["restingHr", "Resting HR"],
];

export default function ProgressMetricsTab({
  metrics,
  onChanged,
}: {
  metrics: Metric[];
  onChanged: () => void;
}) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [f, setF] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const res = await fetch("/api/progress/metrics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, ...f }),
    });
    setSaving(false);
    if (res.ok) {
      setF({});
      onChanged();
    }
  }

  const input =
    "w-full bg-ink/40 border border-bone/20 px-3 py-2.5 text-bone focus:border-electric outline-none text-sm";
  const chartData = (key: string) =>
    metrics
      .filter((m) => m[key as keyof Metric] != null)
      .map((m) => ({ date: m.date.slice(5), value: m[key as keyof Metric] as number }));

  return (
    <div className="grid gap-10">
      <div className="border border-electric/30 bg-ink/20 p-5">
        <p className="font-display uppercase tracking-wider text-electric text-sm mb-4">
          Log today&apos;s numbers
        </p>
        <label className="block mb-3 max-w-[220px]">
          <span className="text-[11px] uppercase tracking-wider text-bone/50">Date</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={input + " mt-1"}
          />
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {FIELDS.map(([key, label, unit]) => (
            <label key={key} className="block">
              <span className="text-[11px] uppercase tracking-wider text-bone/50">
                {label} <span className="text-bone/30">({unit})</span>
              </span>
              <input
                inputMode="decimal"
                value={f[key] || ""}
                onChange={(e) => setF((s) => ({ ...s, [key]: e.target.value }))}
                className={input + " mt-1"}
              />
            </label>
          ))}
        </div>
        <textarea
          value={f.note || ""}
          onChange={(e) => setF((s) => ({ ...s, note: e.target.value }))}
          rows={2}
          placeholder="Notes (optional)"
          className={input + " mt-3 resize-none"}
        />
        <button
          onClick={save}
          disabled={saving}
          className="mt-4 bg-electric text-ink px-6 py-2.5 font-display uppercase tracking-wider text-sm hover:bg-bone transition-colors disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save Metrics"}
        </button>
      </div>

      {metrics.length === 0 ? (
        <div className="border-2 border-dashed border-bone/20 bg-ink/20 p-8 text-center">
          <p className="font-display uppercase tracking-wider text-sm text-bone/50">
            No metrics logged yet
          </p>
          <p className="mt-2 text-xs text-bone/40">
            Log your numbers above and watch the trends build over time.
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-6">
          {CHARTS.map(([key, label]) => {
            const data = chartData(key);
            if (data.length === 0) return null;
            return (
              <div key={key} className="border border-bone/15 bg-ink/30 p-4">
                <p className="font-display uppercase tracking-wider text-bone/70 text-xs mb-3">
                  {label}
                </p>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={data} margin={{ top: 5, right: 10, bottom: 0, left: -20 }}>
                    <CartesianGrid stroke="#ffffff10" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: "#e6e8ec80", fontSize: 10 }}
                      axisLine={{ stroke: "#ffffff20" }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: "#e6e8ec80", fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                      domain={["auto", "auto"]}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "#0c0630",
                        border: `1px solid ${ELECTRIC}`,
                        color: "#e6e8ec",
                        fontSize: 12,
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke={ELECTRIC}
                      strokeWidth={2}
                      dot={{ r: 2, fill: ELECTRIC }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
