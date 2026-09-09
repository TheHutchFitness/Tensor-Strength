"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { UserRound, FileText, Users, Calculator, Tag } from "lucide-react";

const TABS = [
  { href: "/clients", label: "Clients", Icon: UserRound, match: (p: string) => p === "/clients" },
  { href: "/programs", label: "Programs", Icon: FileText, match: (p: string) => p.startsWith("/programs") },
  { href: "/meet-the-team", label: "Team", Icon: Users, match: (p: string) => p.startsWith("/meet-the-team") },
  { href: "/free-tools", label: "Tools", Icon: Calculator, match: (p: string) => p.startsWith("/free-tools") },
  { href: "/#pricing", label: "Pricing", Icon: Tag, match: () => false },
];

// A mobile-only bottom tab bar for the main marketing site (mirrors the
// client portal's tab bar). Links to the key public destinations.
export default function SiteTabBar() {
  const pathname = usePathname() || "";

  useEffect(() => {
    document.body.classList.add("has-site-tabbar");
    return () => document.body.classList.remove("has-site-tabbar");
  }, []);

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-ink/95 backdrop-blur border-t-2 border-electric"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Site navigation"
    >
      <div className="mx-auto max-w-lg grid grid-cols-5">
        {TABS.map(({ href, label, Icon, match }) => {
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
