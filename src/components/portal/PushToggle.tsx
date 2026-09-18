"use client";

import { useEffect, useState } from "react";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export default function PushToggle() {
  const [supported, setSupported] = useState(true);
  const [configured, setConfigured] = useState(true);
  const [subscribed, setSubscribed] = useState(false);
  const [reminders, setReminders] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        setSupported(false); setReady(true); return;
      }
      try {
        const status = await fetch("/api/push/status").then((r) => (r.ok ? r.json() : null));
        if (status) { setConfigured(!!status.configured); setReminders(status.remindersEnabled !== false); }
        const reg = await navigator.serviceWorker.getRegistration("/sw.js") || await navigator.serviceWorker.register("/sw.js");
        const existing = await reg.pushManager.getSubscription();
        setSubscribed(!!existing);
      } catch { /* ignore */ }
      setReady(true);
    })();
  }, []);

  async function enable() {
    setBusy(true); setMsg("");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") { setMsg("Notifications are blocked. Enable them in your browser settings."); return; }
      const { publicKey } = await fetch("/api/push/vapid-public-key").then((r) => r.json());
      if (!publicKey) { setMsg("Push isn't configured on the server yet."); return; }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) });
      const res = await fetch("/api/push/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subscription: sub.toJSON() }) });
      if (!res.ok) throw new Error("save failed");
      setSubscribed(true); setReminders(true);
      setMsg("Notifications are on for this device.");
    } catch {
      setMsg("Could not enable notifications. Please try again.");
    } finally { setBusy(false); setTimeout(() => setMsg(""), 6000); }
  }

  async function disable() {
    setBusy(true); setMsg("");
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        const endpoint = sub.endpoint;
        await sub.unsubscribe();
        await fetch("/api/push/unsubscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint }) });
      }
      setSubscribed(false);
      setMsg("Notifications turned off for this device.");
    } catch {
      setMsg("Could not turn off notifications.");
    } finally { setBusy(false); setTimeout(() => setMsg(""), 6000); }
  }

  async function toggleReminders() {
    const next = !reminders;
    setReminders(next);
    try { await fetch("/api/push/preferences", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ remindersEnabled: next }) }); } catch { setReminders(!next); }
  }

  async function sendTest() {
    setBusy(true);
    try { const r = await fetch("/api/push/test", { method: "POST" }); const d = await r.json().catch(() => ({})); setMsg(r.ok && d.sent ? "Test sent — check your notifications." : "No device is subscribed to test."); }
    catch { setMsg("Could not send a test."); }
    finally { setBusy(false); setTimeout(() => setMsg(""), 6000); }
  }

  if (!ready) return null;

  return (
    <div className="border border-bone/15 bg-ink/30 p-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <p className="font-display uppercase tracking-[0.18em] text-sm text-bone/85">Push Notifications</p>
          <p className="mt-1 text-xs text-bone/50 max-w-md">
            Get a nudge for today&apos;s workout, your daily and weekly check-ins, and messages from your coach — right on this device.
          </p>
        </div>
        {!supported ? (
          <span className="text-[11px] text-bone/50">Not supported on this browser</span>
        ) : !configured ? (
          <span className="text-[11px] text-bone/50">Coming soon</span>
        ) : (
          <button
            onClick={subscribed ? disable : enable}
            disabled={busy}
            className={"px-4 py-2 font-display uppercase tracking-wider text-xs transition-colors disabled:opacity-40 " + (subscribed ? "border border-bone/25 text-bone/70 hover:border-electric hover:text-electric" : "bg-electric text-ink hover:bg-bone")}
          >
            {busy ? "Working…" : subscribed ? "Turn off" : "Enable notifications"}
          </button>
        )}
      </div>

      {supported && configured && subscribed && (
        <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-bone/10 pt-3">
          <label className="flex items-center gap-2 text-xs text-bone/70 cursor-pointer select-none">
            <input type="checkbox" checked={reminders} onChange={toggleReminders} className="accent-electric" />
            Daily &amp; weekly reminders
          </label>
          <button onClick={sendTest} disabled={busy} className="font-display uppercase tracking-wider text-[10px] text-bone/55 hover:text-electric transition-colors disabled:opacity-40">Send a test →</button>
        </div>
      )}
      {msg && <p className="mt-3 text-[11px] text-electric">{msg}</p>}
    </div>
  );
}
