"use client";

import { useEffect, useRef, useState } from "react";

type Client = { id: string; username: string };
type TFile = {
  id: string;
  name: string;
  url: string;
  size: number;
  clientId: string | null;
  createdAt: string;
};

function fmtSize(b: number) {
  if (!b) return "";
  if (b < 1024 * 1024) return Math.round(b / 1024) + " KB";
  return (b / (1024 * 1024)).toFixed(1) + " MB";
}

export default function TrainerFiles() {
  const [clients, setClients] = useState<Client[]>([]);
  const [files, setFiles] = useState<TFile[]>([]);
  const [assignTo, setAssignTo] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function load() {
    const [c, f] = await Promise.all([
      fetch("/api/trainer/clients").then((r) => (r.ok ? r.json() : { clients: [] })),
      fetch("/api/trainer/files").then((r) => (r.ok ? r.json() : { files: [] })),
    ]);
    setClients(c.clients || []);
    setFiles(f.files || []);
  }

  useEffect(() => {
    load();
  }, []);

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) {
      setError("File too large (max 50MB).");
      return;
    }
    setUploading(true);
    setError("");
    const fd = new FormData();
    fd.append("file", file);
    const up = await fetch("/api/uploads/file", { method: "POST", body: fd });
    if (!up.ok) {
      setError("Upload failed.");
      setUploading(false);
      return;
    }
    const d = await up.json();
    const res = await fetch("/api/trainer/files", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: d.name, url: d.url, size: d.size, mime: d.mime, clientId: assignTo || null }),
    });
    if (!res.ok) {
      const dd = await res.json().catch(() => ({}));
      setError(dd.error || "Could not save file.");
    } else {
      await load();
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function del(id: string) {
    if (!confirm("Delete this file?")) return;
    await fetch(`/api/trainer/files?id=${id}`, { method: "DELETE" });
    await load();
  }

  const labelCls = "text-[10px] uppercase tracking-wider text-bone/50";
  const clientName = (id: string | null) => (id ? clients.find((c) => c.id === id)?.username || "client" : "All clients");

  return (
    <div className="grid gap-8">
      <div className="border border-bone/15 bg-ink/20 p-6 grid gap-4">
        <p className="font-display uppercase tracking-wider text-electric text-sm">Drop a file for your clients</p>
        <div className="grid sm:grid-cols-[1fr_auto] gap-3 items-end">
          <label className="block">
            <span className={labelCls}>Share with</span>
            <select value={assignTo} onChange={(e) => setAssignTo(e.target.value)} className="w-full bg-ink/60 border border-bone/20 px-3 py-2.5 text-bone mt-1 focus:border-electric outline-none">
              <option value="">All my clients</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.username}</option>
              ))}
            </select>
          </label>
          <input ref={fileRef} type="file" onChange={onPickFile} className="hidden" />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="bg-electric text-ink px-6 py-2.5 font-display uppercase tracking-wider hover:bg-bone transition-colors disabled:opacity-60 whitespace-nowrap"
          >
            {uploading ? "Uploading…" : "Upload File"}
          </button>
        </div>
        <p className={labelCls}>PDF, images, video or docs — up to 50MB.</p>
        {error && <p className="text-red-400 text-sm">{error}</p>}
      </div>

      <div>
        <p className="font-display uppercase tracking-wider text-bone/60 text-sm mb-4">Shared files ({files.length})</p>
        {files.length === 0 ? (
          <p className="text-bone/50 text-sm">No files uploaded yet.</p>
        ) : (
          <div className="grid gap-3">
            {files.map((f) => (
              <div key={f.id} className="flex items-center justify-between gap-4 border border-bone/15 bg-ink/20 p-4">
                <a href={f.url} target="_blank" rel="noreferrer" download className="flex items-center gap-3 min-w-0 group">
                  <span className="text-electric font-display text-lg shrink-0">📄</span>
                  <div className="min-w-0">
                    <p className="font-display uppercase tracking-wider text-bone/90 text-sm truncate group-hover:text-electric">{f.name}</p>
                    <p className="text-[10px] uppercase tracking-wider text-bone/40">{clientName(f.clientId)} {f.size ? `· ${fmtSize(f.size)}` : ""}</p>
                  </div>
                </a>
                <button onClick={() => del(f.id)} className="text-bone/40 hover:text-electric text-sm shrink-0">Delete</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
