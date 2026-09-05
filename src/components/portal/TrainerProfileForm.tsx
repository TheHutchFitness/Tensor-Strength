"use client";

import { useEffect, useRef, useState } from "react";

export default function TrainerProfileForm({ onSaved }: { onSaved?: () => void }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [savedFlash, setSavedFlash] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    displayName: "",
    photo: "",
    trainerType: "",
    location: "",
    shortBio: "",
    bio: "",
    certifications: "",
    specialties: "",
  });

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/trainer/profile");
      if (res.ok) {
        const d = await res.json();
        const p = d.profile;
        if (p) {
          setForm({
            displayName: p.displayName || "",
            photo: p.photo || "",
            trainerType: p.trainerType || "",
            location: p.location || "",
            shortBio: p.shortBio || "",
            bio: p.bio || "",
            certifications: (p.certifications || []).join("\n"),
            specialties: (p.specialties || []).join(", "),
          });
        }
      }
      setLoading(false);
    })();
  }, []);

  async function onPickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    setUploading(true);
    setError("");
    const fd = new FormData();
    fd.append("file", file);
    fd.append("visibility", "public");
    const res = await fetch("/api/uploads/file", { method: "POST", body: fd });
    if (res.ok) {
      const d = await res.json();
      setForm((f) => ({ ...f, photo: d.url }));
    } else {
      setError("Photo upload failed.");
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch("/api/trainer/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        displayName: form.displayName,
        photo: form.photo,
        trainerType: form.trainerType,
        location: form.location,
        shortBio: form.shortBio,
        bio: form.bio,
        certifications: form.certifications.split("\n").map((s) => s.trim()).filter(Boolean),
        specialties: form.specialties.split(",").map((s) => s.trim()).filter(Boolean),
      }),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(d.error || "Could not save profile.");
    } else {
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2500);
      if (onSaved) onSaved();
    }
    setSaving(false);
  }

  const inputCls =
    "w-full bg-ink/40 border border-bone/20 px-3 py-2.5 text-bone mt-1 focus:border-electric outline-none";
  const labelCls = "text-[10px] uppercase tracking-wider text-bone/50";

  if (loading) return <p className="text-bone/50 text-sm">Loading profile…</p>;

  return (
    <form onSubmit={save} className="grid gap-6 max-w-2xl">
      <div className="flex items-center gap-5">
        {form.photo ? (
          <img src={form.photo} alt="" className="h-24 w-24 object-cover rounded-full border-2 border-electric" />
        ) : (
          <div className="h-24 w-24 rounded-full border-2 border-dashed border-bone/30 flex items-center justify-center text-bone/40 text-xs text-center px-2">
            No photo
          </div>
        )}
        <div>
          <input ref={fileRef} type="file" accept="image/*" onChange={onPickPhoto} className="hidden" />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="border border-electric text-electric px-4 py-2 font-display uppercase tracking-wider text-xs hover:bg-electric hover:text-ink transition-colors disabled:opacity-50"
          >
            {uploading ? "Uploading…" : form.photo ? "Change photo" : "Upload photo"}
          </button>
          <p className={labelCls + " mt-2"}>Shown on your public profile.</p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <label className="block">
          <span className={labelCls}>Display name</span>
          <input value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} placeholder="Coach name" className={inputCls} />
        </label>
        <label className="block">
          <span className={labelCls}>Type of trainer *</span>
          <input value={form.trainerType} onChange={(e) => setForm({ ...form, trainerType: e.target.value })} placeholder="e.g. Strength & Performance Coach" className={inputCls} />
        </label>
      </div>

      <label className="block">
        <span className={labelCls}>Location</span>
        <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="e.g. Paris, ON" className={inputCls} />
      </label>

      <label className="block">
        <span className={labelCls}>Short bio (one-liner for the card)</span>
        <input value={form.shortBio} onChange={(e) => setForm({ ...form, shortBio: e.target.value })} placeholder="One sentence about you" className={inputCls} />
      </label>

      <label className="block">
        <span className={labelCls}>Full bio * (one paragraph per line)</span>
        <textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} rows={5} placeholder="Tell clients about your background and approach…" className={inputCls + " resize-none"} />
      </label>

      <label className="block">
        <span className={labelCls}>Certifications (one per line)</span>
        <textarea value={form.certifications} onChange={(e) => setForm({ ...form, certifications: e.target.value })} rows={4} placeholder={"e.g. NASM CPT\nCSCS\nPrecision Nutrition L1"} className={inputCls + " resize-none"} />
      </label>

      <label className="block">
        <span className={labelCls}>Specialties (comma separated)</span>
        <input value={form.specialties} onChange={(e) => setForm({ ...form, specialties: e.target.value })} placeholder="Strength, Hypertrophy, Powerlifting" className={inputCls} />
      </label>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <div className="flex items-center gap-4">
        <button type="submit" disabled={saving} className="bg-electric text-ink px-6 py-3 font-display uppercase tracking-wider hover:bg-bone transition-colors disabled:opacity-60">
          {saving ? "Saving…" : "Save Profile"}
        </button>
        {savedFlash && <span className="font-display uppercase tracking-wider text-sm text-electric">✓ Saved — live on your public profile.</span>}
      </div>
    </form>
  );
}
