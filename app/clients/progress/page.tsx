"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import PortalHeader from "../../../src/components/portal/PortalHeader";

const MetricsTab = dynamic(() => import("../../../src/components/portal/ProgressMetricsTab"), {
  loading: () => <p className="font-display uppercase tracking-wider text-bone/50">Loading metrics…</p>,
});

type Photo = { id: string; date: string; front: string | null; side: string | null; back: string | null; weight: string; note: string; createdAt: string };
type Metric = { id: string; date: string; weight?: number | null; waist?: number | null; chest?: number | null; hips?: number | null; arms?: number | null; thighs?: number | null; sleepHrs?: number | null; steps?: number | null; restingHr?: number | null; note?: string };

async function uploadImage(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/uploads/file", { method: "POST", body: fd });
  if (!res.ok) {
    const d = await res.json().catch(() => ({}));
    throw new Error(d.error || "Upload failed");
  }
  const d = await res.json();
  return d.url as string;
}

export default function ProgressPage() {
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"photos" | "metrics">("photos");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [metrics, setMetrics] = useState<Metric[]>([]);

  async function load() {
    const [p, m] = await Promise.all([
      fetch("/api/progress/photos").then((r) => (r.ok ? r.json() : { photos: [] })),
      fetch("/api/progress/metrics").then((r) => (r.ok ? r.json() : { metrics: [] })),
    ]);
    setPhotos(p.photos || []);
    setMetrics(m.metrics || []);
  }

  useEffect(() => {
    (async () => {
      const me = await fetch("/api/auth/me");
      if (!me.ok) { window.location.href = "/login?from=/clients/progress"; return; }
      const { user } = await me.json();
      if (!user.portalAccess) { window.location.href = "/clients"; return; }
      await load();
      setLoading(false);
    })();
  }, []);

  return (
    <main className="text-bone min-h-screen">
      <PortalHeader />
      <div className="mx-auto max-w-4xl px-6 py-10 md:py-16">
        <p className="glow font-display uppercase tracking-[0.3em] text-electric text-sm mb-4">Your Progress</p>
        <h1 className="glow font-display uppercase text-4xl md:text-5xl font-700 leading-tight">
          Track the <span className="text-electric">transformation.</span>
        </h1>
        <p className="mt-4 text-bone/70 leading-relaxed max-w-xl">
          Log weekly photos and body metrics. Everything is private to you and your coach — compare where you started to where you are now.
        </p>
        <a
          href="/api/progress/report"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block mt-4 border-2 border-electric text-electric px-5 py-2.5 font-display uppercase tracking-wider text-sm hover:bg-electric hover:text-ink transition-colors"
        >
          ⬇ Download progress report (PDF)
        </a>

        <div className="flex gap-2 mt-8 mb-8 border-b border-bone/15 pb-2">
          {([["photos", "Progress Photos"], ["metrics", "Body Metrics"]] as const).map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)}
              className={"px-5 py-3 font-display uppercase tracking-wider text-sm transition-colors " + (tab === id ? "bg-electric text-ink" : "text-bone/60 hover:text-electric border border-transparent hover:border-bone/20")}>
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="font-display uppercase tracking-wider text-bone/50">Loading…</p>
        ) : tab === "photos" ? (
          <PhotosTab photos={photos} onChanged={load} />
        ) : (
          <MetricsTab metrics={metrics} onChanged={load} />
        )}
      </div>
    </main>
  );
}

function PhotosTab({ photos, onChanged }: { photos: Photo[]; onChanged: () => void }) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [weight, setWeight] = useState("");
  const [note, setNote] = useState("");
  const [files, setFiles] = useState<{ front?: File; side?: File; back?: File }>({});
  const [shareForum, setShareForum] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Then/now comparison selection
  const [aId, setAId] = useState("");
  const [bId, setBId] = useState("");
  useEffect(() => {
    if (photos.length && !aId && !bId) {
      setAId(photos[0].id);
      setBId(photos[photos.length - 1].id);
    }
  }, [photos]); // eslint-disable-line react-hooks/exhaustive-deps

  const a = photos.find((p) => p.id === aId);
  const b = photos.find((p) => p.id === bId);

  function pick(pose: "front" | "side" | "back", f?: File) {
    setFiles((s) => ({ ...s, [pose]: f }));
  }

  async function save() {
    setError("");
    if (!files.front && !files.side && !files.back) { setError("Add at least one photo."); return; }
    setSaving(true);
    try {
      const urls: any = {};
      for (const pose of ["front", "side", "back"] as const) {
        if (files[pose]) urls[pose] = await uploadImage(files[pose]!);
      }
      const res = await fetch("/api/progress/photos", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, weight, note, ...urls }),
      });
      if (!res.ok) throw new Error("Could not save entry.");
      // Optional: share front to the community forum (public copy)
      if (shareForum && files.front) {
        try {
          const fd = new FormData();
          fd.append("file", files.front);
          const up = await fetch("/api/forum/upload", { method: "POST", body: fd });
          if (up.ok) {
            const media = await up.json();
            await fetch("/api/forum/posts", {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ title: "Progress update 💪", body: note || `Progress as of ${date}.`, category: "Wins", mediaUrl: media.url, mediaType: "image" }),
            });
          }
        } catch { /* non-blocking */ }
      }
      setWeight(""); setNote(""); setFiles({}); setShareForum(false);
      onChanged();
    } catch (e: any) {
      setError(e?.message || "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  async function del(id: string) {
    if (!confirm("Delete this progress entry?")) return;
    const res = await fetch(`/api/progress/photos?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (res.ok) onChanged();
  }

  const input = "w-full bg-ink/40 border border-bone/20 px-3 py-2.5 text-bone focus:border-electric outline-none text-sm";

  return (
    <div className="grid gap-10">
      {/* New entry */}
      <div className="border border-electric/30 bg-ink/20 p-5">
        <p className="font-display uppercase tracking-wider text-electric text-sm mb-4">New photo entry</p>
        <div className="grid sm:grid-cols-2 gap-3 mb-4">
          <label className="block"><span className="text-[11px] uppercase tracking-wider text-bone/50">Date</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={input + " mt-1"} /></label>
          <label className="block"><span className="text-[11px] uppercase tracking-wider text-bone/50">Bodyweight (optional)</span>
            <input value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="e.g. 185 lb" className={input + " mt-1"} /></label>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {(["front", "side", "back"] as const).map((pose) => (
            <PosePicker key={pose} pose={pose} file={files[pose]} onPick={(f) => pick(pose, f)} />
          ))}
        </div>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="How are you feeling? Notes for your coach…" className={input + " mt-3 resize-none"} />
        <label className="flex items-center gap-2 text-sm text-bone/70 mt-3">
          <input type="checkbox" checked={shareForum} onChange={(e) => setShareForum(e.target.checked)} /> Also share my front photo to the Community Forum
        </label>
        {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
        <button onClick={save} disabled={saving} className="mt-4 bg-electric text-ink px-6 py-2.5 font-display uppercase tracking-wider text-sm hover:bg-bone transition-colors disabled:opacity-50">
          {saving ? "Saving…" : "Save Entry"}
        </button>
      </div>

      {/* Then vs Now */}
      {photos.length >= 1 && (
        <div>
          <p className="font-display uppercase tracking-wider text-electric text-sm mb-3">Then vs Now</p>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <label className="block"><span className="text-[11px] uppercase tracking-wider text-bone/50">Then</span>
              <select value={aId} onChange={(e) => setAId(e.target.value)} className={input + " mt-1"}>
                {photos.map((p) => <option key={p.id} value={p.id}>{p.date}{p.weight ? ` · ${p.weight}` : ""}</option>)}
              </select></label>
            <label className="block"><span className="text-[11px] uppercase tracking-wider text-bone/50">Now</span>
              <select value={bId} onChange={(e) => setBId(e.target.value)} className={input + " mt-1"}>
                {photos.map((p) => <option key={p.id} value={p.id}>{p.date}{p.weight ? ` · ${p.weight}` : ""}</option>)}
              </select></label>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {(["front", "side", "back"] as const).map((pose) => (
              <div key={pose} className="border border-bone/15 bg-ink/30 p-2">
                <p className="text-[10px] uppercase tracking-wider text-bone/50 text-center mb-2">{pose}</p>
                <div className="grid grid-cols-2 gap-2">
                  <Compare label="Then" url={a?.[pose] || null} />
                  <Compare label="Now" url={b?.[pose] || null} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Timeline */}
      <div>
        <p className="font-display uppercase tracking-wider text-bone/60 text-xs mb-3">Timeline ({photos.length})</p>
        {photos.length === 0 ? (
          <div className="border-2 border-dashed border-bone/20 bg-ink/20 p-8 text-center">
            <p className="font-display uppercase tracking-wider text-sm text-bone/50">No photos yet</p>
            <p className="mt-2 text-xs text-bone/40">Add your first entry above to start your visual timeline.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {[...photos].reverse().map((p) => (
              <div key={p.id} className="border border-bone/15 bg-ink/30 p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="font-display uppercase tracking-wider text-bone">{p.date}{p.weight ? <span className="text-electric"> · {p.weight}</span> : null}</p>
                  <button onClick={() => del(p.id)} title="Delete" className="text-bone/40 hover:text-electric text-sm">✕</button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {(["front", "side", "back"] as const).map((pose) => (
                    <div key={pose}>
                      <p className="text-[10px] uppercase tracking-wider text-bone/40 mb-1 text-center">{pose}</p>
                      {p[pose] ? <img src={p[pose] as string} alt={pose} className="w-full h-40 object-cover rounded bg-black" /> : <div className="w-full h-40 rounded bg-ink/50 border border-bone/10" />}
                    </div>
                  ))}
                </div>
                {p.note && <p className="mt-2 text-sm text-bone/60">{p.note}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PosePicker({ pose, file, onPick }: { pose: string; file?: File; onPick: (f?: File) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const url = useMemo(() => (file ? URL.createObjectURL(file) : ""), [file]);
  return (
    <div className="border-2 border-dashed border-bone/25 bg-ink/20 p-2 text-center">
      <p className="text-[10px] uppercase tracking-wider text-bone/50 mb-2">{pose}</p>
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={(e) => onPick(e.target.files?.[0])} />
      {url ? (
        <img src={url} alt={pose} className="w-full h-28 object-cover rounded cursor-pointer" onClick={() => ref.current?.click()} />
      ) : (
        <button type="button" onClick={() => ref.current?.click()} className="w-full h-28 rounded bg-ink/40 border border-bone/10 text-2xl text-bone/40 hover:text-electric">＋</button>
      )}
    </div>
  );
}

function Compare({ label, url }: { label: string; url: string | null }) {
  return (
    <div>
      <p className="text-[9px] uppercase tracking-wider text-bone/40 text-center mb-1">{label}</p>
      {url ? <img src={url} alt={label} className="w-full h-40 object-cover rounded bg-black" /> : <div className="w-full h-40 rounded bg-ink/50 border border-bone/10" />}
    </div>
  );
}
