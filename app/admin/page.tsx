"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { DEFAULT_CLIPS } from "@/components/CoachingShowcase";
import { professionals } from "@/data/professionals";
import AdminTools from "@/components/portal/AdminTools";

type User = {
  id: string;
  username: string;
  email: string;
  role: "member" | "admin";
  portalAccess: boolean;
  isTrainer?: boolean;
  assignedTrainerId?: string | null;
  picture?: string;
  accessType?: string;
  subscriptionStatus?: string;
  createdAt: string;
};

const ACCESS_LABELS: Record<string, string> = {
  membership: "Membership · $9.99/mo",
  custom_program: "Custom Program · $200",
  remote_coaching: "Remote Coaching · $400/mo",
  in_person: "In-person / Manual",
};

export default function AdminPage() {
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [codes, setCodes] = useState<any[]>([]);
  const [demoStats, setDemoStats] = useState<{ opens: any[]; signups: any[] }>({ opens: [], signups: [] });
  const [apps, setApps] = useState<any[]>([]);
  const [form, setForm] = useState({ code: "", percentOff: "100", duration: "once", durationInMonths: "3" });
  const [creating, setCreating] = useState(false);

  // Coaching video captions + order (editable)
  const [clipLabels, setClipLabels] = useState<Record<string, string>>({});
  const [clipOrder, setClipOrder] = useState<string[]>(DEFAULT_CLIPS.map((c) => c.src));
  const [hiddenClips, setHiddenClips] = useState<string[]>([]);
  const [dragSrc, setDragSrc] = useState<string | null>(null);
  const [savingClips, setSavingClips] = useState(false);
  const [clipsSaved, setClipsSaved] = useState(false);

  // Coach video testimonials (per slug)
  const [coachVids, setCoachVids] = useState<Record<string, { src: string; poster: string; name: string; detail: string }>>({});
  const [savingCoachSlug, setSavingCoachSlug] = useState<string | null>(null);

  async function loadCoaching() {
    const res = await fetch("/api/coaching-content");
    if (res.ok) {
      const d = await res.json();
      setClipLabels(d.labels || {});
      if (Array.isArray(d.hidden)) setHiddenClips(d.hidden);
      if (Array.isArray(d.order) && d.order.length) {
        const seen = new Set(d.order);
        const rest = DEFAULT_CLIPS.map((c) => c.src).filter((s) => !seen.has(s));
        setClipOrder([...d.order.filter((s: string) => DEFAULT_CLIPS.some((c) => c.src === s)), ...rest]);
      }
    }
    const cres = await fetch("/api/coach-content");
    if (cres.ok) {
      const cd = await cres.json();
      setCoachVids(cd.coaches || {});
    }
  }

  function reorder(targetSrc: string) {
    if (!dragSrc || dragSrc === targetSrc) return;
    setClipOrder((prev) => {
      const arr = [...prev];
      const from = arr.indexOf(dragSrc);
      const to = arr.indexOf(targetSrc);
      if (from < 0 || to < 0) return prev;
      arr.splice(from, 1);
      arr.splice(to, 0, dragSrc);
      return arr;
    });
  }

  function toggleHidden(src: string) {
    setHiddenClips((prev) =>
      prev.includes(src) ? prev.filter((s) => s !== src) : [...prev, src]
    );
  }

  async function saveCoaching() {
    setSavingClips(true);
    setClipsSaved(false);
    const labels: Record<string, string> = {};
    DEFAULT_CLIPS.forEach((c) => {
      labels[c.src] = (clipLabels[c.src] ?? c.label).slice(0, 120);
    });
    const res = await fetch("/api/admin/coaching-content", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ labels, order: clipOrder, hidden: hiddenClips }),
    });
    if (res.ok) {
      const d = await res.json();
      setClipLabels(d.labels || labels);
      if (Array.isArray(d.hidden)) setHiddenClips(d.hidden);
      setClipsSaved(true);
      setTimeout(() => setClipsSaved(false), 2500);
    }
    setSavingClips(false);
  }

  async function saveCoachVideo(slug: string) {
    setSavingCoachSlug(slug);
    const vt = coachVids[slug] || { src: "", poster: "", name: "", detail: "" };
    const res = await fetch("/api/admin/coach-content", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, videoTestimonial: vt.src.trim() ? vt : null }),
    });
    if (res.ok) {
      const d = await res.json();
      setCoachVids(d.coaches || {});
    }
    setSavingCoachSlug(null);
  }

  async function loadCodes() {
    const res = await fetch("/api/admin/coupons");
    if (res.ok) {
      const data = await res.json();
      setCodes(data.codes || []);
    }
  }

  async function createCode(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    const res = await fetch("/api/admin/coupons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: form.code,
        percentOff: Number(form.percentOff),
        duration: form.duration,
        durationInMonths: Number(form.durationInMonths),
      }),
    });
    const data = await res.json();
    if (!res.ok) alert(data.error || "Could not create code");
    else setForm({ ...form, code: "" });
    await loadCodes();
    setCreating(false);
  }

  async function toggleCode(id: string, active: boolean) {
    await fetch("/api/admin/coupons", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, active: !active }),
    });
    await loadCodes();
  }

  async function createPreset(code: string, percentOff: number) {
    setCreating(true);
    const res = await fetch("/api/admin/coupons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, percentOff, duration: "forever" }),
    });
    const data = await res.json();
    if (!res.ok) alert(data.error || "Could not create preset code (it may already exist).");
    await loadCodes();
    setCreating(false);
  }

  async function loadUsers() {
    const res = await fetch("/api/admin/users");
    if (res.ok) {
      const data = await res.json();
      setUsers(data.users || []);
    }
  }

  useEffect(() => {
    (async () => {
      const me = await fetch("/api/auth/me");
      if (!me.ok) {
        window.location.href = "/login?from=/admin";
        return;
      }
      const { user } = await me.json();
      if (user.role !== "admin") {
        window.location.href = "/";
        return;
      }
      setAuthorized(true);
      await loadUsers();
      await loadCodes();
      await loadCoaching();
      fetch("/api/applications").then((r) => (r.ok ? r.json() : null)).then((d) => d && setApps(d.applications || [])).catch(() => {});
      fetch("/api/admin/demo-analytics").then((r) => (r.ok ? r.json() : null)).then((d) => d && setDemoStats(d)).catch(() => {});
      setLoading(false);
    })();
  }, []);

  async function setAppStatus(id: string, status: string) {
    setApps((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
    await fetch("/api/applications", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    }).catch(() => {});
  }

  async function resetPassword(u: User) {
    const pw = window.prompt(`Set a new password for ${u.username} (6+ characters):`);
    if (!pw) return;
    if (pw.length < 6) {
      alert("Password must be at least 6 characters.");
      return;
    }
    setBusyId(u.id);
    const res = await fetch("/api/admin/users", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: u.id, newPassword: pw }),
    });
    setBusyId(null);
    if (res.ok) alert(`Password updated for ${u.username}.`);
    else alert("Could not update password.");
  }

  async function togglePortal(u: User) {
    setBusyId(u.id);
    await fetch("/api/admin/users", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: u.id, portalAccess: !u.portalAccess }),
    });
    await loadUsers();
    setBusyId(null);
  }

  async function toggleTrainer(u: User) {
    setBusyId(u.id);
    await fetch("/api/admin/users", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: u.id, isTrainer: !u.isTrainer }),
    });
    await loadUsers();
    setBusyId(null);
  }

  async function assignTrainer(u: User, trainerId: string) {
    setBusyId(u.id);
    await fetch("/api/admin/users", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: u.id, assignedTrainerId: trainerId || null }),
    });
    await loadUsers();
    setBusyId(null);
  }

  async function removeUser(u: User) {
    if (!confirm(`Delete ${u.username}? This can't be undone.`)) return;
    setBusyId(u.id);
    await fetch("/api/admin/users", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: u.id }),
    });
    await loadUsers();
    setBusyId(null);
  }

  const members = users.filter((u) => u.role !== "admin");
  const approved = members.filter((u) => u.portalAccess).length;
  const trainers = members.filter((u) => u.isTrainer);
  const trainerName = (id?: string | null) =>
    trainers.find((t) => t.id === id)?.username || "";

  return (
    <>
      <Navbar />
      <main className="text-bone min-h-screen">
        <div className="mx-auto max-w-5xl px-6 py-16 md:py-24">
          <p className="glow font-display uppercase tracking-[0.3em] text-electric text-sm mb-5">
            Admin
          </p>
          <h1 className="glow font-display uppercase text-4xl md:text-5xl font-700 leading-tight">
            Member <span className="text-electric">access.</span>
          </h1>
          <p className="mt-5 text-bone/70 leading-relaxed max-w-xl">
            Every registered member can browse the site. Flip the switch to grant
            or revoke access to the <span className="text-electric">Client Portal</span>.
          </p>

          {loading || !authorized ? (
            <p className="mt-12 font-display uppercase tracking-wider text-bone/50">
              Loading…
            </p>
          ) : (
            <>
              <div className="mt-12 mb-4 pb-8 border-b border-bone/15">
                <AdminTools />
              </div>

              {/* Coaching applications */}
              <div className="mt-10 mb-4 pb-10 border-b border-bone/15">
                <p className="glow font-display uppercase tracking-[0.3em] text-electric text-sm mb-2">
                  Applications
                </p>
                <h2 className="glow font-display uppercase text-3xl md:text-4xl font-700 leading-tight mb-2">
                  Coaching{" "}
                  <span className="text-electric">applications.</span>
                  {apps.filter((a) => a.status === "new").length > 0 && (
                    <span className="ml-3 align-middle text-sm bg-electric text-ink px-2 py-1 font-display">
                      {apps.filter((a) => a.status === "new").length} new
                    </span>
                  )}
                </h2>
                <p className="text-bone/60 text-sm mb-6">
                  Submitted from the public Apply page. No Google sign-in needed.
                </p>

                {apps.length === 0 ? (
                  <p className="text-bone/50 font-display uppercase tracking-wider text-sm">
                    No applications yet.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {apps.map((a) => (
                      <div
                        key={a.id}
                        className={
                          "border bg-ink/30 p-5 " +
                          (a.status === "new" ? "border-electric/50" : "border-bone/15") +
                          (a.status === "archived" ? " opacity-50" : "")
                        }
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="font-display uppercase text-lg text-bone">
                              {a.name}
                              <span className="ml-2 text-xs text-bone/40 normal-case tracking-normal">
                                {a.createdAt ? new Date(a.createdAt).toLocaleDateString() : ""}
                              </span>
                            </p>
                            <p className="text-sm text-electric">
                              <a href={`mailto:${a.email}`} className="hover:underline">{a.email}</a>
                              {a.phone ? <span className="text-bone/60"> · {a.phone}</span> : null}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            {["new", "reviewed", "archived"].map((s) => (
                              <button
                                key={s}
                                onClick={() => setAppStatus(a.id, s)}
                                className={
                                  "px-3 py-1.5 text-[10px] font-display uppercase tracking-wider border transition-colors " +
                                  (a.status === s
                                    ? "bg-electric text-ink border-electric"
                                    : "border-bone/25 text-bone/60 hover:border-bone hover:text-bone")
                                }
                              >
                                {s}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-display uppercase tracking-wider">
                          {a.focus && (
                            <span className="border border-bone/20 px-2 py-1 text-bone/70">{a.focus.replace("_", " ")}</span>
                          )}
                          {a.experience && (
                            <span className="border border-bone/20 px-2 py-1 text-bone/70">{a.experience}</span>
                          )}
                        </div>
                        {a.goals && (
                          <p className="mt-3 text-sm text-bone/80 leading-relaxed whitespace-pre-line">
                            <span className="text-bone/40">Goals: </span>{a.goals}
                          </p>
                        )}
                        {a.injuries && (
                          <p className="mt-2 text-sm text-bone/70 leading-relaxed whitespace-pre-line">
                            <span className="text-bone/40">Injuries: </span>{a.injuries}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="border border-bone/15 bg-ink/30 p-5">
                  <p className="font-display text-3xl text-electric font-700">{members.length}</p>
                  <p className="text-xs uppercase tracking-wider text-bone/60 mt-1">Members</p>
                </div>
                <div className="border border-bone/15 bg-ink/30 p-5">
                  <p className="font-display text-3xl text-electric font-700">{approved}</p>
                  <p className="text-xs uppercase tracking-wider text-bone/60 mt-1">Portal access</p>
                </div>
                <div className="border border-bone/15 bg-ink/30 p-5">
                  <p className="font-display text-3xl text-electric font-700">{members.length - approved}</p>
                  <p className="text-xs uppercase tracking-wider text-bone/60 mt-1">Pending</p>
                </div>
                <div className="border border-bone/15 bg-ink/30 p-5">
                  <p className="font-display text-3xl text-electric font-700">{trainers.length}</p>
                  <p className="text-xs uppercase tracking-wider text-bone/60 mt-1">Trainers</p>
                </div>
              </div>

              <div className="mt-10 border border-bone/15 bg-ink/20 overflow-x-auto">
                <table className="w-full text-sm min-w-[880px]">
                  <thead>
                    <tr className="text-bone/50 text-[10px] uppercase tracking-wider border-b border-bone/15">
                      <th className="text-left p-4 font-display">Username</th>
                      <th className="text-left p-4 font-display">Email</th>
                      <th className="text-left p-4 font-display">Access Via</th>
                      <th className="text-left p-4 font-display">Subscription</th>
                      <th className="text-left p-4 font-display">Portal Access</th>
                      <th className="text-left p-4 font-display">Trainer</th>
                      <th className="text-left p-4 font-display">Assigned Trainer</th>
                      <th className="text-right p-4 font-display">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.length === 0 && (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-bone/50">
                          No members yet. Share the site so people can register.
                        </td>
                      </tr>
                    )}
                    {members.map((u) => (
                      <tr key={u.id} className="border-t border-bone/10">
                        <td className="p-4 text-bone/90 font-display uppercase tracking-wider">
                          <span className="inline-flex items-center gap-2">
                            {u.picture ? (
                              <img src={u.picture} alt="" className="h-6 w-6 rounded-full object-cover" />
                            ) : null}
                            {u.username}
                          </span>
                        </td>
                        <td className="p-4 text-bone/70">{u.email}</td>
                        <td className="p-4 text-bone/70 text-xs">
                          {u.portalAccess
                            ? (u.accessType && ACCESS_LABELS[u.accessType]) || "Granted"
                            : "—"}
                        </td>
                        <td className="p-4 text-xs">
                          {u.subscriptionStatus ? (
                            <span
                              className={
                                "font-display uppercase tracking-wider " +
                                (u.subscriptionStatus === "active" || u.subscriptionStatus === "trialing"
                                  ? "text-electric"
                                  : "text-bone/50")
                              }
                            >
                              {u.subscriptionStatus}
                            </span>
                          ) : (
                            <span className="text-bone/40">—</span>
                          )}
                        </td>
                        <td className="p-4">
                          <span
                            className={
                              "inline-block px-3 py-1 text-[10px] font-display uppercase tracking-wider " +
                              (u.portalAccess
                                ? "bg-electric text-ink"
                                : "border border-bone/30 text-bone/60")
                            }
                          >
                            {u.portalAccess ? "Granted" : "Pending"}
                          </span>
                        </td>
                        <td className="p-4">
                          <button
                            onClick={() => toggleTrainer(u)}
                            disabled={busyId === u.id}
                            className={
                              "inline-block px-3 py-1 text-[10px] font-display uppercase tracking-wider transition-colors disabled:opacity-50 " +
                              (u.isTrainer
                                ? "bg-electric text-ink hover:bg-bone"
                                : "border border-bone/30 text-bone/60 hover:border-electric hover:text-electric")
                            }
                          >
                            {u.isTrainer ? "Trainer ✓" : "Make Trainer"}
                          </button>
                        </td>
                        <td className="p-4">
                          {u.isTrainer ? (
                            <span className="text-bone/40 text-xs">—</span>
                          ) : (
                            <select
                              value={u.assignedTrainerId || ""}
                              onChange={(e) => assignTrainer(u, e.target.value)}
                              disabled={busyId === u.id || trainers.length === 0}
                              className="bg-ink/60 border border-bone/20 px-2 py-1.5 text-bone text-xs focus:border-electric outline-none font-display tracking-wider disabled:opacity-50 max-w-[160px]"
                            >
                              <option value="">
                                {trainers.length === 0 ? "No trainers yet" : "Unassigned"}
                              </option>
                              {trainers.map((t) => (
                                <option key={t.id} value={t.id}>
                                  {t.username}
                                </option>
                              ))}
                            </select>
                          )}
                        </td>
                        <td className="p-4 text-right whitespace-nowrap">
                          <button
                            onClick={() => togglePortal(u)}
                            disabled={busyId === u.id}
                            className="font-display uppercase tracking-wider text-xs border border-electric text-electric px-4 py-2 hover:bg-electric hover:text-ink transition-colors disabled:opacity-50"
                          >
                            {u.portalAccess ? "Revoke" : "Grant"}
                          </button>
                          <button
                            onClick={() => resetPassword(u)}
                            disabled={busyId === u.id}
                            className="ml-2 font-display uppercase tracking-wider text-xs border border-bone/20 text-bone/60 px-4 py-2 hover:border-electric hover:text-electric transition-colors disabled:opacity-50"
                          >
                            Reset PW
                          </button>
                          <button
                            onClick={() => removeUser(u)}
                            disabled={busyId === u.id}
                            className="ml-2 font-display uppercase tracking-wider text-xs border border-bone/20 text-bone/60 px-4 py-2 hover:border-bone hover:text-bone transition-colors disabled:opacity-50"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Promo Codes */}
              <div className="mt-16">
                <p className="glow font-display uppercase tracking-[0.3em] text-electric text-sm mb-4">
                  Promo Codes
                </p>
                <h2 className="glow font-display uppercase text-3xl font-700 leading-tight">
                  Discount &amp; <span className="text-electric">free codes.</span>
                </h2>
                <p className="mt-3 text-bone/70 leading-relaxed max-w-2xl text-sm">
                  Create codes members enter at checkout. Use <span className="text-electric">100%</span> for
                  a fully free code. Duration <span className="text-electric">once</span> = first payment only,
                  <span className="text-electric"> forever</span> = every payment, <span className="text-electric">repeating</span> = a set number of months.
                </p>

                {/* Demo attribution stats */}
                {(demoStats.opens.length > 0 || demoStats.signups.length > 0) && (
                  <div className="mt-6 border border-bone/15 bg-ink/30 p-5">
                    <p className="font-display uppercase tracking-wider text-electric text-sm">What drives sign-ups</p>
                    <p className="text-[10px] uppercase tracking-wider text-bone/40 mt-1">Demo opens → sign-ups → conversion, per tool</p>
                    {(() => {
                      const names = Array.from(new Set([...demoStats.opens.map((o: any) => o.tool), ...demoStats.signups.map((s: any) => s.tool)]));
                      const opensOf = (n: string) => demoStats.opens.find((o: any) => o.tool === n)?.opens || 0;
                      const signOf = (n: string) => demoStats.signups.find((s: any) => s.tool === n)?.count || 0;
                      const rows = names.map((n) => ({ n, o: opensOf(n), s: signOf(n) })).sort((a, b) => b.o - a.o);
                      const totO = rows.reduce((x, r) => x + r.o, 0);
                      const totS = rows.reduce((x, r) => x + r.s, 0);
                      return (
                        <table className="mt-4 w-full text-sm">
                          <thead>
                            <tr className="text-bone/50 text-[10px] uppercase tracking-wider border-b border-bone/15">
                              <th className="text-left p-2 font-display">Tool</th>
                              <th className="text-right p-2 font-display">Demo opens</th>
                              <th className="text-right p-2 font-display">Sign-ups</th>
                              <th className="text-right p-2 font-display">Conversion</th>
                            </tr>
                          </thead>
                          <tbody>
                            {rows.map((r) => (
                              <tr key={r.n} className="border-b border-bone/10">
                                <td className="p-2 text-bone/85">{r.n}</td>
                                <td className="p-2 text-right text-bone/70">{r.o}</td>
                                <td className="p-2 text-right text-bone/70">{r.s}</td>
                                <td className="p-2 text-right font-display text-electric">{r.o ? Math.round((r.s / r.o) * 100) + "%" : "—"}</td>
                              </tr>
                            ))}
                            <tr className="border-t border-bone/20">
                              <td className="p-2 font-display uppercase text-bone/80 text-xs">Total</td>
                              <td className="p-2 text-right text-bone/80">{totO}</td>
                              <td className="p-2 text-right text-bone/80">{totS}</td>
                              <td className="p-2 text-right font-display text-electric">{totO ? Math.round((totS / totO) * 100) + "%" : "—"}</td>
                            </tr>
                          </tbody>
                        </table>
                      );
                    })()}
                    <p className="mt-3 text-[10px] text-bone/40">Sign-ups are attributed to the last demo a member opened before creating their account.</p>
                  </div>
                )}

                {/* Preset coaching discounts */}
                <div className="mt-6 border border-electric/40 bg-electric/5 p-5">
                  <p className="font-display uppercase tracking-wider text-electric text-sm">
                    Remote Coaching presets ($400/mo)
                  </p>
                  <p className="text-bone/60 text-xs mt-1 leading-relaxed">
                    One-tap codes that apply <span className="text-electric">every month</span> (forever).
                    First responder & student bring Remote Coaching to <span className="text-electric">$300</span> (25% off);
                    military to <span className="text-electric">$350</span> (12.5% off).
                  </p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      onClick={() => createPreset("FIRSTRESPONDER", 25)}
                      disabled={creating}
                      className="font-display uppercase tracking-wider text-xs border border-electric text-electric px-4 py-2.5 hover:bg-electric hover:text-ink transition-colors disabled:opacity-50"
                    >
                      First Responder → $300
                    </button>
                    <button
                      onClick={() => createPreset("STUDENT", 25)}
                      disabled={creating}
                      className="font-display uppercase tracking-wider text-xs border border-electric text-electric px-4 py-2.5 hover:bg-electric hover:text-ink transition-colors disabled:opacity-50"
                    >
                      Student → $300
                    </button>
                    <button
                      onClick={() => createPreset("MILITARY", 12.5)}
                      disabled={creating}
                      className="font-display uppercase tracking-wider text-xs border border-electric text-electric px-4 py-2.5 hover:bg-electric hover:text-ink transition-colors disabled:opacity-50"
                    >
                      Military → $350
                    </button>
                  </div>
                </div>

                <form onSubmit={createCode} className="mt-6 grid sm:grid-cols-5 gap-3 items-end">
                  <label className="block sm:col-span-2">
                    <span className="text-[10px] uppercase tracking-wider text-bone/50">Code (optional)</span>
                    <input
                      value={form.code}
                      onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                      placeholder="LAUNCH50"
                      className="w-full bg-ink/40 border border-bone/20 px-3 py-2 text-bone mt-1 focus:border-electric outline-none font-display tracking-wider"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[10px] uppercase tracking-wider text-bone/50">% Off</span>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={form.percentOff}
                      onChange={(e) => setForm({ ...form, percentOff: e.target.value })}
                      className="w-full bg-ink/40 border border-bone/20 px-3 py-2 text-bone mt-1 focus:border-electric outline-none"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[10px] uppercase tracking-wider text-bone/50">Duration</span>
                    <select
                      value={form.duration}
                      onChange={(e) => setForm({ ...form, duration: e.target.value })}
                      className="w-full bg-ink/60 border border-bone/20 px-3 py-2 text-bone mt-1 focus:border-electric outline-none"
                    >
                      <option value="once">Once</option>
                      <option value="forever">Forever</option>
                      <option value="repeating">Repeating</option>
                    </select>
                  </label>
                  {form.duration === "repeating" ? (
                    <label className="block">
                      <span className="text-[10px] uppercase tracking-wider text-bone/50">Months</span>
                      <input
                        type="number"
                        min={1}
                        value={form.durationInMonths}
                        onChange={(e) => setForm({ ...form, durationInMonths: e.target.value })}
                        className="w-full bg-ink/40 border border-bone/20 px-3 py-2 text-bone mt-1 focus:border-electric outline-none"
                      />
                    </label>
                  ) : (
                    <div />
                  )}
                  <button
                    type="submit"
                    disabled={creating}
                    className="bg-electric text-ink px-5 py-2.5 font-display uppercase tracking-wider hover:bg-bone transition-colors disabled:opacity-60 sm:col-span-5 sm:w-fit"
                  >
                    {creating ? "Creating…" : "Create Code"}
                  </button>
                </form>

                <div className="mt-8 border border-bone/15 bg-ink/20 overflow-x-auto">
                  <table className="w-full text-sm min-w-[560px]">
                    <thead>
                      <tr className="text-bone/50 text-[10px] uppercase tracking-wider border-b border-bone/15">
                        <th className="text-left p-4 font-display">Code</th>
                        <th className="text-left p-4 font-display">Discount</th>
                        <th className="text-left p-4 font-display">Duration</th>
                        <th className="text-left p-4 font-display">Redeemed</th>
                        <th className="text-left p-4 font-display">Status</th>
                        <th className="text-right p-4 font-display">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {codes.length === 0 && (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-bone/50">
                            No promo codes yet. Create one above.
                          </td>
                        </tr>
                      )}
                      {codes.map((c) => (
                        <tr key={c.id} className="border-t border-bone/10">
                          <td className="p-4 font-display uppercase tracking-wider text-bone">{c.code}</td>
                          <td className="p-4 text-electric font-display">{c.percentOff}% off</td>
                          <td className="p-4 text-bone/70 text-xs">
                            {c.duration === "repeating" ? `${c.durationInMonths} months` : c.duration}
                          </td>
                          <td className="p-4 text-bone/70">
                            {c.timesRedeemed}
                            {c.maxRedemptions ? ` / ${c.maxRedemptions}` : ""}
                          </td>
                          <td className="p-4">
                            <span
                              className={
                                "inline-block px-3 py-1 text-[10px] font-display uppercase tracking-wider " +
                                (c.active ? "bg-electric text-ink" : "border border-bone/30 text-bone/60")
                              }
                            >
                              {c.active ? "Active" : "Off"}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            <button
                              onClick={() => toggleCode(c.id, c.active)}
                              className="font-display uppercase tracking-wider text-xs border border-bone/30 text-bone/70 px-4 py-2 hover:border-electric hover:text-electric transition-colors"
                            >
                              {c.active ? "Disable" : "Enable"}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Coaching video captions */}
              <div className="mt-16">
                <p className="glow font-display uppercase tracking-[0.3em] text-electric text-sm mb-3">
                  Coaching Videos
                </p>
                <h2 className="glow font-display uppercase text-3xl md:text-4xl font-700 leading-tight mb-2">
                  Edit clip <span className="text-electric">captions.</span>
                </h2>
                <p className="text-bone/60 text-sm mb-6">
                  Change the little title shown on each clip in the homepage highlight reel. Saves instantly for all visitors.
                </p>

                <div className="border border-bone/15 bg-ink/20 p-5">
                  <p className="text-[10px] uppercase tracking-wider text-bone/40 mb-3">
                    Drag the ⋮⋮ handle to reorder · edit the text to rename
                  </p>
                  <ul className="grid gap-2">
                    {clipOrder.map((src, idx) => {
                      const c = DEFAULT_CLIPS.find((x) => x.src === src);
                      if (!c) return null;
                      const isHidden = hiddenClips.includes(src);
                      return (
                        <li
                          key={src}
                          draggable
                          onDragStart={() => setDragSrc(src)}
                          onDragOver={(e) => { e.preventDefault(); reorder(src); }}
                          onDragEnd={() => setDragSrc(null)}
                          className={
                            "flex items-center gap-3 border p-2 bg-ink/30 " +
                            (dragSrc === src ? "border-electric " : "border-bone/15 ") +
                            (isHidden ? "opacity-45" : "")
                          }
                        >
                          <span className="cursor-grab active:cursor-grabbing text-bone/40 font-display select-none px-1">⋮⋮</span>
                          <span className="text-bone/40 text-xs w-5 text-right">{idx + 1}</span>
                          <img src={c.poster} alt="" className={"h-12 w-8 object-cover border border-bone/20 shrink-0 " + (isHidden ? "grayscale" : "")} />
                          <input
                            value={clipLabels[src] ?? c.label}
                            onChange={(e) => setClipLabels({ ...clipLabels, [src]: e.target.value })}
                            maxLength={120}
                            disabled={isHidden}
                            className="flex-1 bg-ink/40 border border-bone/20 px-3 py-2 text-bone focus:border-electric outline-none font-display tracking-wider text-sm disabled:opacity-60"
                          />
                          <button
                            type="button"
                            onClick={() => toggleHidden(src)}
                            title={isHidden ? "Show this clip on the homepage" : "Hide this clip from the homepage"}
                            className={
                              "shrink-0 font-display uppercase tracking-wider text-[10px] px-3 py-2 border transition-colors " +
                              (isHidden
                                ? "border-electric text-electric hover:bg-electric hover:text-ink"
                                : "border-bone/25 text-bone/60 hover:border-bone hover:text-bone")
                            }
                          >
                            {isHidden ? "Show" : "Hide"}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                  <p className="mt-3 text-bone/40 text-[11px] uppercase tracking-wider font-display">
                    {hiddenClips.length > 0
                      ? `${hiddenClips.length} clip${hiddenClips.length === 1 ? "" : "s"} hidden · won't show on the homepage after saving`
                      : "Tap Hide to remove a clip from the homepage reel"}
                  </p>
                  <div className="mt-5 flex items-center gap-4">
                    <button
                      onClick={saveCoaching}
                      disabled={savingClips}
                      className="bg-electric text-ink px-6 py-2.5 font-display uppercase tracking-wider hover:bg-bone transition-colors disabled:opacity-60"
                    >
                      {savingClips ? "Saving…" : "Save Order & Captions"}
                    </button>
                    {clipsSaved && (
                      <span className="text-electric font-display uppercase tracking-wider text-xs">✓ Saved</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Coach video testimonials */}
              <div className="mt-16">
                <p className="glow font-display uppercase tracking-[0.3em] text-electric text-sm mb-3">
                  Coach Video Testimonials
                </p>
                <h2 className="glow font-display uppercase text-3xl md:text-4xl font-700 leading-tight mb-2">
                  Add a video to any <span className="text-electric">coach.</span>
                </h2>
                <p className="text-bone/60 text-sm mb-6">
                  Paste a video URL (e.g. an uploaded <code className="text-bone/80">/videos/…mp4</code>) to show a "Hear it first-hand" clip on that coach's profile. Leave the video URL blank and save to remove it.
                </p>
                <div className="grid gap-5">
                  {professionals.map((pro) => {
                    const v = coachVids[pro.slug] || { src: "", poster: "", name: "", detail: "" };
                    const set = (patch: Partial<typeof v>) =>
                      setCoachVids({ ...coachVids, [pro.slug]: { ...v, ...patch } });
                    return (
                      <div key={pro.slug} className="border border-bone/15 bg-ink/20 p-5">
                        <p className="font-display uppercase tracking-wider text-bone mb-3">
                          {pro.name} <span className="text-bone/40 text-xs">/professionals/{pro.slug}</span>
                        </p>
                        <div className="grid sm:grid-cols-2 gap-3">
                          <label className="block sm:col-span-2">
                            <span className="text-[10px] uppercase tracking-wider text-bone/50">Video URL</span>
                            <input value={v.src} onChange={(e) => set({ src: e.target.value })} placeholder="/videos/hutch-testimonial.mp4"
                              className="w-full bg-ink/40 border border-bone/20 px-3 py-2 text-bone mt-1 focus:border-electric outline-none text-sm" />
                          </label>
                          <label className="block sm:col-span-2">
                            <span className="text-[10px] uppercase tracking-wider text-bone/50">Poster URL (optional)</span>
                            <input value={v.poster} onChange={(e) => set({ poster: e.target.value })} placeholder="/videos/hutch-testimonial-poster.jpg"
                              className="w-full bg-ink/40 border border-bone/20 px-3 py-2 text-bone mt-1 focus:border-electric outline-none text-sm" />
                          </label>
                          <label className="block">
                            <span className="text-[10px] uppercase tracking-wider text-bone/50">Name</span>
                            <input value={v.name} onChange={(e) => set({ name: e.target.value })} placeholder="Jimmy McCullough"
                              className="w-full bg-ink/40 border border-bone/20 px-3 py-2 text-bone mt-1 focus:border-electric outline-none text-sm" />
                          </label>
                          <label className="block">
                            <span className="text-[10px] uppercase tracking-wider text-bone/50">Detail / handle</span>
                            <input value={v.detail} onChange={(e) => set({ detail: e.target.value })} placeholder="@handle or short line"
                              className="w-full bg-ink/40 border border-bone/20 px-3 py-2 text-bone mt-1 focus:border-electric outline-none text-sm" />
                          </label>
                        </div>
                        <div className="mt-4">
                          <button
                            onClick={() => saveCoachVideo(pro.slug)}
                            disabled={savingCoachSlug === pro.slug}
                            className="bg-electric text-ink px-5 py-2 font-display uppercase tracking-wider text-sm hover:bg-bone transition-colors disabled:opacity-60"
                          >
                            {savingCoachSlug === pro.slug ? "Saving…" : v.src.trim() ? "Save Video" : "Remove Video"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
