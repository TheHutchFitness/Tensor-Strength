"use client";

import { useEffect, useRef, useState } from "react";
import PortalHeader from "@/components/portal/PortalHeader";
import Tour from "@/components/portal/Tour";
import Footer from "@/components/Footer";

type Media = { url: string; type: "image" | "video" } | null;
type Post = {
  id: string;
  username: string;
  title: string;
  body: string;
  category?: string;
  mediaUrl: string | null;
  mediaType: string | null;
  replyCount: number;
  likes?: string[];
  createdAt: string;
};

const CATEGORIES = [
  { id: "general", label: "General Discussions" },
  { id: "faq", label: "FAQ" },
  { id: "prs", label: "PRs" },
  { id: "nutrition", label: "Nutrition" },
  { id: "form-checks", label: "Form Checks" },
];
const catLabel = (id?: string) => CATEGORIES.find((c) => c.id === (id || "general"))?.label || "General Discussions";
type Reply = {
  id: string;
  username: string;
  body: string;
  mediaUrl: string | null;
  mediaType: string | null;
  createdAt: string;
};

function MediaView({ url, type }: { url: string; type: string | null }) {
  if (type === "video")
    return <video src={url} controls playsInline className="mt-3 max-h-96 w-auto border border-bone/15 rounded" />;
  return <img src={url} alt="attachment" className="mt-3 max-h-96 w-auto border border-bone/15 rounded" />;
}

function MediaPicker({ media, setMedia }: { media: Media; setMedia: (m: Media) => void }) {
  const [uploading, setUploading] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch("/api/forum/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setMedia({ url: data.url, type: data.type });
    } catch (err: any) {
      alert(err?.message || "Upload failed");
    }
    setUploading(false);
  }

  return (
    <div className="mt-3">
      <input ref={ref} type="file" accept="image/*,video/*" onChange={onPick} className="hidden" />
      <button
        type="button"
        onClick={() => ref.current?.click()}
        disabled={uploading}
        className="border border-bone/30 text-bone/80 px-4 py-2 font-display uppercase tracking-wider text-xs hover:border-electric hover:text-electric transition-colors disabled:opacity-60"
      >
        {uploading ? "Uploading…" : media ? "Change photo / video" : "Attach photo / video"}
      </button>
      {media && (
        <div className="inline-flex items-center gap-3 ml-3 align-middle">
          <MediaView url={media.url} type={media.type} />
          <button type="button" onClick={() => setMedia(null)} className="text-xs text-bone/50 hover:text-electric">
            remove
          </button>
        </div>
      )}
    </div>
  );
}

export default function ForumPage() {
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<Post[]>([]);
  const [me, setMe] = useState<{ id: string; role: string } | null>(null);
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [thread, setThread] = useState<{ post: Post; replies: Reply[] } | null>(null);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("general");
  const [activeCategory, setActiveCategory] = useState("all");
  const [media, setMedia] = useState<Media>(null);
  const [posting, setPosting] = useState(false);

  const [replyBody, setReplyBody] = useState("");
  const [replyMedia, setReplyMedia] = useState<Media>(null);
  const [replying, setReplying] = useState(false);

  async function loadPosts() {
    const res = await fetch("/api/forum/posts");
    if (res.status === 401) {
      window.location.href = "/login?from=/forum";
      return;
    }
    const data = await res.json();
    setPosts(data.posts || []);
    setLoading(false);
  }
  useEffect(() => {
    loadPosts();
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setMe(d?.user ? { id: d.user.id, role: d.user.role } : null))
      .catch(() => {});
  }, []);

  async function toggleLike(id: string) {
    const res = await fetch("/api/forum/like", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId: id }),
    });
    if (res.ok) {
      const d = await res.json();
      setPosts((prev) =>
        prev.map((p) =>
          p.id === id
            ? {
                ...p,
                likes: d.liked
                  ? [...(p.likes || []), me?.id || "x"]
                  : (p.likes || []).filter((u) => u !== me?.id),
              }
            : p
        )
      );
    }
  }

  async function deletePost(id: string) {
    if (!confirm("Delete this post? This can't be undone.")) return;
    const res = await fetch("/api/forum/posts", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) {
      if (openId === id) {
        setOpenId(null);
        setThread(null);
      }
      await loadPosts();
    } else {
      const d = await res.json();
      alert(d.error || "Could not delete");
    }
  }

  const filtered = posts.filter((p) => {
    const cat = p.category || "general";
    if (activeCategory !== "all" && cat !== activeCategory) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      p.title.toLowerCase().includes(q) ||
      (p.body || "").toLowerCase().includes(q) ||
      p.username.toLowerCase().includes(q)
    );
  });

  async function openThread(id: string) {
    setOpenId(id);
    setThread(null);
    const res = await fetch(`/api/forum/thread?id=${id}`);
    const data = await res.json();
    if (res.ok) setThread(data);
  }

  async function createPost(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setPosting(true);
    const res = await fetch("/api/forum/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, body, category, mediaUrl: media?.url, mediaType: media?.type }),
    });
    if (res.ok) {
      setTitle("");
      setBody("");
      setCategory("general");
      setMedia(null);
      await loadPosts();
    }
    setPosting(false);
  }

  async function postReply(e: React.FormEvent) {
    e.preventDefault();
    if (!replyBody.trim() && !replyMedia) return;
    setReplying(true);
    const res = await fetch("/api/forum/replies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId: openId, body: replyBody, mediaUrl: replyMedia?.url, mediaType: replyMedia?.type }),
    });
    if (res.ok) {
      setReplyBody("");
      setReplyMedia(null);
      await openThread(openId!);
      await loadPosts();
    }
    setReplying(false);
  }

  const inputCls = "w-full bg-ink/40 border border-bone/20 px-4 py-3 text-bone focus:border-electric outline-none";

  return (
    <>
      <PortalHeader simple />
      <Tour
        id="forum"
        steps={[
          { title: "Welcome to the Forum", body: "This is the community. Ask questions, share wins, and get form checks from coaches and other members." },
          { title: "Pick a category", body: "When you post, choose the best category — General, FAQ, PRs, Nutrition or Form Checks — and attach a photo or video if it helps." },
          { title: "Be cool", body: "Keep it supportive and on-topic. Like posts that help you and jump in when you can help someone else." },
        ]}
      />
      <main className="text-bone min-h-screen">
        <div className="mx-auto max-w-3xl px-6 py-16 md:py-24">
          <p className="glow font-display uppercase tracking-[0.3em] text-electric text-sm mb-5">
            Community Forum
          </p>

          {!openId ? (
            <>
              <h1 className="glow font-display uppercase text-4xl md:text-5xl font-700 leading-tight">
                Ask. Answer. <span className="text-electric">Improve.</span>
              </h1>
              <p className="mt-4 text-bone/70 leading-relaxed">
                Post a question, drop a form-check video, or help a teammate out. Attach a
                photo or video on any post or reply.
              </p>

              {/* Category nav */}
              <div className="mt-8 flex flex-wrap gap-2 border-b border-bone/15 pb-3">
                {[{ id: "all", label: "All" }, ...CATEGORIES].map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setActiveCategory(c.id)}
                    className={
                      "px-4 py-2 font-display uppercase tracking-wider text-xs transition-colors " +
                      (activeCategory === c.id
                        ? "bg-electric text-ink"
                        : "text-bone/60 hover:text-electric border border-bone/20 hover:border-electric")
                    }
                  >
                    {c.label}
                  </button>
                ))}
              </div>

              {/* New post */}
              <form onSubmit={createPost} className="mt-8 border border-bone/15 bg-ink/30 p-6 grid gap-3">
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Title — e.g. 'Squat form check' or 'Elbow pain on bench?'"
                  className={inputCls}
                />
                <label className="grid gap-1">
                  <span className="text-[10px] uppercase tracking-wider text-bone/50">Category — pick the best fit</span>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-ink/60 border border-bone/20 px-4 py-3 text-bone focus:border-electric outline-none font-display uppercase tracking-wider text-sm"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </select>
                </label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={3}
                  placeholder="Add details… (optional)"
                  className={inputCls + " resize-none"}
                />
                <MediaPicker media={media} setMedia={setMedia} />
                <button
                  type="submit"
                  disabled={posting}
                  className="mt-1 bg-electric text-ink px-6 py-3 font-display uppercase tracking-wider hover:bg-bone transition-colors disabled:opacity-60 w-fit"
                >
                  {posting ? "Posting…" : "Post to Forum"}
                </button>
              </form>

              {/* Search + List */}
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search posts…"
                className="mt-10 w-full bg-ink/40 border border-bone/20 px-4 py-3 text-bone focus:border-electric outline-none"
              />
              <div className="mt-4 grid gap-3">
                {loading ? (
                  <p className="text-bone/50 font-display uppercase tracking-wider">Loading…</p>
                ) : filtered.length === 0 ? (
                  <p className="text-bone/50">
                    {posts.length === 0 ? "No posts yet — be the first to start a thread." : "No posts match your search."}
                  </p>
                ) : (
                  filtered.map((p) => {
                    const liked = !!(me && (p.likes || []).includes(me.id));
                    const canDelete = me && (me.id === (p as any).userId || me.role === "admin");
                    return (
                      <div key={p.id} className="border border-bone/15 bg-ink/30 p-5 hover:border-electric transition-colors">
                        <button onClick={() => openThread(p.id)} className="text-left w-full">
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                              <p className="font-display uppercase tracking-wider text-bone truncate">{p.title}</p>
                              <p className="text-xs text-bone/50 mt-1">
                                <span className="text-electric">{catLabel(p.category)}</span>
                                {" · "}by {p.username} · {new Date(p.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              {p.mediaType && (
                                <span className="text-[10px] font-display uppercase tracking-wider text-electric">
                                  {p.mediaType === "video" ? "▶ video" : "▣ photo"}
                                </span>
                              )}
                              <span className="font-display text-electric">{p.replyCount} ▸</span>
                            </div>
                          </div>
                        </button>
                        <div className="mt-3 flex items-center gap-4 border-t border-bone/10 pt-3">
                          <button
                            onClick={() => toggleLike(p.id)}
                            className={
                              "font-display uppercase tracking-wider text-xs transition-colors " +
                              (liked ? "text-electric" : "text-bone/50 hover:text-electric")
                            }
                          >
                            {liked ? "♥" : "♡"} {(p.likes || []).length} {(p.likes || []).length === 1 ? "like" : "likes"}
                          </button>
                          {canDelete && (
                            <button
                              onClick={() => deletePost(p.id)}
                              className="font-display uppercase tracking-wider text-xs text-bone/40 hover:text-electric transition-colors ml-auto"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          ) : (
            <>
              <button
                onClick={() => {
                  setOpenId(null);
                  setThread(null);
                }}
                className="mb-6 font-display uppercase tracking-wider text-sm text-bone/60 hover:text-electric"
              >
                ← Back to forum
              </button>

              {!thread ? (
                <p className="text-bone/50 font-display uppercase tracking-wider">Loading…</p>
              ) : (
                <>
                  <h1 className="glow font-display uppercase text-3xl md:text-4xl font-700 leading-tight">
                    {thread.post.title}
                  </h1>
                  <p className="text-xs text-bone/50 mt-2">
                    by {thread.post.username} · {new Date(thread.post.createdAt).toLocaleString()}
                  </p>
                  {thread.post.body && <p className="mt-4 text-bone/80 leading-relaxed whitespace-pre-wrap">{thread.post.body}</p>}
                  {thread.post.mediaUrl && <MediaView url={thread.post.mediaUrl} type={thread.post.mediaType} />}

                  <div className="mt-10 border-t border-bone/10 pt-6">
                    <p className="glow font-display uppercase tracking-[0.3em] text-electric text-sm mb-4">
                      {thread.replies.length} {thread.replies.length === 1 ? "Reply" : "Replies"}
                    </p>
                    <div className="grid gap-4">
                      {thread.replies.map((r) => (
                        <div key={r.id} className="border border-bone/15 bg-ink/30 p-5">
                          <p className="text-xs text-bone/50">
                            <span className="text-bone/80 font-display uppercase tracking-wider">{r.username}</span>{" "}
                            · {new Date(r.createdAt).toLocaleString()}
                          </p>
                          {r.body && <p className="mt-2 text-bone/80 leading-relaxed whitespace-pre-wrap">{r.body}</p>}
                          {r.mediaUrl && <MediaView url={r.mediaUrl} type={r.mediaType} />}
                        </div>
                      ))}
                    </div>

                    <form onSubmit={postReply} className="mt-8 border border-bone/15 bg-ink/30 p-6 grid gap-3">
                      <textarea
                        value={replyBody}
                        onChange={(e) => setReplyBody(e.target.value)}
                        rows={3}
                        placeholder="Write a reply…"
                        className={inputCls + " resize-none"}
                      />
                      <MediaPicker media={replyMedia} setMedia={setReplyMedia} />
                      <button
                        type="submit"
                        disabled={replying}
                        className="mt-1 bg-electric text-ink px-6 py-3 font-display uppercase tracking-wider hover:bg-bone transition-colors disabled:opacity-60 w-fit"
                      >
                        {replying ? "Posting…" : "Post Reply"}
                      </button>
                    </form>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
