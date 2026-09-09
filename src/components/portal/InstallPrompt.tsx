"use client";

import { useEffect, useState } from "react";

const DISMISS_KEY = "ts-install-dismissed";

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<any>(null);
  const [show, setShow] = useState(false);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Register the service worker (enables installability / Add to Home Screen).
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    // Already installed / running as an app? Never show.
    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    if (standalone) return;

    let dismissed = false;
    try {
      dismissed = localStorage.getItem(DISMISS_KEY) === "1";
    } catch {}
    if (dismissed) return;

    const ua = window.navigator.userAgent || "";
    const isIOS = /iphone|ipad|ipod/i.test(ua);
    const isMobile = isIOS || /android/i.test(ua) || window.innerWidth < 768;
    if (!isMobile) return;

    // Android / Chrome: capture the install event and show our own banner.
    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e);
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", onBip);

    // iOS Safari has no beforeinstallprompt — show a short instruction banner.
    const isSafari = isIOS && /safari/i.test(ua) && !/crios|fxios/i.test(ua);
    let iosTimer: ReturnType<typeof setTimeout> | null = null;
    if (isSafari) {
      iosTimer = setTimeout(() => {
        setIosHint(true);
        setShow(true);
      }, 2500);
    }

    const onInstalled = () => close();
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBip);
      window.removeEventListener("appinstalled", onInstalled);
      if (iosTimer) clearTimeout(iosTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function close() {
    setShow(false);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {}
  }

  async function install() {
    if (!deferred) return;
    deferred.prompt();
    try {
      await deferred.userChoice;
    } catch {}
    setDeferred(null);
    close();
  }

  if (!show) return null;

  return (
    <div
      className="md:hidden fixed inset-x-0 z-[65] px-3 pointer-events-none"
      style={{ bottom: "calc(4.25rem + env(safe-area-inset-bottom))" }}
    >
      <div className="pointer-events-auto mx-auto max-w-md flex items-center gap-3 rounded-xl border border-electric/60 bg-ink/95 backdrop-blur px-3 py-2.5 shadow-2xl animate-[fadeIn_.3s_ease-out]">
        <img src="/icons/apple-touch-icon.png" alt="" className="h-9 w-9 rounded-md shrink-0" />
        <div className="min-w-0 flex-1">
          {iosHint ? (
            <p className="text-xs text-bone/85 leading-snug">
              Install the app: tap <span className="text-electric">Share</span> then{" "}
              <span className="text-electric">Add to Home Screen</span>.
            </p>
          ) : (
            <p className="text-xs text-bone/85 leading-snug">
              <span className="font-display uppercase tracking-wider text-electric">Add to Home Screen</span>
              <span className="block text-bone/60">Launch the portal like an app.</span>
            </p>
          )}
        </div>
        {!iosHint && (
          <button
            onClick={install}
            className="shrink-0 bg-electric text-ink px-3 py-1.5 rounded-md font-display uppercase tracking-wider text-[11px] hover:bg-bone transition-colors"
          >
            Install
          </button>
        )}
        <button
          onClick={close}
          aria-label="Dismiss"
          className="shrink-0 text-bone/50 hover:text-electric text-lg leading-none px-1"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
