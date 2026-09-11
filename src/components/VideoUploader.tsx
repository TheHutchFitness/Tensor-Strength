"use client";

import { useRef, useState } from "react";

const CHUNK_SIZE = 4 * 1024 * 1024; // 4MB — stays well under proxy body limits
const MAX_SIZE = 500 * 1024 * 1024; // 500MB hard cap (matches backend)
const ALLOWED = ["mp4", "mov", "webm", "m4v"];

export default function VideoUploader({
  onUploaded,
  label = "Add a form video",
  hint = "Record on your phone, then drop it here. MP4 / MOV, up to 500MB.",
}: {
  onUploaded: (url: string, mime: string) => void;
  label?: string;
  hint?: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [doneUrl, setDoneUrl] = useState<string>("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setDoneUrl("");
    const ext = (file.name.split(".").pop() || "").toLowerCase();
    if (!ALLOWED.includes(ext)) {
      setError("Use an MP4, MOV, WEBM or M4V video.");
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    if (file.size > MAX_SIZE) {
      setError("That video is too large (max 500MB).");
      if (fileRef.current) fileRef.current.value = "";
      return;
    }

    setUploading(true);
    setProgress(0);
    try {
      // 1) init
      const initRes = await fetch("/api/uploads/video/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, mime: file.type || "video/mp4" }),
      });
      const initData = await initRes.json();
      if (!initRes.ok) throw new Error(initData.error || "Could not start upload.");
      const uploadId = initData.uploadId as string;

      // 2) append chunks
      const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const blob = file.slice(start, start + CHUNK_SIZE);
        const fd = new FormData();
        fd.append("uploadId", uploadId);
        fd.append("index", String(i));
        fd.append("chunk", blob, "chunk");
        const partRes = await fetch("/api/uploads/video/append", { method: "POST", body: fd });
        if (!partRes.ok) {
          const d = await partRes.json().catch(() => ({}));
          throw new Error(d.error || "Upload interrupted. Try again.");
        }
        setProgress(Math.round(((i + 1) / totalChunks) * 95));
      }

      // 3) complete
      const compRes = await fetch("/api/uploads/video/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uploadId }),
      });
      const compData = await compRes.json();
      if (!compRes.ok) throw new Error(compData.error || "Could not finish upload.");
      setProgress(100);
      setDoneUrl(compData.url);
      onUploaded(compData.url, compData.mime || file.type || "video/mp4");
    } catch (err: any) {
      setError(err?.message || "Upload failed.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="border-2 border-dashed border-bone/25 bg-ink/20 p-5">
      <input
        ref={fileRef}
        type="file"
        accept="video/mp4,video/quicktime,video/webm,video/x-m4v,.mp4,.mov,.webm,.m4v"
        onChange={handleFile}
        className="hidden"
        disabled={uploading}
      />
      {doneUrl ? (
        <div>
          <p className="font-display uppercase tracking-wider text-xs text-electric mb-3">Video attached ✓</p>
          <video src={doneUrl} controls className="w-full max-h-64 rounded bg-black" />
          <button
            type="button"
            onClick={() => {
              setDoneUrl("");
              onUploaded("", "");
            }}
            className="mt-3 font-display uppercase tracking-wider text-[11px] text-bone/60 border border-bone/25 px-3 py-1.5 hover:border-electric hover:text-electric transition-colors"
          >
            Remove
          </button>
        </div>
      ) : uploading ? (
        <div>
          <p className="font-display uppercase tracking-wider text-xs text-bone/70">Uploading… {progress}%</p>
          <div className="mt-3 h-2 w-full bg-bone/10 overflow-hidden rounded">
            <div className="h-full bg-electric transition-all" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-2 text-[11px] text-bone/40">Keep this tab open until it finishes.</p>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="w-full text-left"
        >
          <p className="font-display uppercase tracking-wider text-sm text-electric">🎥 {label}</p>
          <p className="mt-1.5 text-xs text-bone/50 leading-relaxed">{hint}</p>
        </button>
      )}
      {error && <p className="mt-3 text-xs text-red-400">{error}</p>}
    </div>
  );
}
