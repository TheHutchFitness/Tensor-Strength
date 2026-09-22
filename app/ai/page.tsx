"use client";

import { useEffect, useRef, useState } from "react";
import Navbar from "../../src/components/Navbar";
import Footer from "../../src/components/Footer";

type Msg = { role: "user" | "assistant"; content: string };

export default function TensorAIPage() {
  const [ready, setReady] = useState(false);
  const [entitled, setEntitled] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [conversationId, setConversationId] = useState("");
  const [error, setError] = useState("");
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
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

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
        body: JSON.stringify({ message, conversationId, mode: "standard" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Tensor AI could not answer.");
      if (data.conversationId) setConversationId(data.conversationId);
      setMessages((m) => [...m, { role: "assistant", content: data.reply || "" }]);
    } catch (err: any) {
      setError(err?.message || "Tensor AI could not answer.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-ink text-bone">
        <div className="mx-auto max-w-3xl px-6 py-16 md:py-24">
          <p className="glow mb-4 font-display uppercase tracking-[0.3em] text-sm text-electric">
            Tensor AI Beta
          </p>
          <h1 className="glow font-display uppercase text-4xl md:text-5xl font-700 leading-tight">
            Training context,
            <br />
            <span className="text-electric">on demand.</span>
          </h1>

          {!ready ? (
            <p className="mt-8 font-display uppercase tracking-wider text-sm text-bone/50">Loading…</p>
          ) : !signedIn ? (
            <a href="/login?from=/ai" className="mt-8 inline-block bg-electric px-8 py-4 font-display uppercase tracking-wider text-ink hover:bg-bone">
              Sign in to continue
            </a>
          ) : !entitled ? (
            <div className="mt-8 border border-electric/35 bg-electric/5 p-6">
              <p className="text-sm leading-relaxed text-bone/70">
                Tensor AI Beta is a $12.99 CAD/month founding layer on top of Core.
                It is not included in the $9.99 membership.
              </p>
              <a
                href="/checkout?plan=tensor_ai_beta_12_99"
                className="mt-5 inline-block bg-electric px-6 py-3 font-display uppercase tracking-wider text-sm text-ink hover:bg-bone"
              >
                Join Tensor AI Beta →
              </a>
            </div>
          ) : (
            <>
              <p className="mt-6 max-w-xl text-sm leading-relaxed text-bone/65">
                Ask about your program, recent training, or how to use Tensor Strength.
                Coach-programmed work and your logged data stay clearly separated from suggestions.
              </p>
              <div className="mt-8 min-h-[280px] border border-bone/15 bg-ink/30 p-5">
                {messages.length === 0 && (
                  <p className="text-sm text-bone/40">Start with a question about today&apos;s training.</p>
                )}
                {messages.map((msg, i) => (
                  <div key={i} className={"mb-4 text-sm leading-relaxed " + (msg.role === "user" ? "text-electric" : "text-bone/80")}>
                    <p className="mb-1 font-display uppercase tracking-wider text-[10px] text-bone/40">
                      {msg.role === "user" ? "You" : "Tensor AI"}
                    </p>
                    <p className="whitespace-pre-wrap">{msg.content}</p>
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
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
