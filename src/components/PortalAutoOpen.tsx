"use client";

import { useEffect } from "react";
import { fetchCurrentUser } from "../lib/currentUser";

// On website startup, a member who already has paid portal access is taken
// straight to the Client Portal. We only do this ONCE per browser session
// (guarded by sessionStorage) so if they intentionally navigate back to the
// home page later, they're not trapped in a redirect loop.
export default function PortalAutoOpen() {
  useEffect(() => {
    try {
      if (sessionStorage.getItem("ts_portal_autoopen") === "1") return;
    } catch {
      // sessionStorage unavailable — fall through and just check access.
    }
    fetchCurrentUser()
      .then((u) => {
        if (u && u.portalAccess) {
          try {
            sessionStorage.setItem("ts_portal_autoopen", "1");
          } catch {}
          window.location.replace("/clients");
        }
      })
      .catch(() => {});
  }, []);

  return null;
}
