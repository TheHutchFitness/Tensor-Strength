"use client";

import { useEffect, useRef, useState } from "react";

type Msg = { id?: string; role: "user" | "assistant"; content: string };

const QUICK = [
  "Explain today's workout",
  "What should I train today?",
  "Explain an exercise",
  "Review my recent workouts",
  "Help with my program",
  "Ask about nutrition",
];

export default function TensorAIPage() {
  const [ready, setReady] = useState(false);
  const [entitled, setEntitled] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [conversationId, setConversationId] = useState("");
  const [convos, setConvos] = useState<any[]>([]);
  const [err, setErr] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const me = await fetch("/api/auth/me");
        if (!me.ok) { setSignedIn(false); setReady(true); return; }
        const { user } = await me.json();
        setSignedIn(true);
        setEntitled(user.role === "admin" || user.isTrainer === true || user.portalAccess === true);
        loadConvos();
      } catch { /* ignore */ }
      setReady(true);
    })();
  }, []);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, busy]);

  function loadConvos() {
    fetch("/api/ai/conversations").then((r) => (r.ok ? r.json() : null)).then((d) => d && setConvos(d.conversations || [])).catch(() => {});
  }
  async function openConvo(id: string) {
    const d = await fetch(`/api/ai/conversations?id=${id}`).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    if (d) { setConversationId(id); setMessages((d.messages || []).map((m: any) => ({ id: m.id, role: m.role, content: m.content }))); }
  }
  function newChat() { setConversationId(""); setMessages([]); setErr(""); }

  async function send(text: string) {
    const msg = text.trim();
    if (!msg || busy) return;
    setErr("");
    setInput("");
    setMessages((m) => [...m, { role: "user", content: msg }]);
    setBusy(true);
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, conversationId: conversationId || undefined }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setErr(d.error || "Tensor AI could not answer."); setBusy(false); return; }
      if (!conversationId) { setConversationId(d.conversationId); loadConvos(); }
      setMessages((m) => [...m, { id: d.messageId, role: "assistant", content: d.reply }]);
    } catch {
      setErr("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function rate(messageId: string | undefined, rating: "up" | "down") {
    if (!messageId) return;
    await fetch("/api/ai/feedback", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messageId, rating }) }).catch(() => {});
  }

  if (!ready) return <main className="min-h-screen bg-[#0B0F14] text-[#94A3B8] grid place-items-center">Loading…</main>;

  if (!signedIn) {
    return (
      <main className="min-h-screen bg-[#0B0F14] text-[#F8FAFC] grid place-items-center p-6 text-center">
        <div className="max-w-md">
          <p className="text-[#3B82F6] font-semibold tracking-wide">TENSOR AI</p>
          <h1 className="text-3xl font-bold mt-2">Your Tensor Strength coaching layer</h1>
          <p className="text-[#94A3B8] mt-3">Sign in to your Tensor Strength account to use Tensor AI Coach.</p>
          <a href="/login?from=/ai" className="inline-block mt-6 bg-[#3B82F6] hover:bg-[#2563EB] text-white px-6 py-3 rounded-lg font-medium transition-colors">Log in</a>
        </div>
      </main>
    );
  }

  if (!entitled) {
    return (
      <main className="min-h-screen bg-[#0B0F14] text-[#F8FAFC] grid place-items-center p-6 text-center">
        <div className="max-w-md">
          <p className="text-[#3B82F6] font-semibold tracking-wide">TENSOR AI</p>
          <h1 className="text-3xl font-bold mt-2">Tensor AI Coach is a member feature</h1>
          <p className="text-[#94A3B8] mt-3">Unlock an intelligent coaching layer that understands your program, your workouts, and how to train — for Tensor Strength members.</p>
          <a href="/account" className="inline-block mt-6 bg-[#3B82F6] hover:bg-[#2563EB] text-white px-6 py-3 rounded-lg font-medium transition-colors">See membership →</a>
          <a href="/clients" className="block mt-4 text-[#94A3B8] hover:text-[#F8FAFC] text-sm">Back to my portal</a>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0B0F14] text-[#F8FAFC] flex">
      {/* Sidebar */}
      <aside className="hidden md:flex md:flex-col w-64 shrink-0 border-r border-white/10 bg-[#111827]">
        <div className="p-4 border-b border-white/10">
          <p className="text-[#3B82F6] font-semibold text-sm tracking-wide">TENSOR AI</p>
          <button onClick={newChat} className="mt-3 w-full bg-[#3B82F6] hover:bg-[#2563EB] text-white text-sm py-2 rounded-lg transition-colors">+ New chat</button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {convos.map((c) => (
            <button key={c.id} onClick={() => openConvo(c.id)} className={"w-full text-left text-sm px-3 py-2 rounded-lg truncate transition-colors " + (c.id === conversationId ? "bg-white/10 text-[#F8FAFC]" : "text-[#94A3B8] hover:bg-white/5")}>{c.title || "Conversation"}</button>
          ))}
          {!convos.length && <p className="text-xs text-[#94A3B8] px-3 py-2">No conversations yet.</p>}
        </div>
        <a href="/clients" className="p-4 text-xs text-[#94A3B8] hover:text-[#F8FAFC] border-t border-white/10">← Tensor Strength portal</a>
      </aside>

      {/* Chat */}
      <section className="flex-1 flex flex-col max-h-screen">
        <header className="md:hidden p-4 border-b border-white/10 bg-[#111827] flex items-center justify-between">
          <span className="text-[#3B82F6] font-semibold text-sm">TENSOR AI</span>
          <button onClick={newChat} className="text-sm text-[#94A3B8]">+ New</button>
        </header>

        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-3xl px-4 py-6 space-y-5">
            {!messages.length && (
              <div className="text-center py-10">
                <h1 className="text-2xl font-bold">Tensor AI Coach</h1>
                <p className="text-[#94A3B8] mt-2">Ask about your program, an exercise, your recent training, or how to use Tensor Strength.</p>
                <div className="mt-6 grid sm:grid-cols-2 gap-2 max-w-xl mx-auto">
                  {QUICK.map((q) => (
                    <button key={q} onClick={() => send(q)} className="text-left text-sm bg-[#111827] hover:bg-white/5 border border-white/10 rounded-lg px-4 py-3 transition-colors">{q}</button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                <div className={"max-w-[85%] rounded-2xl px-4 py-3 whitespace-pre-wrap text-[15px] leading-relaxed " + (m.role === "user" ? "bg-[#3B82F6] text-white" : "bg-[#111827] border border-white/10 text-[#F8FAFC]")}>
                  {m.content}
                  {m.role === "assistant" && m.id && (
                    <div className="mt-2 flex gap-3 text-[#94A3B8]">
                      <button onClick={() => rate(m.id, "up")} className="hover:text-[#16A34A] text-xs">👍</button>
                      <button onClick={() => rate(m.id, "down")} className="hover:text-[#DC2626] text-xs">👎</button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {busy && <div className="flex justify-start"><div className="bg-[#111827] border border-white/10 rounded-2xl px-4 py-3 text-[#94A3B8] text-sm">Tensor is thinking…</div></div>}
            {err && <div className="text-center text-[#DC2626] text-sm">{err}</div>}
            <div ref={endRef} />
          </div>
        </div>

        <div className="border-t border-white/10 bg-[#0B0F14] p-4">
          <div className="mx-auto max-w-3xl flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
              rows={1}
              placeholder="Ask Tensor AI Coach…"
              className="flex-1 resize-none bg-[#111827] border border-white/10 rounded-xl px-4 py-3 text-[#F8FAFC] placeholder:text-[#94A3B8] focus:border-[#3B82F6] outline-none max-h-40"
            />
            <button onClick={() => send(input)} disabled={busy || !input.trim()} className="bg-[#3B82F6] hover:bg-[#2563EB] disabled:opacity-40 text-white px-5 py-3 rounded-xl font-medium transition-colors">Send</button>
          </div>
          <p className="mx-auto max-w-3xl text-[11px] text-[#94A3B8] mt-2 text-center">Tensor AI can be wrong and does not replace Hutch. It won't diagnose injuries — see a professional for medical concerns.</p>
        </div>
      </section>
    </main>
  );
}
