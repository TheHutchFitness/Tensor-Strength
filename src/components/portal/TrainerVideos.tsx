"use client";

import { useEffect, useState } from "react";
import VideoUploader from "../VideoUploader";

type DemoVideo = {
  id: string;
  title: string;
  description: string;
  category: string;
  url: string;
  clientId: string | null;
  createdAt: string;
};

type ClientLite = { id: string; username: string };

function fmt(d?: string | null) {
  if (!d) return "";
  return new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function TrainerVideos({ clients }: { clients: ClientLite[] }) {
  const [videos, setVideos] = useState<DemoVideo[]>([]);
  const [loading, setLoading] = useState(true);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [scope, setScope] = useState<"global" | string>("global");
  const [url, setUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    const res = await fetch("/api/trainer/videos");
    if (res.ok) {
      const d = await res.json();
      setVideos(d.videos || []);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function save() {
    setError("");
    if (!title.trim()) {
      setError("Give the demo a title.");
      return;
    }
    if (!url) {
      setError("Upload a video first.");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/trainer/videos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description,
        category,
        url,
        clientId: scope === "global" ? null : scope,
      }),
    });
    setSaving(false);
    if (res.ok) {
      setTitle("");
      setDescription("");
      setCategory("");
      setScope("global");
      setUrl("");
      load();
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Could not publish the video.");
    }
  }

  async function del(id: string) {
    if (!confirm("Delete this demo video?")) return;
    const res = await fetch(`/api/trainer/videos?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (res.ok) setVideos((v) => v.filter((x) => x.id !== id));
  }

  const inputCls = "w-full bg-ink/40 border border-bone/20 px-3 py-2.5 text-bone focus:border-electric outline-none text-sm";

  return (
    <div className="grid gap-8">
      {/* Publisher */}
      <div className="border border-electric/30 bg-ink/20 p-5">
        <p className="font-display uppercase tracking-wider text-electric text-sm mb-1">Publish a demo video</p>
        <p className="text-bone/50 text-xs mb-4">
          Upload a technique demo. Global demos show to all your clients; a client-specific demo shows only to that client.
        </p>
        <div className="grid gap-3">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title — e.g. Low-bar squat setup" className={inputCls} />
          <div className="grid sm:grid-cols-2 gap-3">
            <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Category — e.g. Squat, Mobility" className={inputCls} />
            <select value={scope} onChange={(e) => setScope(e.target.value)} className={inputCls}>
              <option value="global">All my clients (global)</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  For: {c.username}
                </option>
              ))}
            </select>
          </div>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Coaching notes / what to watch for (optional)" className={inputCls + " resize-none"} />
          <VideoUploader onUploaded={(u) => setUrl(u)} label="Upload demo video" hint="MP4 / MOV, up to 500MB." />
          {error && <p className="text-xs text-red-400">{error}</p>}
          <button
            onClick={save}
            disabled={saving}
            className="w-fit bg-electric text-ink px-6 py-2.5 font-display uppercase tracking-wider text-sm hover:bg-bone transition-colors disabled:opacity-50"
          >
            {saving ? "Publishing…" : "Publish Demo"}
          </button>
        </div>
      </div>

      {/* Library */}
      <div>
        <p className="font-display uppercase tracking-wider text-xs text-bone/60 mb-4">
          Your library ({videos.length})
        </p>
        {loading ? (
          <p className="font-display uppercase tracking-wider text-bone/50 text-sm">Loading…</p>
        ) : videos.length === 0 ? (
          <div className="border-2 border-dashed border-bone/20 bg-ink/20 p-8 text-center">
            <p className="font-display uppercase tracking-wider text-sm text-bone/50">No demos yet</p>
            <p className="mt-2 text-xs text-bone/40">Publish your first technique demo above.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-5">
            {videos.map((v) => {
              const client = clients.find((c) => c.id === v.clientId);
              return (
                <div key={v.id} className="border border-bone/15 bg-ink/30 p-4">
                  <video src={v.url} controls className="w-full rounded bg-black max-h-56" preload="metadata" />
                  <div className="mt-3 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap gap-2 mb-1">
                        {v.category && (
                          <span className="font-display uppercase tracking-wider text-[10px] text-electric border border-electric/40 px-2 py-0.5">{v.category}</span>
                        )}
                        <span className="font-display uppercase tracking-wider text-[10px] text-bone/60 border border-bone/25 px-2 py-0.5">
                          {v.clientId ? `For: ${client?.username || "client"}` : "Global"}
                        </span>
                      </div>
                      <p className="font-display uppercase tracking-wider text-bone">{v.title}</p>
                      {v.description && <p className="mt-1 text-sm text-bone/60 leading-relaxed">{v.description}</p>}
                      <p className="mt-1 text-[10px] text-bone/40">{fmt(v.createdAt)}</p>
                    </div>
                    <button onClick={() => del(v.id)} title="Delete" className="text-bone/40 hover:text-electric text-sm shrink-0">
                      ✕
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
