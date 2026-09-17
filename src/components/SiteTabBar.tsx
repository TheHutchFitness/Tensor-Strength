"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  Home,
  FileText,
  Users,
  LogIn,
  LayoutDashboard,
  MessageSquare,
  UserRound,
} from "lucide-react";
import { fetchCurrentUser } from "../lib/currentUser";

type Tab = {
  href: string;
  label: string;
  Icon: typeof Home;
  match: (p: string) => boolean;
};

// Signed-out visitors: focus on discovering the product + signing in.
const GUEST_TABS: Tab[] = [
  { href: "/", label: "Home", Icon: Home, match: (p) => p === "/" },
  { href: "/programs", label: "Training", Icon: FileText, match: (p) => p.startsWith("/programs") || p.startsWith("/free-tools") },
  { href: "/apply", label: "Coaching", Icon: Users, match: (p) => p.startsWith("/apply") || p.startsWith("/meet-the-team") },
  { href: "/forum", label: "Community", Icon: MessageSquare, match: (p) => p.startsWith("/forum") },
  { href: "/login", label: "Sign In", Icon: LogIn, match: (p) => p.startsWith("/login") },
];

// Signed-in members: fast access to the things they actually use.
const MEMBER_TABS: Tab[] = [
  { href: "/", label: "Home", Icon: Home, match: (p) => p === "/" },
  { href: "/clients", label: "Portal", Icon: LayoutDashboard, match: (p) => p.startsWith("/clients") || p.startsWith("/quests") },
  { href: "/programs", label: "Training", Icon: FileText, match: (p) => p.startsWith("/programs") || p.startsWith("/free-tools") },
  { href: "/forum", label: "Community", Icon: MessageSquare, match: (p) => p.startsWith("/forum") },
  { href: "/account", label: "Account", Icon: UserRound, match: (p) => p.startsWith("/account") },
];

// A mobile-only bottom tab bar. It adapts to whether the visitor is signed in
// so members get their portal and community while visitors get the same core
// public information architecture they see in the desktop header.
export default function SiteTabBar() {
  const pathname = usePathname() || "";
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    document.body.classList.add("has-site-tabbar");
    return () => document.body.classList.remove("has-site-tabbar");
  }, []);

  useEffect(() => {
    let alive = true;
    fetchCurrentUser()
      .then((user) => alive && setSignedIn(!!user))
      .catch(() => alive && setSignedIn(false));
    return () => {
      alive = false;
    };
  }, []);

  // Until we know, default to the guest set (no flash of member-only links).
  const tabs = signedIn ? MEMBER_TABS : GUEST_TABS;

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-ink/95 backdrop-blur border-t border-line"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Site navigation"
    >
      <div className="mx-auto max-w-lg grid grid-cols-5">
        {tabs.map(({ href, label, Icon, match }) => {
          const active = match(pathname);
          return (
            <a
              key={href}
              href={href}
              className={
                "relative flex flex-col items-center justify-center gap-0.5 py-2 min-h-[56px] transition-colors " +
                (active ? "text-electric" : "text-bone/55 hover:text-bone")
              }
              aria-current={active ? "page" : undefined}
            >
              <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 1.8} />
              <span className="font-display uppercase tracking-wider text-[9px] leading-none">
                {label}
              </span>
            </a>
          );
        })}
      </div>
    </nav>
  );
}
