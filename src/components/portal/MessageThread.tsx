"use client";

import { useEffect, useRef, useState } from "react";

type Message = {
  id: string;
  senderId: string;
  senderRole: "trainer" | "client";
  body: string;
  mediaUrl: string | null;
  mediaType: string | null;
  createdAt: string;
};

export default function MessageThread({
  withUserId,
  meId,
  onRead,
  heightClass = "h-[440px]",
}: {
  withUserId: string;
  meId: string;
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

  async function send(mediaUrl?: string, mediaType?: string) {
    if (!text.trim() && !mediaUrl) return;
    setSending(true);
    setError("");
    const res = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toUserId: withUserId, body: text, mediaUrl, mediaType }),
    });
    if (res.ok) {
      setText("");
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
                  {m.body && <p className="text-sm whitespace-pre-wrap leading-relaxed">{m.body}</p>}
                  <p className={"text-[10px] mt-1 " + (mine ? "text-ink/60" : "text-bone/40")}>
                    {new Date(m.createdAt).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {error && <p className="px-4 text-xs text-red-400">{error}</p>}

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
          disabled={uploading || sending}
          title="Attach a photo, video or PDF"
          className="shrink-0 border border-bone/25 text-bone/70 px-3 py-2.5 font-display text-lg hover:border-electric hover:text-electric transition-colors disabled:opacity-50"
        >
          {uploading ? "…" : "＋"}
        </button>
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
