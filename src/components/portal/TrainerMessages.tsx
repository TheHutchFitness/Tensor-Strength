"use client";

import { useEffect, useState } from "react";
import MessageThread from "@/components/portal/MessageThread";

type Thread = {
  clientId: string;
  username: string;
  email: string;
  unread: number;
  lastMessage: { body: string; senderRole: string; createdAt: string; mediaType: string | null } | null;
};

export default function TrainerMessages({ meId, onUnreadChange }: { meId: string; onUnreadChange?: () => void }) {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selected, setSelected] = useState<Thread | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    const res = await fetch("/api/trainer/threads");
    if (res.ok) {
      const d = await res.json();
      setThreads(d.threads || []);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 6000);
    return () => clearInterval(t);
  }, []);

  if (loading) return <p className="text-bone/50 text-sm">Loading messages…</p>;

  return (
    <div className="grid md:grid-cols-[300px_1fr] gap-6">
      <div className="border border-bone/15 bg-ink/20">
        <div className="p-4 border-b border-bone/15">
          <p className="font-display uppercase tracking-wider text-xs text-bone/60">Clients</p>
        </div>
        {threads.length === 0 ? (
          <p className="p-6 text-sm text-bone/50">No assigned clients yet.</p>
        ) : (
          <ul>
            {threads.map((t) => (
              <li key={t.clientId}>
                <button
                  onClick={() => setSelected(t)}
                  className={
                    "w-full text-left px-4 py-4 border-b border-bone/10 transition-colors flex items-center justify-between gap-3 " +
                    (selected?.clientId === t.clientId ? "bg-electric/10 border-l-2 border-l-electric" : "hover:bg-ink/40")
                  }
                >
                  <div className="min-w-0">
                    <p className="font-display uppercase tracking-wider text-bone/90 truncate">{t.username}</p>
                    <p className="text-xs text-bone/40 truncate">
                      {t.lastMessage
                        ? (t.lastMessage.senderRole === "trainer" ? "You: " : "") + (t.lastMessage.body || (t.lastMessage.mediaType ? "📎 attachment" : ""))
                        : "No messages yet"}
                    </p>
                  </div>
                  {t.unread > 0 && (
                    <span className="shrink-0 bg-electric text-ink text-[10px] font-display px-2 py-0.5 rounded-full">{t.unread}</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        {!selected ? (
          <div className="border border-bone/15 bg-ink/20 p-10 text-center text-bone/50">Select a client to open the conversation.</div>
        ) : (
          <>
            <p className="font-display uppercase text-xl font-700 text-bone mb-4">
              {selected.username}<span className="text-electric">.</span>
            </p>
            <MessageThread
              withUserId={selected.clientId}
              meId={meId}
              onRead={() => {
                load();
                if (onUnreadChange) onUnreadChange();
              }}
            />
          </>
        )}
      </div>
    </div>
  );
}
