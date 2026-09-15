"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  Home,
  FileText,
  Users,
  Calculator,
  Tag,
  LogIn,
  LayoutDashboard,
  Trophy,
  UserRound,
} from "lucide-react";

type Tab = {
  href: string;
  label: string;
  Icon: typeof Home;
  match: (p: string) => boolean;
};

// Signed-out visitors: focus on discovering the product + signing in.
const GUEST_TABS: Tab[] = [
  { href: "/", label: "Home", Icon: Home, match: (p) => p === "/" },
  { href: "/programs", label: "Programs", Icon: FileText, match: (p) => p.startsWith("/programs") },
  { href: "/free-tools", label: "Tools", Icon: Calculator, match: (p) => p.startsWith("/free-tools") },
  { href: "/meet-the-team", label: "Team", Icon: Users, match: (p) => p.startsWith("/meet-the-team") },
  { href: "/login", label: "Sign In", Icon: LogIn, match: (p) => p.startsWith("/login") },
];

// Signed-in members: fast access to the things they actually use.
const MEMBER_TABS: Tab[] = [
  { href: "/clients", label: "Portal", Icon: LayoutDashboard, match: (p) => p.startsWith("/clients") },
  { href: "/quests", label: "Quests", Icon: Trophy, match: (p) => p.startsWith("/quests") },
  { href: "/clients/my-programs", label: "Programs", Icon: FileText, match: (p) => p.startsWith("/clients/my-programs") || p.startsWith("/programs") },
  { href: "/free-tools", label: "Tools", Icon: Calculator, match: (p) => p.startsWith("/free-tools") },
  { href: "/account", label: "Account", Icon: UserRound, match: (p) => p.startsWith("/account") },
];

// A mobile-only bottom tab bar. It adapts to whether the visitor is signed in
// so members get member destinations (Portal, Forum, Account) and visitors get
// discovery + Sign In — instead of one confusing shared set.
export default function SiteTabBar() {
  const pathname = usePathname() || "";
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    document.body.classList.add("has-site-tabbar");
    return () => document.body.classList.remove("has-site-tabbar");
  }, []);

  useEffect(() => {
    let alive = true;
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => alive && setSignedIn(!!d?.user))
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
