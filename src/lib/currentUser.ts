"use client";

export type CurrentUser = {
  username?: string;
  role?: string;
  portalAccess?: boolean;
  isTrainer?: boolean;
  accessType?: string;
  subscriptionStatus?: string;
} | null;

type CurrentUserResponse = {
  user?: CurrentUser;
} | null;

const CACHE_TTL_MS = 30_000;

let cachedUser: CurrentUser | undefined;
let cachedAt = 0;
let inflight: Promise<CurrentUser> | null = null;

export function clearCurrentUserCache() {
  cachedUser = undefined;
  cachedAt = 0;
  inflight = null;
}

export async function fetchCurrentUser(options: { force?: boolean } = {}) {
  const now = Date.now();
  if (!options.force && cachedUser !== undefined && now - cachedAt < CACHE_TTL_MS) {
    return cachedUser;
  }
  if (!options.force && inflight) {
    return inflight;
  }

  inflight = fetch("/api/auth/me", { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : null))
    .then((d: CurrentUserResponse) => {
      const user = d?.user ?? null;
      cachedUser = user;
      cachedAt = Date.now();
      return user;
    })
    .catch(() => {
      const user = cachedUser ?? null;
      cachedAt = Date.now();
      return user;
    })
    .finally(() => {
      inflight = null;
    });

  return inflight;
}
