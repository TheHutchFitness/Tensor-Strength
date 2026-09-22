"use client";

import { useEffect, useRef, useState } from "react";
import Navbar from "../../src/components/Navbar";
import Footer from "../../src/components/Footer";

type Msg = {
  role: "user" | "assistant";
  content: string;
  id?: string;
};

type Conversation = {
  id: string;
  title?: string;
  updatedAt?: string;
};

const STARTERS = [
  "What should I focus on in today's gym session?",
  "How do I get more athletic without losing strength?",
  "I missed a session — how should I adjust this week?",
  "How should I warm up for a heavy lower-body day?",
];

export default function TensorAIPage() {
  const [ready, setReady] = useState(false);
  const [entitled, setEntitled] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [conversationId, setConversationId] = useState("");
  const [mode, setMode] = useState<"standard" | "deep">("standard");
  const [error, setError] = useState("");
  const [ratings, setRatings] = useState<Record<string, "up" | "down">>({});
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/ai/access", { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        setSignedIn(!!data?.signedIn);
        setEntitled(!!data?.entitled);
      })
      .catch(() => setEntitled(false))
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (!entitled) return;
    fetch("/api/ai/conversations", { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setConversations(data?.conversations || []))
      .catch(() => {});
  }, [entitled]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  async function openConversation(id: string) {
    setError("");
    const res = await fetch(`/api/ai/conversations?id=${encodeURIComponent(id)}`, {
      credentials: "include",
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "Could not open that conversation.");
      return;
    }
    setConversationId(id);
    setMessages(
      (data.messages || []).map((row: any) => ({
        role: row.role,
        content: row.content,
        id: row.id,
      })),
    );
  }

  function newChat() {
    setConversationId("");
    setMessages([]);
    setError("");
  }

  async function send(text?: string) {
    const message = (text || input).trim();
    if (!message || busy) return;
    setInput("");
    setError("");
    setBusy(true);
    setMessages((m) => [...m, { role: "user", content: message }]);
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, conversationId, mode }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Tensor AI could not answer.");
      if (data.conversationId) setConversationId(data.conversationId);
      setMessages((m) => [
        ...m,
        { role: "assistant", content: data.reply || "", id: data.messageId },
      ]);
      fetch("/api/ai/conversations", { credentials: "include", cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((next) => setConversations(next?.conversations || []))
        .catch(() => {});
    } catch (err: any) {
      setError(err?.message || "Tensor AI could not answer.");
    } finally {
      setBusy(false);
    }
  }

  async function rate(messageId: string, rating: "up" | "down") {
    setRatings((current) => ({ ...current, [messageId]: rating }));
    await fetch("/api/ai/feedback", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messageId, rating }),
    }).catch(() => {});
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-ink text-bone">
        <div className="mx-auto max-w-6xl px-6 py-16 md:py-24">
          <p className="glow mb-4 font-display uppercase tracking-[0.3em] text-sm text-electric">
            Tensor AI Beta
          </p>
          <h1 className="glow font-display uppercase text-4xl md:text-5xl font-700 leading-tight">
            Gym, sport,
            <br />
            <span className="text-electric">and athletics.</span>
          </h1>

          {!ready ? (
            <p className="mt-8 font-display uppercase tracking-wider text-sm text-bone/50">Loading…</p>
          ) : !signedIn ? (
            <div className="mt-8 max-w-xl">
              <p className="text-sm leading-relaxed text-bone/65">
                Tensor AI is a gym, sport, and athletics specialist. The rest of Tensor
                Strength stays the same — this is the coaching layer for people who train.
              </p>
              <a
                href="/login?from=/ai"
                className="mt-8 inline-block bg-electric px-8 py-4 font-display uppercase tracking-wider text-ink hover:bg-bone"
              >
                Sign in to continue
              </a>
            </div>
          ) : !entitled ? (
            <div className="mt-8 max-w-xl border border-electric/35 bg-electric/5 p-6">
              <p className="text-sm leading-relaxed text-bone/70">
                Tensor AI Beta is a $12.99 CAD/month founding gym, sport, and athletics
                coach on top of Core. It is not included in the $9.99 membership.
              </p>
              <a
                href="/checkout?plan=tensor_ai_beta_12_99"
                className="mt-5 inline-block bg-electric px-6 py-3 font-display uppercase tracking-wider text-sm text-ink hover:bg-bone"
              >
                Join Tensor AI Beta →
              </a>
            </div>
          ) : (
            <div className="mt-8 grid gap-6 lg:grid-cols-[220px_1fr]">
              <aside className="border border-bone/15 bg-ink/20">
                <button
                  type="button"
                  onClick={newChat}
                  className="w-full border-b border-bone/15 px-4 py-3 text-left font-display uppercase tracking-wider text-xs text-electric hover:bg-electric/10"
                >
                  New conversation
                </button>
                {conversations.length === 0 ? (
                  <p className="p-4 text-xs text-bone/40">No saved chats yet.</p>
                ) : (
                  conversations.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => openConversation(item.id)}
                      className={
                        "block w-full border-b border-bone/10 px-4 py-3 text-left text-xs last:border-b-0 " +
                        (conversationId === item.id ? "bg-electric/10 text-electric" : "text-bone/70 hover:bg-white/[0.03]")
                      }
                    >
                      {(item.title || "Conversation").slice(0, 48)}
                    </button>
                  ))
                )}
              </aside>

              <section>
                <p className="max-w-xl text-sm leading-relaxed text-bone/65">
                  Ask about lifting, conditioning, sport performance, recovery, or how to
                  use your program. Coach-programmed work and your logged data stay clearly
                  separated from suggestions.
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                  {(["standard", "deep"] as const).map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setMode(value)}
                      className={
                        "border px-4 py-2 font-display uppercase tracking-wider text-[11px] " +
                        (mode === value
                          ? "border-electric bg-electric/10 text-electric"
                          : "border-bone/20 text-bone/60")
                      }
                    >
                      {value === "standard" ? "Everyday" : "Think harder"}
                    </button>
                  ))}
                </div>

                {messages.length === 0 ? (
                  <div className="mt-6 grid gap-2 sm:grid-cols-2">
                    {STARTERS.map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        onClick={() => send(prompt)}
                        className="border border-bone/15 bg-ink/30 p-4 text-left text-sm text-bone/70 transition-colors hover:border-electric hover:text-bone"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                ) : null}

                <div className="mt-6 min-h-[280px] border border-bone/15 bg-ink/30 p-5">
                  {messages.length === 0 && (
                    <p className="text-sm text-bone/40">Start with a gym, sport, or athletics question.</p>
                  )}
                  {messages.map((msg, i) => (
                    <div
                      key={msg.id || i}
                      className={"mb-4 text-sm leading-relaxed " + (msg.role === "user" ? "text-electric" : "text-bone/80")}
                    >
                      <p className="mb-1 font-display uppercase tracking-wider text-[10px] text-bone/40">
                        {msg.role === "user" ? "You" : "Tensor AI"}
                      </p>
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                      {msg.role === "assistant" && msg.id ? (
                        <div className="mt-2 flex gap-2">
                          <button
                            type="button"
                            onClick={() => rate(msg.id!, "up")}
                            className={
                              "border px-2 py-1 text-[10px] uppercase tracking-wider " +
                              (ratings[msg.id] === "up" ? "border-electric text-electric" : "border-bone/20 text-bone/40")
                            }
                          >
                            Helpful
                          </button>
                          <button
                            type="button"
                            onClick={() => rate(msg.id!, "down")}
                            className={
                              "border px-2 py-1 text-[10px] uppercase tracking-wider " +
                              (ratings[msg.id] === "down" ? "border-red-400 text-red-400" : "border-bone/20 text-bone/40")
                            }
                          >
                            Needs work
                          </button>
                        </div>
                      ) : null}
                    </div>
                  ))}
                  {busy && <p className="text-xs text-bone/40">Thinking…</p>}
                  <div ref={endRef} />
                </div>
                {error ? <p className="mt-3 text-xs text-red-400">{error}</p> : null}
                <form
                  className="mt-4 flex gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    send();
                  }}
                >
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask Tensor AI…"
                    className="flex-1 border border-bone/20 bg-ink px-4 py-3 text-sm outline-none focus:border-electric"
                  />
                  <button
                    type="submit"
                    disabled={busy || !input.trim()}
                    className="bg-electric px-5 py-3 font-display uppercase tracking-wider text-xs text-ink hover:bg-bone disabled:opacity-50"
                  >
                    Send
                  </button>
                </form>
              </section>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
