// Client-side mirror of the gamification config (avatars, titles, XP curve).
// The backend is the source of truth for awarding XP; this is for rendering.

export type AvatarDef = { id: string; name: string; emoji: string; level: number; grad: [string, string] };
export type TitleDef = { id: string; name: string; level: number };

export const AVATARS: AvatarDef[] = [
  { id: "seed", name: "Fresh Start", emoji: "🌱", level: 1, grad: ["#1f6f43", "#0a2a1a"] },
  { id: "wolf", name: "Lone Wolf", emoji: "🐺", level: 2, grad: ["#5a6b82", "#141a24"] },
  { id: "bull", name: "Bull", emoji: "🐂", level: 3, grad: ["#8a4b2a", "#241108"] },
  { id: "fire", name: "On Fire", emoji: "🔥", level: 4, grad: ["#ff6a00", "#3a1400"] },
  { id: "bolt", name: "Live Wire", emoji: "⚡", level: 5, grad: ["#146cff", "#04173a"] },
  { id: "lion", name: "Lionheart", emoji: "🦁", level: 6, grad: ["#d9a441", "#3a2708"] },
  { id: "dragon", name: "Dragon", emoji: "🐉", level: 8, grad: ["#2fae6a", "#06251a"] },
  { id: "crown", name: "Iron Crown", emoji: "👑", level: 10, grad: ["#c9a227", "#2a2205"] },
  { id: "goat", name: "The GOAT", emoji: "🐐", level: 12, grad: ["#146cff", "#000014"] },
];

export const TITLES: TitleDef[] = [
  { id: "newcomer", name: "Newcomer", level: 1 },
  { id: "grinder", name: "The Grinder", level: 2 },
  { id: "consistent", name: "Consistency Machine", level: 3 },
  { id: "ironwilled", name: "Iron-Willed", level: 4 },
  { id: "relentless", name: "Relentless", level: 5 },
  { id: "beast", name: "Certified Beast", level: 6 },
  { id: "elite", name: "Elite", level: 8 },
  { id: "legend", name: "Tensor Legend", level: 10 },
];

export const GOAL_OPTIONS = [
  "Build Muscle",
  "Get Stronger",
  "Lose Fat",
  "Athletic Performance",
  "Stay Consistent",
  "General Health",
];

// Level-up perks, advertised to members. Codes are issued MANUALLY by the coach
// once a member reaches the level (no automated coupon generation).
export type LevelReward = { level: number; reward: string; emoji: string };
export const LEVEL_REWARDS: LevelReward[] = [
  { level: 3, reward: "25% off any plan", emoji: "🎟️" },
  { level: 5, reward: "50% off any plan", emoji: "🏷️" },
  { level: 10, reward: "1 month FREE", emoji: "🎁" },
];

export function avatarById(id?: string): AvatarDef {
  return AVATARS.find((a) => a.id === id) || AVATARS[0];
}
export function titleById(id?: string): TitleDef {
  return TITLES.find((t) => t.id === id) || TITLES[0];
}
export function cumulativeXp(level: number) {
  return (1000 * (level - 1) * level) / 2;
}
export function levelFromXp(xp: number) {
  let L = 1;
  const x = xp || 0;
  while (cumulativeXp(L + 1) <= x) L++;
  return L;
}
