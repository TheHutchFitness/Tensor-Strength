"use client";

import { useEffect, useRef, useState } from "react";
import PortalHeader from "@/components/portal/PortalHeader";
import Tour from "@/components/portal/Tour";
import Footer from "@/components/Footer";
import SiteTabBar from "@/components/SiteTabBar";

type Media = { url: string; type: "image" | "video" } | null;
type Reactions = Record<string, string[]>;
type Post = {
  id: string;
  userId?: string;
  username: string;
  title: string;
  body: string;
  category?: string;
  mediaUrl: string | null;
  mediaType: string | null;
  replyCount: number;
  likes?: string[];
  bestAnswerId?: string | null;
  reactions?: Reactions;
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
  userId?: string;
  username: string;
  body: string;
  mediaUrl: string | null;
  mediaType: string | null;
  reactions?: Reactions;
  createdAt: string;
};

const EMOJIS = ["👍", "🔥", "💪", "👏", "😂", "❤️"];

type Notification = {
  id: string;
  actorName: string;
  type: "mention" | "reply" | "best-answer" | "reaction" | "announcement";
  postId: string | null;
  postTitle: string;
  replyId: string | null;
  emoji?: string | null;
  targetType?: string | null;
  snippet: string;
  read: boolean;
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

function ReactionBar({
  reactions,
  meId,
  onReact,
}: {
  reactions?: Reactions;
  meId?: string;
  onReact: (emoji: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const active = Object.entries(reactions || {}).filter(([, u]) => (u || []).length > 0);
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {active.map(([emoji, users]) => {
        const mine = !!(meId && users.includes(meId));
        return (
          <button
            key={emoji}
            onClick={() => onReact(emoji)}
            className={
              "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors " +
              (mine ? "border-electric text-electric bg-electric/10" : "border-bone/20 text-bone/60 hover:border-electric")
            }
          >
            <span>{emoji}</span>
            <span className="font-display">{users.length}</span>
          </button>
        );
      })}
      <div className="relative">
        <button
          onClick={() => setOpen((o) => !o)}
          className="rounded-full border border-bone/20 text-bone/50 hover:text-electric hover:border-electric px-2 py-0.5 text-xs transition-colors"
          title="Add reaction"
        >
          + 😀
        </button>
        {open && (
          <div className="absolute z-20 mt-1 flex gap-1 rounded-md border border-bone/20 bg-ink p-1.5 shadow-xl">
            {EMOJIS.map((e) => (
              <button
                key={e}
                onClick={() => {
                  onReact(e);
                  setOpen(false);
                }}
                className="text-lg hover:scale-125 transition-transform"
              >
                {e}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// A textarea with @mention autocomplete driven by a members list.
function MentionTextarea({
  value,
  onChange,
  members,
  placeholder,
  rows = 3,
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  members: { username: string; isCoach: boolean }[];
  placeholder?: string;
  rows?: number;
  className?: string;
}) {
  const [suggest, setSuggest] = useState<{ username: string; isCoach: boolean }[]>([]);
  const ref = useRef<HTMLTextAreaElement>(null);

  function recompute(text: string, caret: number) {
    const upto = text.slice(0, caret);
    const at = upto.lastIndexOf("@");
    if (at === -1) return setSuggest([]);
    // Only trigger if @ is at start or preceded by whitespace.
    if (at > 0 && !/\s/.test(upto[at - 1])) return setSuggest([]);
    const query = upto.slice(at + 1).toLowerCase();
    if (query.length > 30 || query.includes("\n")) return setSuggest([]);
    const matches = members
      .filter((m) => m.username.toLowerCase().startsWith(query))
      .slice(0, 6);
    setSuggest(query.length === 0 ? members.slice(0, 6) : matches);
  }

  function pick(username: string) {
    const el = ref.current;
    const caret = el ? el.selectionStart : value.length;
    const upto = value.slice(0, caret);
    const at = upto.lastIndexOf("@");
    const next = value.slice(0, at) + "@" + username + " " + value.slice(caret);
    onChange(next);
    setSuggest([]);
    setTimeout(() => el?.focus(), 0);
  }

  return (
    <div className="relative">
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          recompute(e.target.value, e.target.selectionStart);
        }}
        onKeyUp={(e) => recompute((e.target as HTMLTextAreaElement).value, (e.target as HTMLTextAreaElement).selectionStart)}
        onBlur={() => setTimeout(() => setSuggest([]), 150)}
        rows={rows}
        placeholder={placeholder}
        className={className}
      />
      {suggest.length > 0 && (
        <div className="absolute z-30 mt-1 w-64 max-h-56 overflow-auto rounded-md border border-bone/20 bg-ink shadow-xl">
          {suggest.map((m) => (
            <button
              key={m.username}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                pick(m.username);
              }}
              className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm text-bone/80 hover:bg-electric/10 hover:text-electric"
            >
              <span>@{m.username}</span>
              {m.isCoach && <span className="text-[9px] font-display uppercase tracking-wider text-electric">Coach</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Render body text with @mentions of known members highlighted.
function highlightMentions(text: string, members: { username: string }[]) {
  if (!text) return null;
  if (!members.length || !text.includes("@")) return text;
  // Longest usernames first so multi-word names win over prefixes.
  const names = members.map((m) => m.username).sort((a, b) => b.length - a.length);
  const parts: (string | JSX.Element)[] = [];
  let i = 0;
  let key = 0;
  while (i < text.length) {
    if (text[i] === "@") {
      const rest = text.slice(i + 1);
      const hit = names.find((n) => rest.toLowerCase().startsWith(n.toLowerCase()));
      if (hit) {
        parts.push(
          <span key={key++} className="text-electric font-medium">
            @{text.slice(i + 1, i + 1 + hit.length)}
          </span>
        );
        i += 1 + hit.length;
        continue;
      }
    }
    // accumulate a run of plain text
    const last = parts[parts.length - 1];
    if (typeof last === "string") parts[parts.length - 1] = last + text[i];
    else parts.push(text[i]);
    i++;
  }
  return parts;
}

export default function ForumPage() {
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<Post[]>([]);
  const [me, setMe] = useState<{ id: string; role: string; isTrainer?: boolean } | null>(null);
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [thread, setThread] = useState<{ post: Post; replies: Reply[] } | null>(null);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("general");
  const [activeCategory, setActiveCategory] = useState("all");
  const [sort, setSort] = useState<"recent" | "popular">("recent");
  const [media, setMedia] = useState<Media>(null);
  const [posting, setPosting] = useState(false);

  const [replyBody, setReplyBody] = useState("");
  const [replyMedia, setReplyMedia] = useState<Media>(null);
  const [replying, setReplying] = useState(false);

  const [members, setMembers] = useState<{ username: string; isCoach: boolean }[]>([]);
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const [focusReplyId, setFocusReplyId] = useState<string | null>(null);
  const [notifyClients, setNotifyClients] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [replyOpen, setReplyOpen] = useState(false);
  const [pullDist, setPullDist] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const pullRef = useRef(0);

  // Pull-to-refresh on the forum list (mobile). Only active in the list view.
  useEffect(() => {
    if (openId) return;
    let startY = 0;
    let pulling = false;
    const THRESH = 70;
    const setP = (d: number) => {
      pullRef.current = d;
      setPullDist(d);
    };
    const onStart = (e: TouchEvent) => {
      if (window.scrollY > 0) {
        pulling = false;
        return;
      }
      startY = e.touches[0].clientY;
      pulling = true;
    };
    const onMove = (e: TouchEvent) => {
      if (!pulling) return;
      const dy = e.touches[0].clientY - startY;
      if (dy > 0 && window.scrollY <= 0) {
        const d = Math.min(dy * 0.5, 90);
        setP(d);
        if (d > 5 && e.cancelable) e.preventDefault();
      } else {
        setP(0);
      }
    };
    const onEnd = async () => {
      if (!pulling) return;
      pulling = false;
      if (pullRef.current >= THRESH) {
        try { (navigator as any).vibrate?.(15); } catch {}
        setRefreshing(true);
        setP(45);
        await loadPosts();
        setRefreshing(false);
      }
      setP(0);
    };
    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openId]);

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

  async function loadNotifs() {
    try {
      const res = await fetch("/api/forum/notifications");
      if (!res.ok) return;
      const d = await res.json();
      setNotifs(d.notifications || []);
      setUnread(d.unread || 0);
    } catch {}
  }

  useEffect(() => {
    loadPosts();
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setMe(d?.user ? { id: d.user.id, role: d.user.role, isTrainer: d.user.isTrainer } : null))
      .catch(() => {});
    fetch("/api/forum/members")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setMembers(d?.members || []))
      .catch(() => {});
    loadNotifs();
    const t = setInterval(loadNotifs, 30000);
    return () => clearInterval(t);
  }, []);

  async function openNotifs() {
    const willOpen = !notifOpen;
    setNotifOpen(willOpen);
    if (willOpen && unread > 0) {
      await fetch("/api/forum/notifications/read", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      setUnread(0);
      setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
    }
  }

  async function react(targetType: "post" | "reply", targetId: string, emoji: string) {
    const res = await fetch("/api/forum/react", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetType, targetId, emoji }),
    });
    if (!res.ok) return;
    const d = await res.json();
    if (targetType === "post") {
      setPosts((prev) => prev.map((p) => (p.id === targetId ? { ...p, reactions: d.reactions } : p)));
      setThread((t) => (t && t.post.id === targetId ? { ...t, post: { ...t.post, reactions: d.reactions } } : t));
    } else {
      setThread((t) =>
        t ? { ...t, replies: t.replies.map((r) => (r.id === targetId ? { ...r, reactions: d.reactions } : r)) } : t
      );
    }
  }

  async function markBestAnswer(replyId: string | null) {
    if (!openId) return;
    const res = await fetch("/api/forum/best-answer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId: openId, replyId }),
    });
    if (res.ok) {
      const d = await res.json();
      setThread((t) => (t ? { ...t, post: { ...t.post, bestAnswerId: d.bestAnswerId } } : t));
    } else {
      const d = await res.json().catch(() => ({}));
      alert(d.error || "Could not update best answer");
    }
  }

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
  }).sort((a, b) => {
    if (sort === "popular") return (b.likes?.length || 0) - (a.likes?.length || 0);
    return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
  });

  // Helper leaderboard: members ranked by total likes received on their posts.
  const leaderboard = (() => {
    const tally: Record<string, number> = {};
    for (const p of posts) tally[p.username] = (tally[p.username] || 0) + (p.likes?.length || 0);
    return Object.entries(tally).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]).slice(0, 5);
  })();

  async function openThread(id: string, replyId?: string | null) {
    setOpenId(id);
    setThread(null);
    setFocusReplyId(replyId || null);
    const res = await fetch(`/api/forum/thread?id=${id}`);
    const data = await res.json();
    if (res.ok) setThread(data);
  }

  // After a thread loads via a notification, scroll to and briefly highlight
  // the exact reply that was referenced.
  useEffect(() => {
    if (!thread || !focusReplyId) return;
    const el = document.getElementById(`reply-${focusReplyId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("ring-2", "ring-electric");
      const t = setTimeout(() => {
        el.classList.remove("ring-2", "ring-electric");
        setFocusReplyId(null);
      }, 2600);
      return () => clearTimeout(t);
    }
    setFocusReplyId(null);
  }, [thread, focusReplyId]);

  async function createPost(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setPosting(true);
    const isCoach = !!(me && (me.isTrainer || me.role === "admin"));
    const res = await fetch("/api/forum/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, body, category, mediaUrl: media?.url, mediaType: media?.type, notifyClients: isCoach && notifyClients }),
    });
    if (res.ok) {
      setTitle("");
      setBody("");
      setCategory("general");
      setMedia(null);
      setNotifyClients(false);
      setComposerOpen(false);
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
      setReplyOpen(false);
      await openThread(openId!);
      await loadPosts();
    }
    setReplying(false);
  }

  const inputCls = "w-full bg-ink/40 border border-bone/20 px-4 py-3 text-bone focus:border-electric outline-none";

  // Composer fields — reused by the inline desktop form and the mobile sheet.
  const composerFields = (
    <>
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
      <MentionTextarea
        value={body}
        onChange={setBody}
        members={members}
        rows={3}
        placeholder="Add details… Use @ to mention someone (optional)"
        className={inputCls + " resize-none"}
      />
      <MediaPicker media={media} setMedia={setMedia} />
      {me && (me.isTrainer || me.role === "admin") && (
        <label className="flex items-center gap-3 border border-electric/40 bg-electric/5 px-4 py-3 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={notifyClients}
            onChange={(e) => setNotifyClients(e.target.checked)}
            className="h-4 w-4 accent-electric"
          />
          <span className="text-sm text-bone/80">
            <span className="font-display uppercase tracking-wider text-electric">📢 Coach Broadcast</span>
            <span className="block text-xs text-bone/50 mt-0.5">Notify all of your assigned clients about this post.</span>
          </span>
        </label>
      )}
      <button
        type="submit"
        disabled={posting}
        className="mt-1 bg-electric text-ink px-6 py-3 font-display uppercase tracking-wider hover:bg-bone transition-colors disabled:opacity-60 w-fit"
      >
        {posting ? "Posting…" : notifyClients ? "Post & Notify Clients" : "Post to Forum"}
      </button>
    </>
  );

  // Reply fields — reused by the inline desktop form and the mobile sheet.
  const replyFields = (
    <>
      <MentionTextarea
        value={replyBody}
        onChange={setReplyBody}
        members={members}
        rows={3}
        placeholder="Write a reply… Use @ to mention someone"
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
    </>
  );

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
        <div className="flex items-start justify-between gap-4 mb-5">
          <p className="glow font-display uppercase tracking-[0.3em] text-electric text-sm">
            Community Forum
          </p>
          <div className="relative">
            <button
              onClick={openNotifs}
              className="relative border border-bone/20 hover:border-electric text-bone/70 hover:text-electric px-3 py-1.5 rounded-md transition-colors"
              title="Notifications"
            >
              <span className="text-lg leading-none">🔔</span>
              {unread > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-electric text-ink text-[10px] font-display flex items-center justify-center">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </button>
            {notifOpen && (
              <div className="absolute right-0 z-40 mt-2 w-80 max-h-96 overflow-auto rounded-md border border-bone/20 bg-ink shadow-2xl">
                <div className="px-4 py-3 border-b border-bone/15 flex items-center justify-between">
                  <span className="font-display uppercase tracking-wider text-electric text-xs">Notifications</span>
                  <button onClick={() => setNotifOpen(false)} className="text-bone/40 hover:text-electric text-sm">✕</button>
                </div>
                {notifs.length === 0 ? (
                  <p className="px-4 py-6 text-sm text-bone/50">Nothing yet. Mentions and replies will show up here.</p>
                ) : (
                  notifs.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => {
                        setNotifOpen(false);
                        if (n.postId) openThread(n.postId, n.replyId);
                      }}
                      className={
                        "block w-full text-left px-4 py-3 border-b border-bone/10 hover:bg-electric/5 transition-colors " +
                        (n.read ? "" : "bg-electric/[0.04]")
                      }
                    >
                      <p className="text-sm text-bone/80">
                        <span className="text-electric font-display uppercase tracking-wider">{n.actorName}</span>{" "}
                        {n.type === "mention"
                          ? "mentioned you"
                          : n.type === "best-answer"
                          ? "marked your answer as best"
                          : n.type === "reaction"
                          ? `reacted ${n.emoji || "👍"} to your ${n.targetType === "reply" ? "reply" : "post"}`
                          : n.type === "announcement"
                          ? "posted an announcement for you"
                          : "replied to your post"}
                      </p>
                      {n.postTitle && <p className="text-xs text-bone/50 mt-0.5 truncate">on “{n.postTitle}”</p>}
                      <p className="text-[10px] text-bone/40 mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

          {!openId ? (
            <>
              {/* Pull-to-refresh indicator (mobile) */}
              {pullDist > 0 && (
                <div
                  className="md:hidden -mt-2 mb-1 flex items-center justify-center overflow-hidden text-electric font-display uppercase tracking-wider text-[11px] transition-[height]"
                  style={{ height: pullDist }}
                >
                  {refreshing ? "Refreshing…" : pullDist >= 70 ? "↑ Release to refresh" : "↓ Pull to refresh"}
                </div>
              )}
              <h1 className="glow font-display uppercase text-4xl md:text-5xl font-700 leading-tight">
                Ask. Answer. <span className="text-electric">Improve.</span>
              </h1>
              <p className="mt-4 text-bone/70 leading-relaxed">
                Post a question, drop a form-check video, or help a teammate out. Attach a
                photo or video on any post or reply.
              </p>
              <p className="mt-3 inline-flex items-center gap-2 font-display uppercase tracking-wider text-xs text-bone/60">
                <span className="h-2 w-2 rounded-full bg-electric animate-pulse" aria-hidden />
                {members.length.toLocaleString()} {members.length === 1 ? "member" : "members"} in the community
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

              {/* New post — inline on desktop */}
              <form onSubmit={createPost} className="hidden md:grid mt-6 sm:mt-8 border border-bone/15 bg-ink/30 p-4 sm:p-6 gap-3">
                {composerFields}
              </form>

              {/* Mobile: floating + button opens a slide-up composer sheet */}
              <button
                onClick={() => setComposerOpen(true)}
                aria-label="New post"
                className="md:hidden fixed right-4 bottom-20 z-[60] h-14 w-14 rounded-full bg-electric text-ink flex items-center justify-center shadow-xl shadow-electric/40 active:scale-95 transition-transform"
              >
                <span className="text-3xl leading-none -mt-0.5">+</span>
              </button>
              {composerOpen && (
                <div className="md:hidden fixed inset-0 z-[80]">
                  <div className="absolute inset-0 bg-black/60" onClick={() => setComposerOpen(false)} />
                  <div className="absolute inset-x-0 bottom-0 max-h-[90vh] overflow-y-auto bg-ink border-t-2 border-electric rounded-t-2xl p-4 pb-8 animate-[slideUp_.22s_ease-out]">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-display uppercase tracking-[0.2em] text-electric text-sm">New Post</span>
                      <button onClick={() => setComposerOpen(false)} className="text-bone/50 hover:text-electric text-2xl leading-none">✕</button>
                    </div>
                    <form onSubmit={createPost} className="grid gap-3">
                      {composerFields}
                    </form>
                  </div>
                </div>
              )}

              {/* Search + List */}
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search posts…"
                className="mt-10 w-full bg-ink/40 border border-bone/20 px-4 py-3 text-bone focus:border-electric outline-none"
              />
              {leaderboard.length > 0 && (
                <div className="mt-4 border border-bone/15 bg-ink/20 p-4">
                  <p className="font-display uppercase tracking-wider text-electric text-xs mb-2">🏆 Top helpers</p>
                  <div className="flex flex-wrap gap-x-5 gap-y-1">
                    {leaderboard.map(([name, n], i) => (
                      <span key={name} className="text-sm text-bone/70">
                        <span className="text-bone/40">{i + 1}.</span> <span className="font-display uppercase tracking-wider text-bone">{name}</span> <span className="text-electric">· {n} ♥</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <div className="mt-4 flex gap-2">
                {(["recent", "popular"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setSort(s)}
                    className={"px-3 py-1.5 font-display uppercase tracking-wider text-[11px] transition-colors " + (sort === s ? "bg-electric text-ink" : "text-bone/60 border border-bone/20 hover:text-electric")}
                  >
                    {s === "recent" ? "Recent" : "Most liked"}
                  </button>
                ))}
              </div>
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
                      <div key={p.id} className="border border-bone/15 bg-ink/30 p-4 sm:p-5 hover:border-electric transition-colors">
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
                              {p.bestAnswerId && (
                                <span className="text-[10px] font-display uppercase tracking-wider text-emerald-400">✓ Answered</span>
                              )}
                              {p.mediaType && (
                                <span className="text-[10px] font-display uppercase tracking-wider text-electric">
                                  {p.mediaType === "video" ? "▶ video" : "▣ photo"}
                                </span>
                              )}
                              <span className="font-display text-electric">{p.replyCount} ▸</span>
                            </div>
                          </div>
                        </button>
                        <div className="mt-3 flex items-center gap-4 border-t border-bone/10 pt-3 flex-wrap">
                          <button
                            onClick={() => toggleLike(p.id)}
                            className={
                              "font-display uppercase tracking-wider text-xs transition-colors " +
                              (liked ? "text-electric" : "text-bone/50 hover:text-electric")
                            }
                          >
                            {liked ? "♥" : "♡"} {(p.likes || []).length} {(p.likes || []).length === 1 ? "like" : "likes"}
                          </button>
                          <ReactionBar reactions={p.reactions} meId={me?.id} onReact={(e) => react("post", p.id, e)} />
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
                  {thread.post.body && (
                    <p className="mt-4 text-bone/80 leading-relaxed whitespace-pre-wrap">
                      {highlightMentions(thread.post.body, members)}
                    </p>
                  )}
                  {thread.post.mediaUrl && <MediaView url={thread.post.mediaUrl} type={thread.post.mediaType} />}
                  <div className="mt-4">
                    <ReactionBar reactions={thread.post.reactions} meId={me?.id} onReact={(e) => react("post", thread.post.id, e)} />
                  </div>

                  <div className="mt-6 sm:mt-10 border-t border-bone/10 pt-5 sm:pt-6">
                    <p className="glow font-display uppercase tracking-[0.3em] text-electric text-sm mb-4">
                      {thread.replies.length} {thread.replies.length === 1 ? "Reply" : "Replies"}
                    </p>
                    <div className="grid gap-3 sm:gap-4">
                      {(() => {
                        const canMarkBest = !!(
                          me &&
                          (me.id === thread.post.userId || me.isTrainer || me.role === "admin")
                        );
                        const sorted = [...thread.replies].sort((a, b) => {
                          if (a.id === thread.post.bestAnswerId) return -1;
                          if (b.id === thread.post.bestAnswerId) return 1;
                          return 0;
                        });
                        return sorted.map((r) => {
                          const isBest = thread.post.bestAnswerId === r.id;
                          return (
                            <div
                              key={r.id}
                              id={`reply-${r.id}`}
                              className={
                                "border p-4 sm:p-5 transition-all rounded-sm " +
                                (isBest
                                  ? "border-emerald-500/60 bg-emerald-500/[0.06]"
                                  : "border-bone/15 bg-ink/30")
                              }
                            >
                              <div className="flex items-center justify-between gap-3 flex-wrap">
                                <p className="text-xs text-bone/50">
                                  <span className="text-bone/80 font-display uppercase tracking-wider">{r.username}</span>{" "}
                                  · {new Date(r.createdAt).toLocaleString()}
                                </p>
                                {isBest && (
                                  <span className="text-[10px] font-display uppercase tracking-wider text-emerald-400 border border-emerald-500/40 rounded-full px-2 py-0.5">
                                    ✓ Best Answer
                                  </span>
                                )}
                              </div>
                              {r.body && (
                                <p className="mt-2 text-bone/80 leading-relaxed whitespace-pre-wrap">
                                  {highlightMentions(r.body, members)}
                                </p>
                              )}
                              {r.mediaUrl && <MediaView url={r.mediaUrl} type={r.mediaType} />}
                              <div className="mt-3 flex items-center gap-4 flex-wrap">
                                <ReactionBar reactions={r.reactions} meId={me?.id} onReact={(e) => react("reply", r.id, e)} />
                                {canMarkBest && (
                                  <button
                                    onClick={() => markBestAnswer(isBest ? null : r.id)}
                                    className={
                                      "font-display uppercase tracking-wider text-[11px] transition-colors ml-auto " +
                                      (isBest
                                        ? "text-emerald-400 hover:text-bone/60"
                                        : "text-bone/50 hover:text-emerald-400")
                                    }
                                  >
                                    {isBest ? "Unmark best" : "★ Mark best answer"}
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>

                    {/* Reply — inline on desktop */}
                    <form onSubmit={postReply} className="hidden md:grid mt-6 sm:mt-8 border border-bone/15 bg-ink/30 p-4 sm:p-6 gap-3">
                      {replyFields}
                    </form>

                    {/* Mobile: floating reply button opens a slide-up sheet */}
                    <button
                      onClick={() => setReplyOpen(true)}
                      aria-label="Write a reply"
                      className="md:hidden fixed right-4 bottom-20 z-[60] flex items-center gap-2 rounded-full bg-electric text-ink pl-4 pr-5 h-14 shadow-xl shadow-electric/40 active:scale-95 transition-transform"
                    >
                      <span className="text-2xl leading-none -mt-0.5">↩</span>
                      <span className="font-display uppercase tracking-wider text-xs">Reply</span>
                    </button>
                    {replyOpen && (
                      <div className="md:hidden fixed inset-0 z-[80]">
                        <div className="absolute inset-0 bg-black/60" onClick={() => setReplyOpen(false)} />
                        <div className="absolute inset-x-0 bottom-0 max-h-[90vh] overflow-y-auto bg-ink border-t-2 border-electric rounded-t-2xl p-4 pb-8 animate-[slideUp_.22s_ease-out]">
                          <div className="flex items-center justify-between mb-3">
                            <span className="font-display uppercase tracking-[0.2em] text-electric text-sm">Write a Reply</span>
                            <button onClick={() => setReplyOpen(false)} className="text-bone/50 hover:text-electric text-2xl leading-none">✕</button>
                          </div>
                          <form onSubmit={postReply} className="grid gap-3">
                            {replyFields}
                          </form>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </main>
      <Footer />
      <SiteTabBar />
    </>
  );
}
