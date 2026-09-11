"use client";

import { useEffect, useMemo, useState } from "react";

type ATab = "analytics" | "revenue" | "announcement" | "trial" | "assign" | "export";
const card = "border border-bone/15 bg-ink/20 p-5";
const label = "block text-[11px] uppercase tracking-wider text-bone/50 mb-1 font-display";
const input = "w-full bg-ink/40 border border-bone/20 px-3 py-2 text-bone focus:border-electric outline-none";
const btn = "font-display uppercase tracking-wider text-sm bg-electric text-ink px-5 py-2.5 hover:bg-bone transition-colors disabled:opacity-50";
const ghost = "font-display uppercase tracking-wider text-xs border border-bone/25 text-bone/70 px-4 py-2 hover:border-electric hover:text-electric transition-colors";

function Analytics() {
  const [d, setD] = useState<any>(null);
  useEffect(() => { fetch("/api/admin/analytics").then((r) => (r.ok ? r.json() : null)).then(setD).catch(() => {}); }, []);
  if (!d) return <p className="text-bone/50 font-display uppercase tracking-wider text-sm">Loading…</p>;
  const stats = [
    ["Members", d.totalMembers], ["Portal access", d.portalAccess], ["Trainers", d.trainers],
    ["New (30d)", d.newLast30], ["Subscribers", d.activeSubscribers], ["Forum posts", d.forumPosts], ["Check-ins", d.checkins],
  ];
  const max = Math.max(1, ...(d.signupsByWeek || []).map((w: any) => w.count));
  return (
    <div className="grid gap-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map(([k, v]) => (
          <div key={k as string} className={card}>
            <p className="text-3xl font-display text-electric">{v as number}</p>
            <p className="text-[10px] uppercase tracking-wider text-bone/50">{k as string}</p>
          </div>
        ))}
      </div>
      <div className={card}>
        <p className="font-display uppercase tracking-wider text-bone/60 text-xs mb-4">Signups · last 8 weeks</p>
        <div className="flex items-end gap-2 h-32">
          {(d.signupsByWeek || []).map((w: any, i: number) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full bg-electric/70" style={{ height: `${(w.count / max) * 100}%`, minHeight: w.count ? 4 : 0 }} />
              <span className="text-[9px] text-bone/40 uppercase">{w.label}</span>
              <span className="text-[10px] font-display text-bone/70">{w.count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Revenue() {
  const [d, setD] = useState<any>(null);
  const [coupons, setCoupons] = useState<any[]>([]);
  useEffect(() => {
    fetch("/api/admin/revenue").then((r) => (r.ok ? r.json() : null)).then(setD).catch(() => {});
    fetch("/api/admin/coupons").then((r) => (r.ok ? r.json() : { codes: [] })).then((x) => setCoupons(x.codes || x.coupons || [])).catch(() => {});
  }, []);
  return (
    <div className="grid gap-5">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className={card}><p className="text-3xl font-display text-electric">{d?.activeSubscribers ?? "—"}</p><p className="text-[10px] uppercase tracking-wider text-bone/50">Active subscribers</p></div>
        {(d?.byPlan || []).map((p: any) => (
          <div key={p.plan} className={card}><p className="text-3xl font-display text-electric">{p.count}</p><p className="text-[10px] uppercase tracking-wider text-bone/50">{p.plan}</p></div>
        ))}
      </div>
      <div className={card + " overflow-x-auto"}>
        <p className="font-display uppercase tracking-wider text-bone/60 text-xs mb-3">Discount code usage</p>
        {coupons.length === 0 ? <p className="text-bone/50 text-sm">No promo codes yet.</p> : (
          <table className="w-full text-sm min-w-[420px]">
            <thead><tr className="text-bone/50 text-[10px] uppercase tracking-wider border-b border-bone/15"><th className="text-left py-2">Code</th><th className="text-center py-2">Off</th><th className="text-center py-2">Redeemed</th></tr></thead>
            <tbody>
              {coupons.map((c: any) => (
                <tr key={c.id || c.code} className="border-b border-bone/5"><td className="py-2 font-display uppercase text-bone">{c.code}</td><td className="text-center text-bone/70">{c.percentOff ? c.percentOff + "%" : "—"}</td><td className="text-center font-display text-electric">{c.timesRedeemed ?? 0}</td></tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function Announcement() {
  const [enabled, setEnabled] = useState(false);
  const [message, setMessage] = useState("");
  const [flash, setFlash] = useState("");
  useEffect(() => { fetch("/api/announcement").then((r) => (r.ok ? r.json() : null)).then((d) => { if (d) { setEnabled(!!d.enabled); setMessage(d.message || ""); } }).catch(() => {}); }, []);
  async function save() {
    const res = await fetch("/api/admin/announcement", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled, message }) });
    setFlash(res.ok ? "\u2713 Saved" : "Error"); if (res.ok) setTimeout(() => setFlash(""), 2500);
  }
  return (
    <div className="grid gap-4 max-w-xl">
      <p className="text-bone/60 text-sm">A dismissible banner shown across the whole site to every visitor.</p>
      <div><label className={label}>Message</label><input className={input} value={message} maxLength={300} onChange={(e) => setMessage(e.target.value)} placeholder="e.g. New year sale — 20% off coaching with code NY20" /></div>
      <label className="flex items-center gap-2 text-sm text-bone/70"><input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} /> Show banner</label>
      {enabled && message && (<div className="bg-electric text-ink px-4 py-2.5 text-center font-display uppercase tracking-wider text-xs">{message}</div>)}
      <div className="flex items-center gap-4"><button className={btn} onClick={save}>Save banner</button>{flash && <span className="text-electric font-display uppercase tracking-wider text-xs">{flash}</span>}</div>
    </div>
  );
}

function BulkAssign() {
  const [users, setUsers] = useState<any[]>([]);
  const [sel, setSel] = useState<Record<string, boolean>>({});
  const [trainerId, setTrainerId] = useState("");
  const [flash, setFlash] = useState("");
  const load = () => fetch("/api/admin/users").then((r) => (r.ok ? r.json() : { users: [] })).then((d) => setUsers(d.users || [])).catch(() => {});
  useEffect(() => { load(); }, []);
  const trainers = users.filter((u) => u.isTrainer);
  const members = users.filter((u) => u.role !== "admin");
  const selectedIds = Object.keys(sel).filter((k) => sel[k]);
  async function assign() {
    if (!selectedIds.length) return;
    const res = await fetch("/api/admin/bulk-assign", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ clientIds: selectedIds, trainerId }) });
    if (res.ok) { const d = await res.json(); setFlash(`\u2713 Updated ${d.updated}`); setSel({}); load(); setTimeout(() => setFlash(""), 3000); } else setFlash("Error");
  }
  return (
    <div className="grid gap-4">
      <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
        <div className="sm:max-w-xs w-full"><label className={label}>Assign selected to</label>
          <select className={input} value={trainerId} onChange={(e) => setTrainerId(e.target.value)}>
            <option value="">— Unassign —</option>
            {trainers.map((t) => (<option key={t.id} value={t.id}>{t.username}</option>))}
          </select>
        </div>
        <button className={btn} onClick={assign} disabled={!selectedIds.length}>Apply to {selectedIds.length} selected</button>
        {flash && <span className="text-electric font-display uppercase tracking-wider text-xs">{flash}</span>}
      </div>
      <div className={card + " overflow-x-auto max-h-[480px] overflow-y-auto"}>
        <table className="w-full text-sm min-w-[520px]">
          <thead><tr className="text-bone/50 text-[10px] uppercase tracking-wider border-b border-bone/15"><th className="py-2"></th><th className="text-left py-2">Member</th><th className="text-left py-2">Current trainer</th></tr></thead>
          <tbody>
            {members.map((u) => {
              const t = trainers.find((x) => x.id === u.assignedTrainerId);
              return (
                <tr key={u.id} className="border-b border-bone/5">
                  <td className="py-2 pr-2"><input type="checkbox" checked={!!sel[u.id]} onChange={(e) => setSel((s) => ({ ...s, [u.id]: e.target.checked }))} /></td>
                  <td className="py-2 text-bone">{u.username}<span className="text-bone/40 text-xs"> · {u.email}</span></td>
                  <td className="py-2 text-bone/60">{t ? t.username : <span className="text-bone/30">none</span>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ExportCsv() {
  const [busy, setBusy] = useState(false);
  async function run() {
    setBusy(true);
    const res = await fetch("/api/admin/users");
    const d = res.ok ? await res.json() : { users: [] };
    const rows = [["username", "email", "role", "isTrainer", "portalAccess", "createdAt"]];
    (d.users || []).forEach((u: any) => rows.push([u.username, u.email, u.role, u.isTrainer ? "yes" : "no", u.portalAccess ? "yes" : "no", u.createdAt || ""]));
    const csv = rows.map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `tensor-strength-members-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    setBusy(false);
  }
  return (
    <div className="grid gap-4 max-w-md">
      <p className="text-bone/60 text-sm">Download every member as a CSV (name, email, role, trainer flag, portal access, signup date).</p>
      <button className={btn} onClick={run} disabled={busy}>{busy ? "Preparing…" : "Download members CSV"}</button>
    </div>
  );
}

function TrialSettings() {
  const [enabled, setEnabled] = useState(false);
  const [days, setDays] = useState(7);
  const [flash, setFlash] = useState("");
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    fetch("/api/admin/trial-settings")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d) { setEnabled(!!d.enabled); setDays(Number(d.days) > 0 ? Number(d.days) : 7); } setLoaded(true); })
      .catch(() => setLoaded(true));
  }, []);
  async function save() {
    const res = await fetch("/api/admin/trial-settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled, days }),
    });
    setFlash(res.ok ? "\u2713 Saved" : "Error");
    if (res.ok) setTimeout(() => setFlash(""), 2500);
  }
  if (!loaded) return <p className="text-bone/50 font-display uppercase tracking-wider text-sm">Loading…</p>;
  return (
    <div className="grid gap-4 max-w-xl">
      <p className="text-bone/60 text-sm leading-relaxed">
        Give <span className="text-bone">new remote coaching clients</span> a free trial before billing starts.
        Their card is collected up front, nothing is charged during the trial, and it auto-bills after unless they
        cancel. Portal access opens immediately. Only applies to <span className="text-bone">Remote Coaching ($400/mo)</span>{" "}
        and to first-time clients (never had access before).
      </p>
      <label className="flex items-center gap-2 text-sm text-bone/70">
        <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} /> Enable first-week-free trial
      </label>
      <div className="max-w-[180px]">
        <label className={label}>Free days</label>
        <input
          type="number"
          min={1}
          max={365}
          className={input}
          value={days}
          onChange={(e) => setDays(Math.max(1, Math.min(365, parseInt(e.target.value || "7", 10) || 7)))}
          disabled={!enabled}
        />
      </div>
      {enabled && (
        <div className="border border-electric/40 bg-electric/5 px-4 py-2.5 text-sm text-bone/80">
          New remote coaching clients get <span className="text-electric font-display uppercase">{days} day{days === 1 ? "" : "s"} free</span>, then $400/mo.
        </div>
      )}
      <div className="flex items-center gap-4">
        <button className={btn} onClick={save}>Save trial settings</button>
        {flash && <span className="text-electric font-display uppercase tracking-wider text-xs">{flash}</span>}
      </div>
    </div>
  );
}

export default function AdminTools() {
  const [t, setT] = useState<ATab>("analytics");
  const tabs: { id: ATab; label: string }[] = [
    { id: "analytics", label: "Analytics" },
    { id: "revenue", label: "Revenue & Coupons" },
    { id: "announcement", label: "Announcement" },
    { id: "trial", label: "Free Trial" },
    { id: "assign", label: "Bulk Assign" },
    { id: "export", label: "Export CSV" },
  ];
  return (
    <div>
      <div className="mb-6 border-l-2 border-electric/50 pl-4">
        <p className="font-display uppercase tracking-wider text-electric text-sm">Admin tools</p>
        <p className="text-bone/60 text-sm mt-1">Analytics, revenue, site announcement, free trial, bulk assignment and exports.</p>
      </div>
      <div className="flex flex-wrap gap-2 mb-6">
        {tabs.map((x) => (
          <button key={x.id} onClick={() => setT(x.id)} className={"px-4 py-2 font-display uppercase tracking-wider text-xs transition-colors " + (t === x.id ? "bg-electric text-ink" : "text-bone/60 hover:text-electric border border-bone/20")}>{x.label}</button>
        ))}
      </div>
      {t === "analytics" && <Analytics />}
      {t === "revenue" && <Revenue />}
      {t === "announcement" && <Announcement />}
      {t === "trial" && <TrialSettings />}
      {t === "assign" && <BulkAssign />}
      {t === "export" && <ExportCsv />}
    </div>
  );
}
