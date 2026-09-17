"use client";

import { useEffect, useState } from "react";
import PortalHeader from "../../../src/components/portal/PortalHeader";
import Footer from "../../../src/components/Footer";

type ForumProfile = { avatar: string; flair: string; bio: string };
type ForumData = {
  profile: ForumProfile;
  handle: string;
  memberSince: string | null;
  stats: { posts: number; replies: number; bestAnswers: number; karma: number };
  recentPosts: { id: string; title: string; category: string; replyCount: number; createdAt: string; bestAnswerId: boolean }[];
  recentReplies: { id: string; postId: string; postTitle: string; body: string; createdAt: string }[];
};

const AVATARS = ["💪", "🏋️", "⚡", "🦾", "🔥", "🧠", "🐺", "🛡️"];
const FLAIRS = ["", "Strength Athlete", "Powerlifter", "General Fitness", "New to Training", "Nutrition Focus", "Form Check Regular"];

function formattedDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleDateString(undefined, { month: "short", year: "numeric" }) : "—";
}

export default function ForumProfilePage() {
  const [data, setData] = useState<ForumData | null>(null);
  const [form, setForm] = useState<ForumProfile>({ avatar: "💪", flair: "", bio: "" });
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/forum/profile")
      .then(async (res) => {
        if (res.status === 401) { window.location.href = "/login?from=/forum/profile"; return null; }
        return res.ok ? res.json() : null;
      })
      .then((profile) => {
        if (!profile) return;
        setData(profile);
        setForm(profile.profile);
      })
      .catch(() => {});
  }, []);

  async function save() {
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/forum/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(result.error || "Could not save your forum profile.");
      setData((current) => current ? { ...current, profile: result.profile } : current);
      setForm(result.profile);
      setEditing(false);
      setMessage("Forum profile saved.");
    } catch (error: any) {
      setMessage(error?.message || "Could not save your forum profile.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PortalHeader simple />
      <main className="min-h-screen text-bone">
        <div className="mx-auto max-w-4xl px-6 py-14 md:py-20">
          <a href="/forum" className="font-display uppercase tracking-wider text-xs text-bone/55 hover:text-electric">← Back to forum</a>
          {!data ? (
            <p className="mt-10 font-display uppercase tracking-wider text-bone/50">Loading forum profile…</p>
          ) : (
            <>
              <div className="mt-7 border border-electric/35 bg-electric/5 p-6 md:p-8">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-4">
                    <span className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-electric bg-ink text-3xl">{data.profile.avatar}</span>
                    <div>
                      <p className="font-display uppercase tracking-[0.25em] text-electric text-xs">Forum profile</p>
                      <h1 className="mt-1 font-display uppercase text-3xl md:text-4xl">u/{data.handle}</h1>
                      <p className="mt-1 text-xs text-bone/55">Community member since {formattedDate(data.memberSince)}</p>
                    </div>
                  </div>
                  {!editing && <button onClick={() => { setForm(data.profile); setEditing(true); setMessage(""); }} className="border border-electric text-electric px-4 py-2 font-display uppercase tracking-wider text-xs hover:bg-electric hover:text-ink">Edit forum profile</button>}
                </div>

                {editing ? (
                  <div className="mt-6 grid gap-5 max-w-2xl">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-bone/50 mb-2">Community avatar</p>
                      <div className="flex flex-wrap gap-2">
                        {AVATARS.map((avatar) => <button key={avatar} type="button" onClick={() => setForm((current) => ({ ...current, avatar }))} className={"flex h-11 w-11 items-center justify-center border text-xl " + (form.avatar === avatar ? "border-electric bg-electric/10" : "border-bone/20 hover:border-electric")}>{avatar}</button>)}
                      </div>
                    </div>
                    <label>
                      <span className="text-[10px] uppercase tracking-wider text-bone/50">Community flair</span>
                      <select value={form.flair} onChange={(event) => setForm((current) => ({ ...current, flair: event.target.value }))} className="mt-2 w-full bg-ink/50 border border-bone/20 px-3 py-3 text-bone focus:border-electric outline-none">
                        {FLAIRS.map((flair) => <option key={flair || "none"} value={flair}>{flair || "No flair"}</option>)}
                      </select>
                    </label>
                    <label>
                      <span className="text-[10px] uppercase tracking-wider text-bone/50">About you</span>
                      <textarea value={form.bio} onChange={(event) => setForm((current) => ({ ...current, bio: event.target.value.slice(0, 280) }))} rows={4} placeholder="What are you training for, or what kind of conversation do you enjoy here?" className="mt-2 w-full resize-none bg-ink/50 border border-bone/20 px-3 py-3 text-bone focus:border-electric outline-none" />
                      <span className="mt-1 block text-right text-[10px] text-bone/40">{form.bio.length}/280</span>
                    </label>
                    <div className="flex gap-3">
                      <button onClick={save} disabled={saving} className="bg-electric text-ink px-5 py-2.5 font-display uppercase tracking-wider text-xs hover:bg-bone disabled:opacity-50">{saving ? "Saving…" : "Save forum profile"}</button>
                      <button onClick={() => { setForm(data.profile); setEditing(false); }} className="border border-bone/25 text-bone/70 px-5 py-2.5 font-display uppercase tracking-wider text-xs hover:border-bone">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <>
                    {data.profile.flair && <span className="mt-5 inline-block border border-electric/40 px-2 py-1 text-[10px] font-display uppercase tracking-wider text-electric">{data.profile.flair}</span>}
                    <p className="mt-4 max-w-2xl whitespace-pre-wrap text-bone/75 leading-relaxed">{data.profile.bio || "Add a short bio so other members know what you&apos;re here to learn, share, or train for."}</p>
                  </>
                )}
                {message && <p className="mt-4 text-sm text-electric">{message}</p>}
              </div>

              <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[["Karma", data.stats.karma], ["Posts", data.stats.posts], ["Replies", data.stats.replies], ["Best answers", data.stats.bestAnswers]].map(([label, value]) => (
                  <div key={label as string} className="border border-bone/15 bg-ink/20 p-4 text-center">
                    <p className="font-display text-3xl text-electric">{value as number}</p>
                    <p className="mt-1 text-[10px] uppercase tracking-wider text-bone/50">{label as string}</p>
                  </div>
                ))}
              </div>

              <div className="mt-8 grid md:grid-cols-2 gap-5">
                <section className="border border-bone/15 bg-ink/20 p-5">
                  <div className="flex items-center justify-between gap-3"><p className="font-display uppercase tracking-wider text-electric text-sm">Your posts</p><a href="/forum" className="text-xs text-bone/50 hover:text-electric">Open feed →</a></div>
                  {data.recentPosts.length === 0 ? <p className="mt-4 text-sm text-bone/50">No posts yet. Ask your first question or share a win.</p> : <div className="mt-3 grid gap-2">{data.recentPosts.map((post) => <a key={post.id} href={`/forum?thread=${post.id}`} className="border-b border-bone/10 py-2 hover:text-electric"><p className="text-sm text-bone/80 truncate">{post.title}</p><p className="mt-1 text-[10px] uppercase tracking-wider text-bone/40">{post.replyCount} replies {post.bestAnswerId ? "· Answered" : ""}</p></a>)}</div>}
                </section>
                <section className="border border-bone/15 bg-ink/20 p-5">
                  <p className="font-display uppercase tracking-wider text-electric text-sm">Your replies</p>
                  {data.recentReplies.length === 0 ? <p className="mt-4 text-sm text-bone/50">Your helpful replies will appear here.</p> : <div className="mt-3 grid gap-2">{data.recentReplies.map((reply) => <a key={reply.id} href={`/forum?thread=${reply.postId}`} className="border-b border-bone/10 py-2 hover:text-electric"><p className="text-xs text-bone/45">on {reply.postTitle}</p><p className="mt-1 text-sm text-bone/75 line-clamp-2">{reply.body || "Media reply"}</p></a>)}</div>}
                </section>
              </div>

              <div className="mt-8 border border-bone/15 bg-ink/20 p-5 text-sm text-bone/60 leading-relaxed">
                <p className="font-display uppercase tracking-wider text-bone text-xs">Forum identity vs. account settings</p>
                <p className="mt-2">This profile controls only how you show up in the community. Your email, password, billing, and login name stay in your main Tensor account.</p>
                <a href="/account" className="mt-3 inline-block font-display uppercase tracking-wider text-xs text-electric hover:text-bone">Open main account →</a>
              </div>
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
