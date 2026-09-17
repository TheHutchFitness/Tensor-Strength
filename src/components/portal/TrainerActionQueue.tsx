"use client";

import { useEffect, useMemo, useState } from "react";
import MessageThread, { type MessageContext } from "./MessageThread";

type Action = {
  id: string;
  type: "message" | "form_review" | "checkin" | "nudge";
  priority: number;
  clientId: string;
  username: string;
  createdAt: string | null;
  title: string;
  detail: string;
  context?: MessageContext | null;
  checkinId?: string;
  hasVideo?: boolean;
};

function age(value: string | null) {
  if (!value) return "No activity yet";
  const mins = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
  if (mins < 60) return `${mins || 1}m ago`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
  return `${Math.floor(mins / 1440)}d ago`;
}

export default function TrainerActionQueue({
  meId,
  onOpenClient,
}: {
  meId: string;
  onOpenClient: (clientId: string) => void;
}) {
  const [actions, setActions] = useState<Action[]>([]);
  const [selected, setSelected] = useState<Action | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    const res = await fetch("/api/trainer/action-queue");
    if (res.ok) {
      const data = await res.json();
      setActions(data.actions || []);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
    const timer = setInterval(load, 15000);
    return () => clearInterval(timer);
  }, []);

  const counts = useMemo(() => ({
    urgent: actions.filter((a) => a.priority <= 1).length,
    messages: actions.filter((a) => a.type === "message").length,
  }), [actions]);

  if (loading) return <p className="text-bone/50 font-display uppercase tracking-wider text-sm">Loading action queue…</p>;

  return (
    <div className="grid gap-5">
      <div className="border-l-2 border-electric/50 pl-4">
        <p className="font-display uppercase tracking-wider text-electric text-sm">Action queue</p>
        <p className="mt-1 text-sm text-bone/60 leading-relaxed">One place for messages, form reviews, check-ins and clients who may need a nudge.</p>
        <p className="mt-2 text-[10px] uppercase tracking-wider text-bone/45">{counts.urgent} priority · {counts.messages} unread message{counts.messages === 1 ? "" : "s"}</p>
      </div>

      {actions.length === 0 ? (
        <div className="border border-electric/30 bg-electric/5 p-7 text-center">
          <p className="font-display uppercase tracking-wider text-electric">You&apos;re caught up.</p>
          <p className="mt-2 text-sm text-bone/60">No new coaching actions need attention right now.</p>
        </div>
      ) : (
        <div className="grid lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-5">
          <div className="border border-bone/15 bg-ink/20 divide-y divide-bone/10 max-h-[620px] overflow-y-auto">
            {actions.map((action) => (
              <button
                key={action.id}
                type="button"
                onClick={() => setSelected(action)}
                className={"w-full text-left p-4 transition-colors " + (selected?.id === action.id ? "bg-electric/10 border-l-2 border-l-electric" : "hover:bg-ink/40")}
              >
                <div className="flex justify-between gap-3">
                  <p className="font-display uppercase tracking-wider text-bone text-sm">{action.username}</p>
                  <span className={"shrink-0 text-[10px] uppercase tracking-wider " + (action.priority <= 1 ? "text-electric" : "text-bone/40")}>{action.type.replace("_", " ")}</span>
                </div>
                <p className="mt-1 text-sm text-bone/80">{action.title}</p>
                <p className="mt-1 text-xs text-bone/50 line-clamp-2">{action.detail}</p>
                <p className="mt-2 text-[10px] uppercase tracking-wider text-bone/35">{age(action.createdAt)}</p>
              </button>
            ))}
          </div>

          <div>
            {!selected ? (
              <div className="border border-bone/15 bg-ink/20 p-10 text-center text-bone/50">Select an action to respond or review it.</div>
            ) : selected.type === "checkin" || selected.type === "form_review" ? (
              <div className="border border-bone/15 bg-ink/20 p-6">
                <p className="font-display uppercase tracking-wider text-electric text-sm">{selected.title}</p>
                <p className="mt-2 text-bone/80">{selected.username}</p>
                <p className="mt-2 text-sm text-bone/60 leading-relaxed">{selected.detail}</p>
                {selected.hasVideo && <p className="mt-3 text-xs text-electric">A form video is attached to this check-in.</p>}
                <button onClick={() => onOpenClient(selected.clientId)} className="mt-5 bg-electric text-ink px-5 py-3 font-display uppercase tracking-wider text-sm hover:bg-bone transition-colors">
                  Open check-in &amp; reply →
                </button>
              </div>
            ) : (
              <div>
                <div className="mb-3 border border-bone/15 bg-ink/20 p-4">
                  <p className="font-display uppercase tracking-wider text-bone">{selected.username}</p>
                  <p className="mt-1 text-xs text-bone/50">{selected.title} · {selected.detail}</p>
                </div>
                <MessageThread
                  withUserId={selected.clientId}
                  meId={meId}
                  initialText={selected.type === "nudge" ? "Hey — checking in. How is training feeling this week, and is there anything I can help you adjust?" : ""}
                  onRead={load}
                  heightClass="h-[390px]"
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
