"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * useCloudState — a drop-in replacement for a piece of client state that must
 * follow the logged-in member across devices.
 *
 * Behaviour:
 *  - Seeds instantly from localStorage (fast paint, offline-friendly).
 *  - On mount, pulls the authoritative value from the per-user cloud store
 *    (GET /api/client/store?key=...). If found, it overrides the local cache.
 *  - Every update writes localStorage immediately AND debounces a PUT to the
 *    cloud store so the account stays the source of truth.
 *
 * The `ready` flag turns true once the cloud fetch has resolved — use it to
 * avoid pushing default/empty values back to the server before hydration.
 */
export function useCloudState<T>(
  key: string,
  initial: T
): [T, (v: T | ((prev: T) => T)) => void, boolean] {
  const [value, setValue] = useState<T>(initial);
  const [ready, setReady] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const readyRef = useRef(false);

  useEffect(() => {
    let alive = true;
    try {
      const s = localStorage.getItem(key);
      if (s && alive) setValue(JSON.parse(s));
    } catch {}
    (async () => {
      try {
        const res = await fetch(`/api/client/store?key=${encodeURIComponent(key)}`);
        if (res.ok && alive) {
          const d = await res.json();
          if (d && d.found && d.value !== null && d.value !== undefined) {
            setValue(d.value as T);
            try {
              localStorage.setItem(key, JSON.stringify(d.value));
            } catch {}
          }
        }
      } catch {}
      if (alive) {
        readyRef.current = true;
        setReady(true);
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const update = useCallback(
    (v: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const next = typeof v === "function" ? (v as (p: T) => T)(prev) : v;
        try {
          localStorage.setItem(key, JSON.stringify(next));
        } catch {}
        // Only sync to the cloud after we've hydrated, so we never clobber the
        // stored value with the initial default on first paint.
        if (readyRef.current) {
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => {
            fetch("/api/client/store", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ key, value: next }),
            }).catch(() => {});
          }, 600);
        }
        return next;
      });
    },
    [key]
  );

  return [value, update, ready];
}

/**
 * Fire-and-forget cloud write for imperative code paths that don't hold the
 * value in React state (mirrors a localStorage.setItem call).
 */
export function cloudSet(key: string, value: any) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
  fetch("/api/client/store", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key, value }),
  }).catch(() => {});
}
