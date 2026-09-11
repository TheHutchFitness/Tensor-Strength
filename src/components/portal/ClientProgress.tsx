"use client";

import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

const ELECTRIC = "#33ccff";

type Photo = { id: string; date: string; front: string | null; side: string | null; back: string | null; weight: string; note: string };
type Metric = { id: string; date: string; weight?: number | null; waist?: number | null; sleepHrs?: number | null; steps?: number | null; restingHr?: number | null };

export default function ClientProgress({ clientId }: { clientId: string }) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    Promise.all([
      fetch(`/api/trainer/progress-photos?clientId=${encodeURIComponent(clientId)}`).then((r) => (r.ok ? r.json() : { photos: [] })),
      fetch(`/api/trainer/progress-metrics?clientId=${encodeURIComponent(clientId)}`).then((r) => (r.ok ? r.json() : { metrics: [] })),
    ]).then(([p, m]) => {
      if (!alive) return;
      setPhotos(p.photos || []);
      setMetrics(m.metrics || []);
      setLoading(false);
    });
    return () => { alive = false; };
  }, [clientId]);

  if (loading) return <p className="text-bone/50 text-sm">Loading progress…</p>;
  if (photos.length === 0 && metrics.length === 0) {
    return <p className="text-bone/40 text-sm">No progress photos or metrics logged yet.</p>;
  }

  const chartData = (key: string) => metrics.filter((m) => m[key as keyof Metric] != null).map((m) => ({ date: m.date.slice(5), value: m[key as keyof Metric] as number }));
  const CHARTS: [string, string][] = [["weight", "Bodyweight"], ["waist", "Waist"], ["sleepHrs", "Sleep"], ["restingHr", "Resting HR"]];
  const first = photos[0];
  const last = photos[photos.length - 1];

  return (
    <div className="grid gap-6">
      <a
        href={`/api/trainer/progress-report?clientId=${encodeURIComponent(clientId)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="w-fit border border-electric text-electric px-4 py-2 font-display uppercase tracking-wider text-xs hover:bg-electric hover:text-ink transition-colors"
      >
        ⬇ Progress report (PDF)
      </a>
      {photos.length > 0 && (
        <div>
          <p className="font-display uppercase tracking-wider text-electric text-xs mb-2">Progress photos ({photos.length})</p>
          {photos.length >= 2 && (
            <div className="grid grid-cols-3 gap-2 mb-3">
              {(["front", "side", "back"] as const).map((pose) => (
                <div key={pose} className="border border-bone/15 bg-ink/30 p-2">
                  <p className="text-[9px] uppercase tracking-wider text-bone/40 text-center mb-1">{pose} · then → now</p>
                  <div className="grid grid-cols-2 gap-1">
                    {first[pose] ? <img src={first[pose] as string} className="w-full h-28 object-cover rounded bg-black" /> : <div className="w-full h-28 bg-ink/50 rounded" />}
                    {last[pose] ? <img src={last[pose] as string} className="w-full h-28 object-cover rounded bg-black" /> : <div className="w-full h-28 bg-ink/50 rounded" />}
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {[...photos].reverse().map((p) => (
              <div key={p.id} className="shrink-0 w-24">
                {p.front ? <img src={p.front} className="w-24 h-28 object-cover rounded bg-black" /> : <div className="w-24 h-28 bg-ink/50 rounded" />}
                <p className="text-[9px] text-bone/50 text-center mt-1">{p.date.slice(5)}{p.weight ? ` · ${p.weight}` : ""}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {metrics.length > 0 && (
        <div>
          <p className="font-display uppercase tracking-wider text-electric text-xs mb-2">Body metrics ({metrics.length})</p>
          <div className="grid sm:grid-cols-2 gap-4">
            {CHARTS.map(([key, label]) => {
              const data = chartData(key);
              if (data.length === 0) return null;
              return (
                <div key={key} className="border border-bone/15 bg-ink/30 p-3">
                  <p className="font-display uppercase tracking-wider text-bone/70 text-[11px] mb-2">{label}</p>
                  <ResponsiveContainer width="100%" height={140}>
                    <LineChart data={data} margin={{ top: 5, right: 10, bottom: 0, left: -20 }}>
                      <CartesianGrid stroke="#ffffff10" vertical={false} />
                      <XAxis dataKey="date" tick={{ fill: "#e6e8ec80", fontSize: 9 }} axisLine={{ stroke: "#ffffff20" }} tickLine={false} />
                      <YAxis tick={{ fill: "#e6e8ec80", fontSize: 9 }} axisLine={false} tickLine={false} domain={["auto", "auto"]} />
                      <Tooltip contentStyle={{ background: "#0c0630", border: `1px solid ${ELECTRIC}`, color: "#e6e8ec", fontSize: 11 }} />
                      <Line type="monotone" dataKey="value" stroke={ELECTRIC} strokeWidth={2} dot={{ r: 2, fill: ELECTRIC }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
