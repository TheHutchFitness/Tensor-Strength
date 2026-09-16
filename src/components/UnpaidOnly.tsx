"use client";

import { useEffect, useState } from "react";
import { fetchCurrentUser } from "../lib/currentUser";

// Renders children only for logged-in users who have NOT yet purchased.
// Paid members get a clean, app-focused home (no marketing wall).
export default function UnpaidOnly({ children }: { children: React.ReactNode }) {
  const [show, setShow] = useState<boolean | null>(null);
  useEffect(() => {
    fetchCurrentUser()
      .then((user) => setShow(!user?.portalAccess))
      .catch(() => setShow(true));
  }, []);
  if (show === null || show === false) return null;
  return <>{children}</>;
}
