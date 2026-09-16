"use client";

import { useState } from "react";
import VideoUploader from "../VideoUploader";

type Reply = {
  id: string;
  authorId: string;
  authorName: string;
  authorRole: "coach" | "member";
  text: string;
  video: string | null;
  createdAt: string;
};

function fmt(d?: string | null) {
  if (!d) return "";
  return new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export default function CoachCheckinReply({
  checkinId,
  video,
  replies,
  meId,
  onReplied,
}: {
  checkinId: string;
  video?: string | null;
  replies?: Reply[];
  meId: string;
  onReplied: () => void;
}) {
  const [text, setText] = useState("");
  const [replyVideo, setReplyVideo] = useState("");
  const [showVid, setShowVid] = useState(false);
  const [sending, setSending] = useState(false);

  async function send() {
    if (!text.trim() && !replyVideo) return;
    setSending(true);
    const res = await fetch("/api/checkins/reply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ checkinId, text, videoUrl: replyVideo || null }),
    });
    setSending(false);
    if (res.ok) {
      setText("");
      setReplyVideo("");
      setShowVid(false);
      onReplied();
    }
  }

  return (
    <div className="mt-4 border-t border-bone/10 pt-4">
      {video && (
        <div className="mb-4">
          <p className="text-[10px] uppercase tracking-wider text-electric mb-2">Form video</p>
          <video src={video} controls className="w-full max-h-72 rounded bg-black" preload="metadata" />
        </div>
      )}

      {replies && replies.length > 0 && (
        <div className="space-y-3 mb-4">
          {replies.map((r) => {
            const mine = r.authorId === meId;
            return (
              <div key={r.id} className={"flex " + (mine ? "justify-end" : "justify-start")}>
                <div className={"max-w-[85%] px-4 py-2.5 " + (r.authorRole === "coach" ? "bg-electric/10 border border-electric/50 text-bone" : "bg-ink/50 border border-bone/15 text-bone")}>
                  <p className={"font-display uppercase tracking-wider text-[10px] mb-1 " + (r.authorRole === "coach" ? "text-electric" : "text-bone/50")}>
                    {r.authorRole === "coach" ? "You (coach)" : r.authorName}
                  </p>
                  {r.video && <video src={r.video} controls className="mb-2 max-h-56 rounded bg-black w-full" preload="metadata" />}
                  {r.text && <p className="text-sm whitespace-pre-wrap leading-relaxed">{r.text}</p>}
                  <p className="text-[10px] text-bone/40 mt-1">{fmt(r.createdAt)}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-[10px] uppercase tracking-wider text-electric mb-2">Reply to client (they can see this)</p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={2}
        placeholder="Feedback, cues, next steps…"
        className="w-full bg-ink/40 border border-bone/20 px-3 py-2 text-bone text-sm focus:border-electric outline-none resize-none"
      />
      {showVid ? (
        <div className="mt-2">
          <VideoUploader onUploaded={(url) => setReplyVideo(url)} label="Record a video reply" hint="MP4 / MOV, up to 500MB." />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowVid(true)}
          className="mt-2 font-display uppercase tracking-wider text-[11px] text-bone/60 border border-bone/25 px-3 py-1.5 hover:border-electric hover:text-electric transition-colors"
        >
          🎥 Add video reply
        </button>
      )}
      <div className="mt-2">
        <button
          onClick={send}
          disabled={sending || (!text.trim() && !replyVideo)}
          className="bg-electric text-ink px-5 py-2 font-display uppercase tracking-wider text-xs hover:bg-bone transition-colors disabled:opacity-50"
        >
          {sending ? "Sending…" : "Send reply"}
        </button>
      </div>
    </div>
  );
}
