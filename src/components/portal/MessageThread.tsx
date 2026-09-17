"use client";

import { useEffect, useRef, useState } from "react";

type Message = {
  id: string;
  senderId: string;
  senderRole: "trainer" | "client";
  body: string;
  mediaUrl: string | null;
  mediaType: string | null;
  read?: boolean;
  readAt?: string | null;
  context?: MessageContext | null;
  createdAt: string;
};

export type MessageContext = {
  kind?: "workout" | "form_review" | "checkin" | "general";
  title?: string;
  details?: string;
};

export default function MessageThread({
  withUserId,
  meId,
  initialText = "",
  initialContext,
  onRead,
  heightClass = "h-[440px]",
}: {
  withUserId: string;
  meId: string;
  initialText?: string;
  initialContext?: MessageContext | null;
  onRead?: () => void;
  heightClass?: string;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<any>(null);
  const [recording, setRecording] = useState(false);
  const appliedInitialText = useRef("");
  const [recSecs, setRecSecs] = useState(0);
  const [pendingContext, setPendingContext] = useState<MessageContext | null>(initialContext || null);
  const appliedContext = useRef("");
  const MAX_SECS = 120; // keep voice notes short & snappy

  async function load(scroll = false) {
    const res = await fetch(`/api/messages?withUserId=${encodeURIComponent(withUserId)}`);
    if (res.ok) {
      const data = await res.json();
      setMessages(data.messages || []);
      if (onRead) onRead();
      if (scroll) {
        setTimeout(() => {
          scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
        }, 50);
      }
    }
  }

  useEffect(() => {
    load(true);
    const t = setInterval(() => load(false), 5000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [withUserId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages.length]);

  useEffect(() => {
    if (initialText && appliedInitialText.current !== initialText) {
      setText((current) => current || initialText);
      appliedInitialText.current = initialText;
    }
  }, [initialText]);

  useEffect(() => {
    const key = initialContext ? JSON.stringify(initialContext) : "";
    if (key && appliedContext.current !== key) {
      setPendingContext(initialContext || null);
      appliedContext.current = key;
    }
  }, [initialContext]);

  async function send(mediaUrl?: string, mediaType?: string) {
    if (!text.trim() && !mediaUrl) return;
    setSending(true);
    setError("");
    const res = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toUserId: withUserId, body: text, mediaUrl, mediaType, context: pendingContext }),
    });
    if (res.ok) {
      setText("");
      setPendingContext(null);
      await load(true);
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Could not send message.");
    }
    setSending(false);
  }

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
    const res = await fetch("/api/uploads/file", { method: "POST", body: fd });
    if (res.ok) {
      const d = await res.json();
      const isVid = (d.mime || "").startsWith("video/");
      const isImg = (d.mime || "").startsWith("image/");
      await send(d.url, isVid ? "video" : isImg ? "image" : "file");
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Upload failed.");
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function uploadBlob(blob: Blob, filename: string, mediaType: string) {
    setUploading(true);
    setError("");
    const fd = new FormData();
    fd.append("file", new File([blob], filename, { type: blob.type || "audio/webm" }));
    const res = await fetch("/api/uploads/file", { method: "POST", body: fd });
    if (res.ok) {
      const d = await res.json();
      await send(d.url, mediaType);
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Upload failed.");
    }
    setUploading(false);
  }

  async function toggleRecord() {
    if (recording) {
      recorderRef.current?.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size) chunksRef.current.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
        setRecording(false);
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" });
        if (blob.size > 0) await uploadBlob(blob, "voice-note.webm", "audio");
      };
      recorderRef.current = mr;
      mr.start();
      setRecording(true);
      setRecSecs(0);
      timerRef.current = setInterval(() => {
        setRecSecs((s) => {
          const n = s + 1;
          if (n >= MAX_SECS) { try { recorderRef.current?.stop(); } catch {} }
          return n;
        });
      }, 1000);
    } catch {
      setError("Microphone access is needed to record a voice note.");
    }
  }

  return (
    <div className="border border-bone/15 bg-ink/20 flex flex-col">
      <div ref={scrollRef} className={"overflow-y-auto p-4 space-y-3 " + heightClass}>
        {messages.length === 0 ? (
          <p className="text-center text-bone/40 text-sm py-8">
            No messages yet. Say hello 👋
          </p>
        ) : (
          messages.map((m) => {
            const mine = m.senderId === meId;
            return (
              <div key={m.id} className={"flex " + (mine ? "justify-end" : "justify-start")}>
                <div
                  className={
                    "max-w-[80%] px-4 py-2.5 " +
                    (mine
                      ? "bg-electric text-ink"
                      : "border border-bone/20 bg-ink/40 text-bone")
                  }
                >
                  {m.mediaUrl && m.mediaType === "image" && (
                    <img src={m.mediaUrl} alt="" className="max-h-56 rounded mb-2" />
                  )}
                  {m.mediaUrl && m.mediaType === "video" && (
                    <video src={m.mediaUrl} controls className="max-h-56 rounded mb-2" />
                  )}
                  {m.mediaUrl && m.mediaType === "audio" && (
                    <audio src={m.mediaUrl} controls className="w-56 max-w-full mb-2" />
                  )}
                  {m.mediaUrl && m.mediaType === "file" && (
                    <a
                      href={m.mediaUrl}
                      target="_blank"
                      rel="noreferrer"
                      className={"underline text-sm block mb-1 " + (mine ? "text-ink" : "text-electric")}
                    >
                      📎 Download attachment
                    </a>
                  )}
                  {m.context?.title && (
                    <div className={"mb-2 border-l-2 px-2 py-1 text-[10px] uppercase tracking-wider " + (mine ? "border-ink/50 text-ink/70" : "border-electric text-electric")}>
                      <p>{m.context.kind === "form_review" ? "Form review" : m.context.kind === "workout" ? "Workout question" : "Coaching context"} · {m.context.title}</p>
                      {m.context.details && <p className={"mt-0.5 normal-case tracking-normal " + (mine ? "text-ink/70" : "text-bone/55")}>{m.context.details}</p>}
                    </div>
                  )}
                  {m.body && <p className="text-sm whitespace-pre-wrap leading-relaxed">{m.body}</p>}
                  <p className={"text-[10px] mt-1 " + (mine ? "text-ink/60" : "text-bone/40")}>
                    {new Date(m.createdAt).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                    {mine && <span>{m.read ? " · Seen" : " · Reply pending"}</span>}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {error && <p className="px-4 text-xs text-red-400">{error}</p>}

      {pendingContext?.title && (
        <div className="mx-3 mt-3 flex items-center justify-between gap-3 border border-electric/30 bg-electric/5 px-3 py-2 text-xs">
          <span className="text-bone/70">Sending with context: <span className="text-electric">{pendingContext.title}</span></span>
          <button type="button" onClick={() => setPendingContext(null)} className="text-bone/50 hover:text-electric" aria-label="Remove message context">✕</button>
        </div>
      )}

      <div className="border-t border-bone/15 p-3 flex items-end gap-2">
        <input
          ref={fileRef}
          type="file"
          accept="image/*,video/*,application/pdf"
          onChange={onPickFile}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading || sending || recording}
          title="Attach a photo, video or PDF"
          className="shrink-0 border border-bone/25 text-bone/70 px-3 py-2.5 font-display text-lg hover:border-electric hover:text-electric transition-colors disabled:opacity-50"
        >
          {uploading ? "…" : "＋"}
        </button>
        <button
          type="button"
          onClick={toggleRecord}
          disabled={uploading || sending}
          title={recording ? "Stop & send voice note" : "Record a voice note"}
          className={"shrink-0 border px-3 py-2.5 font-display text-lg transition-colors disabled:opacity-50 " + (recording ? "border-red-500 text-red-400 animate-pulse" : "border-bone/25 text-bone/70 hover:border-electric hover:text-electric")}
        >
          {recording ? "⏹" : "🎙"}
        </button>
        {recording && (
          <span className="shrink-0 flex items-center gap-1.5 text-xs font-display text-red-400 tabular-nums" title="Recording — auto-stops at 2:00">
            <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
            {`${Math.floor(recSecs / 60)}:${String(recSecs % 60).padStart(2, "0")}`}
            <span className="text-bone/40">/ 2:00</span>
          </span>
        )}
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          rows={1}
          placeholder="Type a message…"
          className="flex-1 bg-ink/40 border border-bone/20 px-3 py-2.5 text-bone focus:border-electric outline-none resize-none"
        />
        <button
          type="button"
          onClick={() => send()}
          disabled={sending || uploading || !text.trim()}
          className="shrink-0 bg-electric text-ink px-5 py-2.5 font-display uppercase tracking-wider text-sm hover:bg-bone transition-colors disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </div>
  );
}
