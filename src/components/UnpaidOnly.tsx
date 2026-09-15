"use client";

import { useEffect, useState } from "react";

// Renders children only for logged-in users who have NOT yet purchased.
// Paid members get a clean, app-focused home (no marketing wall).
export default function UnpaidOnly({ children }: { children: React.ReactNode }) {
  const [show, setShow] = useState<boolean | null>(null);
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setShow(!d?.user?.portalAccess))
      .catch(() => setShow(true));
  }, []);
  if (show === null || show === false) return null;
  return <>{children}</>;
}
