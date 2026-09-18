"use client";

import { useEffect, useState } from "react";

type Client = { id: string; username: string };
type ExRow = { name: string; sets: string; reps: string; load: string; notes: string };
type Program = {
  id: string;
  title: string;
  notes: string;
  clientId: string | null;
  exercises: any[];
  createdAt: string;
};

const emptyRow = (): ExRow => ({ name: "", sets: "", reps: "", load: "", notes: "" });

export default function TrainerPrograms() {
  const [clients, setClients] = useState<Client[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [assignTo, setAssignTo] = useState("");
  const [rows, setRows] = useState<ExRow[]>([emptyRow()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  // ---- Workout scheduling (calendar) ----
  const [schedule, setSchedule] = useState<any[]>([]);
  const [schedClient, setSchedClient] = useState("");
  const [schedProgram, setSchedProgram] = useState("");
  const [schedDate, setSchedDate] = useState("");
  const [schedAutoload, setSchedAutoload] = useState(true);
  const [schedRepeat, setSchedRepeat] = useState(false);
  const [schedMsg, setSchedMsg] = useState("");
  // ---- Per-day override editor ----
  const [editId, setEditId] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editAutoload, setEditAutoload] = useState(true);
  const [editRows, setEditRows] = useState<ExRow[]>([]);
  const [editMsg, setEditMsg] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  async function refreshSchedule(clientId?: string) {
    const cid = clientId !== undefined ? clientId : schedClient;
    const url = cid ? `/api/trainer/schedule?clientId=${encodeURIComponent(cid)}` : "/api/trainer/schedule";
    try {
      const d = await fetch(url).then((r) => (r.ok ? r.json() : { schedule: [] }));
      setSchedule(d.schedule || []);
    } catch { /* ignore */ }
  }

  async function load() {
    const [c, p] = await Promise.all([
      fetch("/api/trainer/clients").then((r) => (r.ok ? r.json() : { clients: [] })),
      fetch("/api/trainer/programs").then((r) => (r.ok ? r.json() : { programs: [] })),
    ]);
    setClients(c.clients || []);
    setPrograms(p.programs || []);
    refreshSchedule();
  }

  async function scheduleWorkout(e: React.FormEvent) {
    e.preventDefault();
    setSchedMsg("");
    if (!schedProgram || !schedDate) { setSchedMsg("Pick a program and a date."); return; }
    const res = await fetch("/api/trainer/schedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ programId: schedProgram, clientId: schedClient || null, date: schedDate, autoload: schedAutoload, repeatWeekly: schedRepeat }),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) { setSchedMsg(d.error || "Could not schedule."); return; }
    setSchedDate("");
    await refreshSchedule();
    setSchedMsg("Scheduled ✓");
  }

  async function delSchedule(id: string) {
    if (!confirm("Remove this day from the calendar?")) return;
    await fetch(`/api/trainer/schedule?id=${id}`, { method: "DELETE" });
    if (editId === id) cancelEdit();
    await refreshSchedule();
  }

  // ---- Override editor helpers ----
  function startEdit(item: any) {
    setEditId(item.id);
    setEditTitle(item.title || "");
    setEditDate(item.date || "");
    setEditAutoload(item.autoload !== false);
    const ex = Array.isArray(item.exercises) ? item.exercises : [];
    setEditRows(ex.length ? ex.map((e: any) => ({ name: e.name || "", sets: String(e.sets ?? ""), reps: String(e.reps ?? ""), load: String(e.load ?? ""), notes: String(e.notes ?? "") })) : [emptyRow()]);
    setEditMsg("");
  }
  function cancelEdit() { setEditId(""); setEditRows([]); setEditMsg(""); }
  function updateEditRow(i: number, field: keyof ExRow, value: string) {
    setEditRows((r) => r.map((row, idx) => (idx === i ? { ...row, [field]: value } : row)));
  }
  function addEditRow() { setEditRows((r) => [...r, emptyRow()]); }
  function removeEditRow(i: number) { setEditRows((r) => (r.length > 1 ? r.filter((_, idx) => idx !== i) : r)); }
  // "Swap" a day to a coach program: overwrite title + exercises from it.
  function swapToProgram(progId: string) {
    if (!progId) return;
    const p = programs.find((x) => x.id === progId);
    if (!p) return;
    setEditTitle(p.title || editTitle);
    const ex = Array.isArray(p.exercises) ? p.exercises : [];
    setEditRows(ex.length ? ex.map((e: any) => ({ name: e.name || "", sets: String(e.sets ?? ""), reps: String(e.reps ?? ""), load: String(e.load ?? ""), notes: String(e.notes ?? "") })) : [emptyRow()]);
  }
  async function saveEdit() {
    setEditSaving(true);
    setEditMsg("");
    const exercises = editRows.map((r) => ({ ...r })).filter((r) => r.name.trim());
    try {
      const res = await fetch("/api/trainer/schedule/item", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editId, title: editTitle, date: editDate, autoload: editAutoload, exercises }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setEditMsg(d.error || "Could not save changes."); return; }
      cancelEdit();
      await refreshSchedule();
    } catch {
      setEditMsg("Could not save changes. Please try again.");
    } finally {
      setEditSaving(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // When the coach picks a specific client, load that client's full block
  // (coach-loaded days + the member's own self-loaded 4-week plan).
  useEffect(() => {
    refreshSchedule(schedClient);
    cancelEdit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schedClient]);

  function updateRow(i: number, field: keyof ExRow, value: string) {
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, [field]: value } : row)));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError("Add a program title.");
      return;
    }
    setSaving(true);
    setError("");
    const exercises = rows.filter((r) => r.name.trim());
    const res = await fetch("/api/trainer/programs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, notes, clientId: assignTo || null, exercises }),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(d.error || "Could not save program.");
    } else {
      setTitle("");
      setNotes("");
      setAssignTo("");
      setRows([emptyRow()]);
      await load();
    }
    setSaving(false);
  }

  async function del(id: string) {
    if (!confirm("Delete this program?")) return;
    await fetch(`/api/trainer/programs?id=${id}`, { method: "DELETE" });
    await load();
  }

  const inputCls = "w-full bg-ink/40 border border-bone/20 px-3 py-2 text-bone focus:border-electric outline-none";
  const labelCls = "text-[10px] uppercase tracking-wider text-bone/50";
  const clientName = (id: string | null) => (id ? clients.find((c) => c.id === id)?.username || "client" : "All clients");

  return (
    <div className="grid gap-10">
      <form onSubmit={save} className="grid gap-4 border border-bone/15 bg-ink/20 p-6">
        <p className="font-display uppercase tracking-wider text-electric text-sm">Write a program</p>
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="block">
            <span className={labelCls}>Program title *</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Week 1 — Lower Power" className={inputCls + " mt-1"} />
          </label>
          <label className="block">
            <span className={labelCls}>Assign to</span>
            <select value={assignTo} onChange={(e) => setAssignTo(e.target.value)} className="w-full bg-ink/60 border border-bone/20 px-3 py-2 text-bone mt-1 focus:border-electric outline-none">
              <option value="">All my clients</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.username}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid gap-2">
          <span className={labelCls}>Exercises</span>
          <div className="hidden sm:grid grid-cols-[2fr_0.7fr_0.7fr_1fr_1.4fr_28px] gap-2 text-[10px] uppercase tracking-wider text-bone/40">
            <span>Exercise</span><span>Sets</span><span>Reps</span><span>Load</span><span>Notes</span><span />
          </div>
          {rows.map((row, i) => (
            <div key={i} className="grid grid-cols-2 sm:grid-cols-[2fr_0.7fr_0.7fr_1fr_1.4fr_28px] gap-2">
              <input value={row.name} onChange={(e) => updateRow(i, "name", e.target.value)} placeholder="Exercise" className={inputCls} />
              <input value={row.sets} onChange={(e) => updateRow(i, "sets", e.target.value)} placeholder="Sets" className={inputCls} />
              <input value={row.reps} onChange={(e) => updateRow(i, "reps", e.target.value)} placeholder="Reps" className={inputCls} />
              <input value={row.load} onChange={(e) => updateRow(i, "load", e.target.value)} placeholder="Load" className={inputCls} />
              <input value={row.notes} onChange={(e) => updateRow(i, "notes", e.target.value)} placeholder="Notes" className={inputCls} />
              <button type="button" onClick={() => setRows((r) => (r.length > 1 ? r.filter((_, idx) => idx !== i) : r))} className="text-bone/40 hover:text-electric">✕</button>
            </div>
          ))}
          <button type="button" onClick={() => setRows((r) => [...r, emptyRow()])} className="justify-self-start font-display uppercase tracking-wider text-xs text-electric hover:text-bone mt-1">
            + Add exercise
          </button>
        </div>

        <label className="block">
          <span className={labelCls}>Notes to client</span>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Coaching notes for this program…" className={inputCls + " mt-1 resize-none"} />
        </label>

        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button type="submit" disabled={saving} className="justify-self-start bg-electric text-ink px-6 py-3 font-display uppercase tracking-wider hover:bg-bone transition-colors disabled:opacity-60">
          {saving ? "Saving…" : "Send Program"}
        </button>
      </form>

      {/* SCHEDULE A WORKOUT (calendar) */}
      <form onSubmit={scheduleWorkout} className="grid gap-4 border border-electric/30 bg-electric/5 p-6">
        <div>
          <p className="font-display uppercase tracking-wider text-electric text-sm">Schedule a workout</p>
          <p className="text-xs text-bone/50 mt-1">Drop a program onto a client&apos;s day. It loads into their tracker automatically and syncs to their linked Google/Apple calendar.</p>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="block">
            <span className={labelCls}>Client</span>
            <select value={schedClient} onChange={(e) => setSchedClient(e.target.value)} className="w-full bg-ink/60 border border-bone/20 px-3 py-2 text-bone mt-1 focus:border-electric outline-none">
              <option value="">All my clients</option>
              {clients.map((c) => (<option key={c.id} value={c.id}>{c.username}</option>))}
            </select>
          </label>
          <label className="block">
            <span className={labelCls}>Program *</span>
            <select value={schedProgram} onChange={(e) => setSchedProgram(e.target.value)} className="w-full bg-ink/60 border border-bone/20 px-3 py-2 text-bone mt-1 focus:border-electric outline-none">
              <option value="">Choose a program…</option>
              {programs.map((p) => (<option key={p.id} value={p.id}>{p.title}</option>))}
            </select>
          </label>
          <label className="block">
            <span className={labelCls}>Date *</span>
            <input type="date" value={schedDate} onChange={(e) => setSchedDate(e.target.value)} className={inputCls + " mt-1"} />
          </label>
          <div className="grid gap-2 self-end">
            <label className="flex items-center gap-2 text-sm text-bone/80">
              <input type="checkbox" checked={schedAutoload} onChange={(e) => setSchedAutoload(e.target.checked)} className="accent-electric" />
              Auto-load into their tracker on the day
            </label>
            <label className="flex items-center gap-2 text-sm text-bone/80">
              <input type="checkbox" checked={schedRepeat} onChange={(e) => setSchedRepeat(e.target.checked)} className="accent-electric" />
              Repeat weekly
            </label>
          </div>
        </div>
        {schedMsg && <p className={"text-sm " + (schedMsg.includes("✓") ? "text-electric" : "text-red-400")}>{schedMsg}</p>}
        <button type="submit" className="justify-self-start bg-electric text-ink px-6 py-3 font-display uppercase tracking-wider hover:bg-bone transition-colors">
          Schedule workout
        </button>
      </form>

      {/* Loaded plan / calendar days — tweak or swap any individual day */}
      {schedule.length > 0 && (
        <div className="border border-bone/15 bg-ink/20 p-6 grid gap-2">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <span className={labelCls}>{schedClient ? `${clientName(schedClient)}'s plan` : "Scheduled days"} ({schedule.length})</span>
            {schedClient && <span className="text-[11px] text-bone/45">Tap Edit to tweak or swap any day. Member-loaded days can be overridden too.</span>}
          </div>
          {schedule.map((s) => (
            <div key={s.id} className="border border-bone/15 bg-ink/30">
              <div className="flex items-center justify-between gap-3 px-3 py-2">
                <span className="text-sm text-bone/80 min-w-0 truncate">
                  <span className="text-electric font-display">{s.date}</span> · {s.title}
                  <span className="text-bone/40"> · {clientName(s.clientId)}{s.repeatWeekly ? " · weekly" : ""}{s.autoload !== false ? " · auto" : ""}</span>
                  {s.source === "self" && <span className="ml-2 text-[9px] uppercase tracking-wider text-bone/50 border border-bone/25 px-1.5 py-0.5">member-loaded</span>}
                  {s.lastEditedByTrainerId && <span className="ml-2 text-[9px] uppercase tracking-wider text-electric/80 border border-electric/40 px-1.5 py-0.5">edited</span>}
                </span>
                <span className="flex items-center gap-2 shrink-0">
                  <button type="button" onClick={() => (editId === s.id ? cancelEdit() : startEdit(s))} className="font-display uppercase tracking-wider text-[10px] text-bone/60 hover:text-electric">{editId === s.id ? "Close" : "Edit"}</button>
                  <button type="button" onClick={() => delSchedule(s.id)} className="text-bone/40 hover:text-electric text-sm">✕</button>
                </span>
              </div>

              {editId === s.id && (
                <div className="border-t border-electric/20 bg-ink/40 p-3 grid gap-3">
                  <div className="grid sm:grid-cols-2 gap-3">
                    <label className="block">
                      <span className={labelCls}>Day title</span>
                      <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className={inputCls + " mt-1"} />
                    </label>
                    <label className="block">
                      <span className={labelCls}>Date</span>
                      <input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} className={inputCls + " mt-1"} />
                    </label>
                  </div>
                  <div className="flex flex-wrap items-center gap-4">
                    <label className="flex items-center gap-2 text-sm text-bone/80">
                      <input type="checkbox" checked={editAutoload} onChange={(e) => setEditAutoload(e.target.checked)} className="accent-electric" />
                      Auto-load into their tracker
                    </label>
                    <label className="flex items-center gap-2 text-xs text-bone/60">
                      Swap to program
                      <select onChange={(e) => { swapToProgram(e.target.value); e.currentTarget.value = ""; }} defaultValue="" className="bg-ink/60 border border-bone/20 px-2 py-1 text-bone focus:border-electric outline-none">
                        <option value="">Choose…</option>
                        {programs.map((p) => (<option key={p.id} value={p.id}>{p.title}</option>))}
                      </select>
                    </label>
                  </div>
                  <div className="grid gap-2">
                    <span className={labelCls}>Exercises</span>
                    {editRows.map((row, i) => (
                      <div key={i} className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-2 items-center">
                        <input value={row.name} onChange={(e) => updateEditRow(i, "name", e.target.value)} placeholder="Exercise" className="bg-ink/60 border border-bone/20 px-2 py-1.5 text-sm text-bone focus:border-electric outline-none" />
                        <input value={row.sets} onChange={(e) => updateEditRow(i, "sets", e.target.value)} placeholder="Sets" className="w-16 bg-ink/60 border border-bone/20 px-2 py-1.5 text-sm text-bone focus:border-electric outline-none" />
                        <input value={row.reps} onChange={(e) => updateEditRow(i, "reps", e.target.value)} placeholder="Reps" className="w-20 bg-ink/60 border border-bone/20 px-2 py-1.5 text-sm text-bone focus:border-electric outline-none" />
                        <input value={row.load} onChange={(e) => updateEditRow(i, "load", e.target.value)} placeholder="Load" className="w-20 bg-ink/60 border border-bone/20 px-2 py-1.5 text-sm text-bone focus:border-electric outline-none" />
                        <button type="button" onClick={() => removeEditRow(i)} className="text-bone/40 hover:text-electric text-sm px-1">✕</button>
                      </div>
                    ))}
                    <button type="button" onClick={addEditRow} className="justify-self-start font-display uppercase tracking-wider text-[10px] text-bone/60 hover:text-electric">+ Add exercise</button>
                  </div>
                  {editMsg && <p className="text-sm text-red-400">{editMsg}</p>}
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={saveEdit} disabled={editSaving} className="bg-electric text-ink px-5 py-2 font-display uppercase tracking-wider text-xs hover:bg-bone transition-colors disabled:opacity-50">{editSaving ? "Saving…" : "Save changes"}</button>
                    <button type="button" onClick={cancelEdit} className="border border-bone/25 text-bone/70 px-4 py-2 font-display uppercase tracking-wider text-xs hover:border-bone hover:text-bone transition-colors">Cancel</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div>
        <p className="font-display uppercase tracking-wider text-bone/60 text-sm mb-4">Your programs ({programs.length})</p>
        {programs.length === 0 ? (
          <p className="text-bone/50 text-sm">No programs yet.</p>
        ) : (
          <div className="grid gap-3">
            {programs.map((p) => (
              <div key={p.id} className="border border-bone/15 bg-ink/20 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-display uppercase tracking-wider text-bone">{p.title}</p>
                    <p className="text-[10px] uppercase tracking-wider text-electric mt-1">{clientName(p.clientId)} · {(p.exercises || []).length} exercises</p>
                  </div>
                  <button onClick={() => del(p.id)} className="text-bone/40 hover:text-electric text-sm">Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
