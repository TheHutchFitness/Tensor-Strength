"use client";

import { useEffect } from "react";

// Minimal typing for the Tawk.to globals the widget injects.
declare global {
  interface Window {
    Tawk_API?: { loaded?: boolean; shutdown?: () => void };
    Tawk_LoadStart?: Date;
  }
}

// ============================================================================
// TAWK.TO LIVE CHAT WIDGET
// ----------------------------------------------------------------------------
// Loads the Tawk.to embed script once this component mounts. Mount it only
// inside the unlocked Client Portal view so the widget is clients-only.
//
// To activate:
//   1. Create a free account at https://www.tawk.to
//   2. Add a property ("Tensor Strength") and copy the embed snippet.
//   3. From the snippet URL https://embed.tawk.to/<PROPERTY_ID>/<WIDGET_ID>,
//      paste the two values below.
//   4. Save and re-publish. The chat widget appears in the bottom-right corner
//      of the Client Portal for unlocked clients.
//
// You reply to chats from the Tawk.to dashboard or its mobile app (push
// notifications included). Free tier covers this use case.
// ============================================================================

// Tawk.to embed credentials (from the Tawk.to embed snippet).
const TAWK_PROPERTY_ID = "6a9510b11205e834414b3287";
const TAWK_WIDGET_ID = "1k1b4idac";

// True once a real property ID has been entered above. Used by the Client
// Portal to show the right "chat is online / being set up" status.
export const TAWK_CONFIGURED = !TAWK_PROPERTY_ID.startsWith("REPLACE_");

export default function TawkTo() {
  useEffect(() => {
    if (TAWK_PROPERTY_ID.startsWith("REPLACE_")) return; // not configured yet

    // Avoid double-loading if React strict mode mounts twice
    if (document.getElementById("tawkto-embed")) return;

    window.Tawk_API = window.Tawk_API || {};
    window.Tawk_LoadStart = new Date();

    const s1 = document.createElement("script");
    s1.id = "tawkto-embed";
    s1.async = true;
    s1.src = `https://embed.tawk.to/${TAWK_PROPERTY_ID}/${TAWK_WIDGET_ID}`;
    s1.charset = "UTF-8";
    s1.setAttribute("crossorigin", "*");
    document.body.appendChild(s1);

    return () => {
      // Clean up the widget if the component unmounts
      const el = document.getElementById("tawkto-embed");
      if (el) el.remove();
      if (window.Tawk_API?.loaded) {
        try {
          window.Tawk_API.shutdown?.();
        } catch {
          /* no-op */
        }
      }
    };
  }, []);

  // Nothing renders visibly — the widget injects its own floating button
  return null;
}
